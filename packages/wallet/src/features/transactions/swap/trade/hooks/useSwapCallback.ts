import { SwapEventName } from '@uniswap/analytics-events'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { SignerMnemonicAccountMeta } from 'uniswap/src/features/accounts/types'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { selectSwapStartTimestamp } from 'uniswap/src/features/timing/selectors'
import { updateSwapStartTimestamp } from 'uniswap/src/features/timing/slice'
import { setHasSubmittedHoldToSwap } from 'wallet/src/features/behaviorHistory/slice'
import { useLocalizationContext } from 'wallet/src/features/language/LocalizationContext'
import { ValidatedSwapTxContext } from 'wallet/src/features/transactions/contexts/SwapTxContext'
import { getBaseTradeAnalyticsProperties } from 'wallet/src/features/transactions/swap/analytics'
import { swapActions } from 'wallet/src/features/transactions/swap/swapSaga'
import { getClassicQuoteFromResponse } from 'wallet/src/features/transactions/swap/trade/api/utils'
import { isClassic } from 'wallet/src/features/transactions/swap/trade/utils'
import { toStringish } from 'wallet/src/utils/number'

interface SwapCallbackArgs {
  account: SignerMnemonicAccountMeta
  swapTxContext: ValidatedSwapTxContext
  currencyInAmountUSD: Maybe<CurrencyAmount<Currency>>
  currencyOutAmountUSD: Maybe<CurrencyAmount<Currency>>
  isAutoSlippage: boolean
  onSubmit: () => void
  onFailure: () => void
  txId?: string
  isHoldToSwap?: boolean
  isFiatInputMode?: boolean
}

/** Callback to submit trades and track progress */
export function useSwapCallback(): (args: SwapCallbackArgs) => void {
  const appDispatch = useDispatch()
  const formatter = useLocalizationContext()
  const swapStartTimestamp = useSelector(selectSwapStartTimestamp)

  return useCallback(
    (args: SwapCallbackArgs) => {
      const {
        account,
        swapTxContext,
        txId,
        onSubmit,
        onFailure,
        currencyInAmountUSD,
        currencyOutAmountUSD,
        isAutoSlippage,
        isHoldToSwap,
        isFiatInputMode,
      } = args
      const { trade, gasFee } = swapTxContext

      const analytics = getBaseTradeAnalyticsProperties({ formatter, trade, currencyInAmountUSD, currencyOutAmountUSD })
      appDispatch(swapActions.trigger({ swapTxContext, txId, account, analytics, onSubmit, onFailure }))

      const blockNumber = getClassicQuoteFromResponse(trade?.quote)?.blockNumber?.toString()

      sendAnalyticsEvent(SwapEventName.SWAP_SUBMITTED_BUTTON_CLICKED, {
        ...analytics,
        estimated_network_fee_wei: gasFee.value,
        gas_limit: isClassic(swapTxContext) ? toStringish(swapTxContext.txRequest.gasLimit) : undefined,
        transaction_deadline_seconds: trade.deadline,
        swap_quote_block_number: blockNumber,
        is_auto_slippage: isAutoSlippage,
        swap_flow_duration_milliseconds: swapStartTimestamp ? Date.now() - swapStartTimestamp : undefined,
        is_hold_to_swap: isHoldToSwap,
        is_fiat_input_mode: isFiatInputMode,
      })

      // Reset swap start timestamp now that the swap has been submitted
      appDispatch(updateSwapStartTimestamp({ timestamp: undefined }))

      // Mark hold to swap persisted user behavior
      if (isHoldToSwap) {
        appDispatch(setHasSubmittedHoldToSwap(true))
      }
    },
    [appDispatch, formatter, swapStartTimestamp],
  )
}
