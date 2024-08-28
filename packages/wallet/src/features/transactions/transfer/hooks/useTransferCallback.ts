import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { providers } from 'ethers'
import { useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { AssetType } from 'uniswap/src/entities/assets'
import { WalletChainId } from 'uniswap/src/types/chains'
import { transferTokenActions } from 'wallet/src/features/transactions/transfer/transferTokenSaga'
import { TransferTokenParams } from 'wallet/src/features/transactions/transfer/types'
import { useActiveAccount } from 'wallet/src/features/wallet/hooks'

/** Helper transfer callback for ERC20s */
export function useTransferERC20Callback(
  txId?: string,
  chainId?: WalletChainId,
  toAddress?: Address,
  tokenAddress?: Address,
  amountInWei?: string,
  transferTxWithGasSettings?: providers.TransactionRequest,
  onSubmit?: () => void,
  currencyAmountUSD?: Maybe<CurrencyAmount<Currency>>, // for analytics
): (() => void) | null {
  const account = useActiveAccount()

  return useTransferCallback(
    chainId && toAddress && tokenAddress && amountInWei && account
      ? {
          account,
          chainId,
          toAddress,
          tokenAddress,
          amountInWei,
          type: AssetType.Currency,
          txId,
          currencyAmountUSD,
        }
      : undefined,
    transferTxWithGasSettings,
    onSubmit,
  )
}

/** Helper transfer callback for NFTs */
export function useTransferNFTCallback(
  txId?: string,
  chainId?: WalletChainId,
  toAddress?: Address,
  tokenAddress?: Address,
  tokenId?: string,
  txRequest?: providers.TransactionRequest,
  onSubmit?: () => void,
): (() => void) | null {
  const account = useActiveAccount()

  return useTransferCallback(
    account && chainId && toAddress && tokenAddress && tokenId
      ? {
          account,
          chainId,
          toAddress,
          tokenAddress,
          tokenId,
          type: AssetType.ERC721,
          txId,
        }
      : undefined,
    txRequest,
    onSubmit,
  )
}

/** General purpose transfer callback for ERC20s, NFTs, etc. */
function useTransferCallback(
  transferTokenParams?: TransferTokenParams,
  txRequest?: providers.TransactionRequest,
  onSubmit?: () => void,
): null | (() => void) {
  const dispatch = useDispatch()

  return useMemo(() => {
    if (!transferTokenParams || !txRequest) {
      return null
    }

    return () => {
      dispatch(transferTokenActions.trigger({ transferTokenParams, txRequest }))
      onSubmit?.()
    }
  }, [transferTokenParams, dispatch, txRequest, onSubmit])
}
