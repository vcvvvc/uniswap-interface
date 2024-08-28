import { ApolloError, NetworkStatus } from '@apollo/client'
import { TradeType } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { uniswapUrls } from 'uniswap/src/constants/urls'
import { useRestQuery } from 'uniswap/src/data/rest'
import { QuoteRequest, TradeType as TradingApiTradeType } from 'uniswap/src/data/tradingApi/__generated__/index'
import { isMainnetChainId } from 'uniswap/src/features/chains/utils'
import { DynamicConfigs, SwapConfigKey } from 'uniswap/src/features/gating/configs'
import { FeatureFlags } from 'uniswap/src/features/gating/flags'
import { useDynamicConfigValue, useFeatureFlag } from 'uniswap/src/features/gating/hooks'
import { CurrencyField } from 'uniswap/src/features/transactions/transactionState/types'
import { WalletChainId } from 'uniswap/src/types/chains'
import { areCurrencyIdsEqual, currencyId } from 'uniswap/src/utils/currencyId'
import { logger } from 'utilities/src/logger/logger'
import { isMobile } from 'utilities/src/platform'
import { ONE_SECOND_MS, inXMinutesUnix } from 'utilities/src/time/time'
import { useDebounceWithStatus } from 'utilities/src/time/timing'
import { useLocalizationContext } from 'wallet/src/features/language/LocalizationContext'
import { TradingApiApolloClient } from 'wallet/src/features/transactions/swap/trade/api/client'
import {
  getRoutingPreferenceForSwapRequest,
  getTokenAddressForApi,
  toTradingApiSupportedChainId,
  transformTradingApiResponseToTrade,
  validateTrade,
} from 'wallet/src/features/transactions/swap/trade/api/utils'
import {
  DiscriminatedQuoteResponse,
  TradeWithStatus,
  UseTradeArgs,
} from 'wallet/src/features/transactions/swap/trade/types'

// error strings hardcoded in @uniswap/unified-routing-api
// https://github.com/Uniswap/unified-routing-api/blob/020ea371a00d4cc25ce9f9906479b00a43c65f2c/lib/util/errors.ts#L4
export const SWAP_QUOTE_ERROR = 'QUOTE_ERROR'

// client side error code for when the api returns an empty response
export const NO_QUOTE_DATA = 'NO_QUOTE_DATA'

export const DEFAULT_SWAP_VALIDITY_TIME_MINS = 30

export const SWAP_FORM_DEBOUNCE_TIME_MS = 250

export const API_RATE_LIMIT_ERROR = 'TOO_MANY_REQUESTS'

// The TradingAPI requires an address for the swapper field; we supply a placeholder address if no account is connected.
// Note: This address was randomly generated.
const UNCONNECTED_ADDRESS = '0xAAAA44272dc658575Ba38f43C438447dDED45358'

