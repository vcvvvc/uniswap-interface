import { MaxUint256 } from '@ethersproject/constants'
import { call, select } from '@redux-saga/core/effects'
import { permit2Address } from '@uniswap/permit2-sdk'
import { Protocol } from '@uniswap/router-sdk'
import { TradeType } from '@uniswap/sdk-core'
import { UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk'
import JSBI from 'jsbi'
import { expectSaga, testSaga } from 'redux-saga-test-plan'
import { EffectProviders, StaticProvider } from 'redux-saga-test-plan/providers'
import { DAI, USDC } from 'uniswap/src/constants/tokens'
import { OrderRequest, Routing } from 'uniswap/src/data/tradingApi/__generated__/index'
import { NativeCurrency } from 'uniswap/src/features/tokens/NativeCurrency'
import { UniverseChainId } from 'uniswap/src/types/chains'
import { currencyId } from 'uniswap/src/utils/currencyId'
import { SendTransactionParams, sendTransaction } from 'wallet/src/features/transactions/sendTransactionSaga'
import { getBaseTradeAnalyticsProperties } from 'wallet/src/features/transactions/swap/analytics'
import { SubmitUniswapXOrderParams, submitUniswapXOrder } from 'wallet/src/features/transactions/swap/submitOrderSaga'
import {
  SwapParams,
  approveAndSwap,
  getNonceForApproveAndSwap,
  shouldSubmitViaPrivateRpc,
} from 'wallet/src/features/transactions/swap/swapSaga'
import { ClassicTrade, UniswapXTrade } from 'wallet/src/features/transactions/swap/trade/types'
import {
  ExactInputSwapTransactionInfo,
  TransactionType,
  TransactionTypeInfo,
} from 'wallet/src/features/transactions/types'
import { getProvider } from 'wallet/src/features/wallet/context'
import { selectWalletSwapProtectionSetting } from 'wallet/src/features/wallet/selectors'
import { SwapProtectionSetting } from 'wallet/src/features/wallet/slice'
import { WETH, signerMnemonicAccount } from 'wallet/src/test/fixtures'
import { getTxProvidersMocks } from 'wallet/src/test/mocks'

const account = signerMnemonicAccount()

const CHAIN_ID = UniverseChainId.Mainnet
const universalRouterAddress = UNIVERSAL_ROUTER_ADDRESS(CHAIN_ID)

const { mockProvider } = getTxProvidersMocks()

const mockTransactionTypeInfo: ExactInputSwapTransactionInfo = {
  type: TransactionType.Swap,
  tradeType: TradeType.EXACT_INPUT,
  inputCurrencyId: currencyId(NativeCurrency.onChain(CHAIN_ID)),
  outputCurrencyId: '0xabc',
  inputCurrencyAmountRaw: '10000',
  expectedOutputCurrencyAmountRaw: '200000',
  minimumOutputCurrencyAmountRaw: '300000',
  protocol: Protocol.V3,
}

jest.mock('wallet/src/features/transactions/swap/utils', () => {
  return {
    tradeToTransactionInfo: (): TransactionTypeInfo => mockTransactionTypeInfo,
  }
})

// TODO(WEB-4499): Use Trade/Quote fixtures instead of casted objects
const mockTrade = {
  routing: Routing.CLASSIC,
  inputAmount: { currency: new NativeCurrency(CHAIN_ID) },
  outputAmount: { currency: USDC },
  quote: { amount: MaxUint256 },
  slippageTolerance: 0.5,
} as unknown as ClassicTrade

const mockUniswapXTrade = {
  routing: Routing.DUTCH_V2,
  inputAmount: { currency: new NativeCurrency(CHAIN_ID), quotient: JSBI.BigInt(1000) },
  outputAmount: { currency: USDC },
  quote: { amount: MaxUint256 },
  slippageTolerance: 0.5,
} as unknown as UniswapXTrade

const mockApproveTxRequest = {
  chainId: 1,
  to: DAI.address,
  data: '0x0',
}

const mockWrapTxRequest = {
  chainId: 1,
  to: WETH.address,
  data: '0x0',
}

const mockSwapTxRequest = {
  chainId: 1,
  to: universalRouterAddress,
  data: '0x0',
}

const classicSwapParams = {
  txId: '1',
  account,
  analytics: {} as ReturnType<typeof getBaseTradeAnalyticsProperties>,
  swapTxContext: {
    routing: Routing.CLASSIC,
    approveTxRequest: mockApproveTxRequest,
    txRequest: mockSwapTxRequest,
    trade: mockTrade,
    gasFee: { value: '5', loading: false, error: undefined },
    approvalError: false,
  },
  onSubmit: jest.fn(),
  onFailure: jest.fn(),
} satisfies SwapParams

const uniswapXSwapParams = {
  txId: '1',
  account,
  analytics: {} as ReturnType<typeof getBaseTradeAnalyticsProperties>,
  swapTxContext: {
    routing: Routing.DUTCH_V2,
    approveTxRequest: mockApproveTxRequest,
    trade: mockUniswapXTrade,
    orderParams: { quote: { orderId: '0xMockOrderHash' } } as unknown as OrderRequest,
    wrapTxRequest: undefined,
    gasFee: { value: '5', loading: false, error: undefined },
    gasFeeBreakdown: { classicGasUseEstimateUSD: '5', approvalCost: '5', wrapCost: '0' },
    approvalError: false,
  },
  onSubmit: jest.fn(),
  onFailure: jest.fn(),
} satisfies SwapParams

const nonce = 1

const expectedSendApprovalParams: SendTransactionParams = {
  chainId: mockApproveTxRequest.chainId,
  account,
  options: { request: mockApproveTxRequest, submitViaPrivateRpc: false },
  typeInfo: {
    type: TransactionType.Approve,
    tokenAddress: mockApproveTxRequest.to,
    spender: permit2Address(mockApproveTxRequest.chainId),
    swapTxId: '1',
  },
  analytics: {},
}

describe(approveAndSwap, () => {
  const sharedProviders: (EffectProviders | StaticProvider)[] = [
    [select(selectWalletSwapProtectionSetting), SwapProtectionSetting.Off],
    [call(getProvider, mockSwapTxRequest.chainId), mockProvider],
    [call(getNonceForApproveAndSwap, classicSwapParams.account.address, mockSwapTxRequest.chainId, false), nonce],
  ]

  it('sends a swap tx', async () => {
    const classicSwapParamsWithoutApprove = {
      ...classicSwapParams,
      swapTxContext: {
        ...classicSwapParams.swapTxContext,
        approveTxRequest: undefined,
      },
    } satisfies SwapParams

    const expectedSendSwapParams: SendTransactionParams = {
      chainId: classicSwapParamsWithoutApprove.swapTxContext.txRequest.chainId,
      account: classicSwapParamsWithoutApprove.account,
      options: { request: { ...mockSwapTxRequest, nonce }, submitViaPrivateRpc: false },
      typeInfo: mockTransactionTypeInfo,
      analytics: classicSwapParamsWithoutApprove.analytics,
      txId: classicSwapParamsWithoutApprove.txId,
    }

    // `expectSaga` tests the entire saga at once w/out manually specifying all effect return values.
    // It does not ensure proper ordering; this is tested by testSaga below.
    await expectSaga(approveAndSwap, classicSwapParamsWithoutApprove)
      .provide([
        ...sharedProviders,
        [
          call(sendTransaction, expectedSendSwapParams),
          { transactionResponse: { hash: '0xMockSwapTxHash' }, populatedRequest: {} },
        ],
      ])
      .call(sendTransaction, expectedSendSwapParams)
      .silentRun()

    // `testSaga` ensures that the saga yields specific types of effects in a particular order.
    // Requires manually providing return values for each effect in `.next()`.
    testSaga(approveAndSwap, classicSwapParamsWithoutApprove)
      .next()
      .call(classicSwapParams.onSubmit)
      .next()
      .call(shouldSubmitViaPrivateRpc, classicSwapParams.swapTxContext.txRequest.chainId)
      .next(false)
      .call(getNonceForApproveAndSwap, classicSwapParams.account.address, mockSwapTxRequest.chainId, false)
      .next(nonce)
      .call(sendTransaction, expectedSendSwapParams)
      .next({ transactionResponse: { hash: '0xMockSwapTxHash' }, populatedRequest: {} })
      .isDone()
  })

  it('sends a swap tx with incremented nonce if an approve tx is sent first', async () => {
    const expectedSendSwapParams: SendTransactionParams = {
      chainId: classicSwapParams.swapTxContext.txRequest.chainId,
      account: classicSwapParams.account,
      options: { request: { ...mockSwapTxRequest, nonce: nonce + 1 }, submitViaPrivateRpc: false },
      typeInfo: mockTransactionTypeInfo,
      analytics: classicSwapParams.analytics,
      txId: classicSwapParams.txId,
    }

    await expectSaga(approveAndSwap, classicSwapParams)
      .provide([
        ...sharedProviders,
        [
          call(sendTransaction, expectedSendApprovalParams),
          { transactionResponse: { hash: '0xMockApprovalTxHash' }, populatedRequest: {} },
        ],
        [
          call(sendTransaction, expectedSendSwapParams),
          { transactionResponse: { hash: '0xMockSwapTxHash' }, populatedRequest: {} },
        ],
      ])
      .call(sendTransaction, expectedSendSwapParams)
      .silentRun()

    testSaga(approveAndSwap, classicSwapParams)
      .next()
      .call(classicSwapParams.onSubmit)
      .next()
      .call(shouldSubmitViaPrivateRpc, classicSwapParams.swapTxContext.txRequest.chainId)
      .next(false)
      .call(getNonceForApproveAndSwap, classicSwapParams.account.address, mockSwapTxRequest.chainId, false)
      .next(nonce)
      .call(sendTransaction, expectedSendApprovalParams)
      .next({ transactionResponse: { hash: '0xMockApprovalTxHash' }, populatedRequest: {} })
      .call(sendTransaction, expectedSendSwapParams)
      .next({ transactionResponse: { hash: '0xMockSwapTxHash' }, populatedRequest: {} })
      .isDone()
  })

  it('sends a uniswapx order', async () => {
    const expectedSubmitOrderParams: SubmitUniswapXOrderParams = {
      chainId: uniswapXSwapParams.swapTxContext.trade.inputAmount.currency.chainId,
      account: uniswapXSwapParams.account,
      typeInfo: mockTransactionTypeInfo,
      analytics: uniswapXSwapParams.analytics,
      approveTxHash: '0xMockApprovalTxHash',
      wrapTxHash: undefined,
      txId: uniswapXSwapParams.txId,
      orderParams: uniswapXSwapParams.swapTxContext.orderParams,
      onSubmit: uniswapXSwapParams.onSubmit,
      onFailure: uniswapXSwapParams.onFailure,
    }

    await expectSaga(approveAndSwap, uniswapXSwapParams)
      .provide([
        ...sharedProviders,
        [
          call(sendTransaction, expectedSendApprovalParams),
          { transactionResponse: { hash: '0xMockApprovalTxHash' }, populatedRequest: {} },
        ],
        [call(submitUniswapXOrder, expectedSubmitOrderParams), undefined],
      ])
      .call.fn(submitUniswapXOrder)
      .silentRun()

    testSaga(approveAndSwap, uniswapXSwapParams)
      .next()
      .call(getNonceForApproveAndSwap, classicSwapParams.account.address, mockSwapTxRequest.chainId, false)
      .next(nonce)
      .call(sendTransaction, expectedSendApprovalParams)
      .next({ transactionResponse: { hash: '0xMockApprovalTxHash' }, populatedRequest: {} })
      .call(submitUniswapXOrder, expectedSubmitOrderParams)
      .next()
      .isDone()
  })

  it('sends an ETH-input uniswapx order', async () => {
    const uniswapXSwapEthInputParams = {
      ...uniswapXSwapParams,
      swapTxContext: {
        ...uniswapXSwapParams.swapTxContext,
        wrapTxRequest: mockWrapTxRequest,
      },
    } satisfies SwapParams

    const expectedSendWrapParams: SendTransactionParams = {
      chainId: mockWrapTxRequest.chainId,
      account,
      options: { request: { ...mockWrapTxRequest, nonce: nonce + 1 } },
      typeInfo: {
        type: TransactionType.Wrap,
        unwrapped: false,
        currencyAmountRaw: '1000',
        swapTxId: '1',
      },
      txId: undefined,
    }

    const expectedSubmitOrderParams: SubmitUniswapXOrderParams = {
      chainId: uniswapXSwapParams.swapTxContext.trade.inputAmount.currency.chainId,
      account: uniswapXSwapParams.account,
      typeInfo: mockTransactionTypeInfo,
      analytics: uniswapXSwapParams.analytics,
      approveTxHash: '0xMockApprovalTxHash',
      wrapTxHash: '0xMockWrapTxHash',
      txId: uniswapXSwapParams.txId,
      orderParams: uniswapXSwapParams.swapTxContext.orderParams,
      onSubmit: uniswapXSwapParams.onSubmit,
      onFailure: uniswapXSwapParams.onFailure,
    }

    await expectSaga(approveAndSwap, uniswapXSwapEthInputParams)
      .provide([
        ...sharedProviders,
        [
          call(sendTransaction, expectedSendApprovalParams),
          { transactionResponse: { hash: '0xMockApprovalTxHash' }, populatedRequest: {} },
        ],
        [
          call(sendTransaction, expectedSendWrapParams),
          { transactionResponse: { hash: '0xMockWrapTxHash' }, populatedRequest: {} },
        ],
        [call(submitUniswapXOrder, expectedSubmitOrderParams), undefined],
      ])
      .call.fn(submitUniswapXOrder)
      .silentRun()

    testSaga(approveAndSwap, uniswapXSwapEthInputParams)
      .next()
      .call(getNonceForApproveAndSwap, classicSwapParams.account.address, mockSwapTxRequest.chainId, false)
      .next(nonce)
      .call(sendTransaction, expectedSendApprovalParams)
      .next({ transactionResponse: { hash: '0xMockApprovalTxHash' }, populatedRequest: {} })
      .call(sendTransaction, expectedSendWrapParams)
      .next({ transactionResponse: { hash: '0xMockWrapTxHash' }, populatedRequest: {} })
      .call(submitUniswapXOrder, expectedSubmitOrderParams)
      .next()
      .isDone()
  })
})