export function useTrade(args: UseTradeArgs): TradeWithStatus {
  const {
    account,
    amountSpecified,
    otherCurrency,
    tradeType,
    pollInterval,
    customSlippageTolerance,
    isUSDQuote,
    skip,
    tradeProtocolPreference,
  } = args
  const activeAccountAddress = account?.address

  const formatter = useLocalizationContext()

  const uniswapXEnabled = useFeatureFlag(FeatureFlags.UniswapX)

  /***** Format request arguments ******/

  const [debouncedAmountSpecified, isDebouncing] = useDebounceWithStatus(amountSpecified, SWAP_FORM_DEBOUNCE_TIME_MS)
  const shouldDebounce = amountSpecified && debouncedAmountSpecified?.currency.chainId === otherCurrency?.chainId
  const amount = shouldDebounce ? debouncedAmountSpecified : amountSpecified

  const currencyIn = tradeType === TradeType.EXACT_INPUT ? amount?.currency : otherCurrency
  const currencyOut = tradeType === TradeType.EXACT_OUTPUT ? amount?.currency : otherCurrency
  const currencyInEqualsCurrencyOut =
    currencyIn && currencyOut && areCurrencyIdsEqual(currencyId(currencyIn), currencyId(currencyOut))

  const tokenInChainId = toTradingApiSupportedChainId(currencyIn?.chainId)
  const tokenOutChainId = toTradingApiSupportedChainId(currencyOut?.chainId)
  const tokenInAddress = getTokenAddressForApi(currencyIn)
  const tokenOutAddress = getTokenAddressForApi(currencyOut)

  const routingPreference = getRoutingPreferenceForSwapRequest(tradeProtocolPreference, uniswapXEnabled, isUSDQuote)

  const requestTradeType =
    tradeType === TradeType.EXACT_INPUT ? TradingApiTradeType.EXACT_INPUT : TradingApiTradeType.EXACT_OUTPUT

  const skipQuery =
    skip ||
    !tokenInAddress ||
    !tokenOutAddress ||
    !tokenInChainId ||
    !tokenOutChainId ||
    !amount ||
    currencyInEqualsCurrencyOut

  const quoteRequestArgs: QuoteRequest | undefined = useMemo(() => {
    if (skipQuery) {
      return undefined
    }

    const quoteArgs: QuoteRequest = {
      type: requestTradeType,
      amount: amount.quotient.toString(),
      swapper: activeAccountAddress ?? UNCONNECTED_ADDRESS,
      tokenInChainId,
      tokenOutChainId,
      tokenIn: tokenInAddress,
      tokenOut: tokenOutAddress,
      slippageTolerance: customSlippageTolerance,
      routingPreference,
    }

    return quoteArgs
  }, [
    activeAccountAddress,
    amount,
    customSlippageTolerance,
    requestTradeType,
    routingPreference,
    skipQuery,
    tokenInAddress,
    tokenInChainId,
    tokenOutAddress,
    tokenOutChainId,
  ])

  /***** Fetch quote from trading API  ******/

  const pollingIntervalForChain = usePollingIntervalByChain(currencyIn?.chainId)
  const internalPollInterval = pollInterval ?? pollingIntervalForChain

  const response = useRestQuery<DiscriminatedQuoteResponse, QuoteRequest | Record<string, never>>(
    uniswapUrls.tradingApiPaths.quote,
    quoteRequestArgs ?? {},
    ['quote', 'permitData', 'requestId', 'routing'],
    {
      pollInterval: internalPollInterval,
      // We set the `ttlMs` to 15 seconds longer than the poll interval so that there's more than enough time for a refetch to complete before we clear the stale data.
      // If the user loses internet connection (or leaves the app and comes back) for longer than this,
      // then we clear stale data and show a big loading spinner in the swap review screen.
      ttlMs: internalPollInterval + ONE_SECOND_MS * 15,
      clearIfStale: true,
      skip: !quoteRequestArgs,
      notifyOnNetworkStatusChange: true,
    },
    'POST',
    TradingApiApolloClient,
  )

  const { error, data, loading, networkStatus } = response

  /***** Format `trade` type, add errors if needed.  ******/

  return useMemo(() => {
    // Error logging
    // We use DataDog to catch network errors on Mobile
    if (error && (!isMobile || !error.networkError) && !isUSDQuote) {
      logger.error(error, { tags: { file: 'useTrade', function: 'quote' } })
    }
    if (data && !data.quote) {
      logger.error(new Error('Unexpected empty Trading API response'), {
        tags: { file: 'useTrade', function: 'quote' },
        extra: {
          quoteRequestArgs,
        },
      })
    }

    if (!data?.quote || !currencyIn || !currencyOut) {
      // MOB(1193): Better handle Apollo 404s
      // https://github.com/apollographql/apollo-link-rest/pull/142/files#diff-018e2012bf1dae58fa1e87509b038abf51ace54994e63239343d717fb9a2d037R995
      // apollo-link-rest swallows 404 response errors, and instead just returns null data
      // Until we can parse response errors correctly, just manually create error.
      if (data === null && !error) {
        return {
          ...response,
          trade: null,
          error: new ApolloError({
            errorMessage: NO_QUOTE_DATA,
          }),
        }
      }

      return { ...response, trade: null }
    }

    const formattedTrade = transformTradingApiResponseToTrade({
      currencyIn,
      currencyOut,
      tradeType,
      deadline: inXMinutesUnix(DEFAULT_SWAP_VALIDITY_TIME_MINS), // TODO(MOB-3050): set deadline as `quoteRequestArgs.deadline`
      slippageTolerance: customSlippageTolerance,
      data,
    })

    const exactCurrencyField = tradeType === TradeType.EXACT_INPUT ? CurrencyField.INPUT : CurrencyField.OUTPUT

    const trade = validateTrade({
      trade: formattedTrade,
      currencyIn,
      currencyOut,
      exactAmount: amount,
      exactCurrencyField,
      formatter,
    })

    // If `transformTradingApiResponseToTrade` returns a `null` trade, it means we have a non-null quote, but no routes.
    // Manually match the api quote error.
    if (trade === null) {
      return {
        ...response,
        trade: null,
        error: new ApolloError({
          errorMessage: SWAP_QUOTE_ERROR,
        }),
      }
    }

    return {
      loading: (amountSpecified && isDebouncing) || loading,
      error,
      trade,
      isFetching: networkStatus === NetworkStatus.poll,
    }
  }, [
    amount,
    amountSpecified,
    currencyIn,
    currencyOut,
    customSlippageTolerance,
    data,
    error,
    formatter,
    isDebouncing,
    isUSDQuote,
    loading,
    networkStatus,
    quoteRequestArgs,
    response,
    tradeType,
  ])
}

const FALLBACK_L1_BLOCK_TIME_MS = 12000
const FALLBACK_L2_BLOCK_TIME_MS = 3000

function usePollingIntervalByChain(chainId?: WalletChainId): number {
  const averageL1BlockTimeMs = useDynamicConfigValue(
    DynamicConfigs.Swap,
    SwapConfigKey.AverageL1BlockTimeMs,
    FALLBACK_L1_BLOCK_TIME_MS,
  )

  const averageL2BlockTimeMs = useDynamicConfigValue(
    DynamicConfigs.Swap,
    SwapConfigKey.AverageL2BlockTimeMs,
    FALLBACK_L2_BLOCK_TIME_MS,
  )

  return isMainnetChainId(chainId) ? averageL1BlockTimeMs : averageL2BlockTimeMs
}
