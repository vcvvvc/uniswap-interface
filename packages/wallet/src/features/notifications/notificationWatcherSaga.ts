import { put, takeLatest } from 'typed-redux-saga'
import { AssetType } from 'uniswap/src/entities/assets'
import { WalletConnectEvent } from 'uniswap/src/types/walletConnect'
import { ONE_MINUTE_MS } from 'utilities/src/time/time'
import { buildReceiveNotification } from 'wallet/src/features/notifications/buildReceiveNotification'
import { pushNotification } from 'wallet/src/features/notifications/slice'
import { AppNotificationType } from 'wallet/src/features/notifications/types'
import { getAmountsFromTrade } from 'wallet/src/features/transactions/getAmountsFromTrade'
import { finalizeTransaction } from 'wallet/src/features/transactions/slice'
import { TransactionDetails, TransactionType } from 'wallet/src/features/transactions/types'

export function* notificationWatcher() {
  yield* takeLatest(finalizeTransaction.type, pushTransactionNotification)
}

export function* pushTransactionNotification(action: ReturnType<typeof finalizeTransaction>) {
  if (shouldSuppressNotification(action.payload)) {
    return
  }

  const { chainId, status, typeInfo, id, from } = action.payload

  const baseNotificationData = {
    txStatus: status,
    chainId,
    address: from,
    txId: id,
  }

  if (typeInfo.type === TransactionType.Approve) {
    yield* put(
      pushNotification({
        ...baseNotificationData,
        type: AppNotificationType.Transaction,
        txType: TransactionType.Approve,
        tokenAddress: typeInfo.tokenAddress,
        spender: typeInfo.spender,
      }),
    )
  } else if (typeInfo.type === TransactionType.Swap) {
    const { inputCurrencyAmountRaw, outputCurrencyAmountRaw } = getAmountsFromTrade(typeInfo)
    yield* put(
      pushNotification({
        ...baseNotificationData,
        type: AppNotificationType.Transaction,
        txType: TransactionType.Swap,
        inputCurrencyId: typeInfo.inputCurrencyId,
        outputCurrencyId: typeInfo.outputCurrencyId,
        inputCurrencyAmountRaw,
        outputCurrencyAmountRaw,
        tradeType: typeInfo.tradeType,
      }),
    )
  } else if (typeInfo.type === TransactionType.Wrap) {
    yield* put(
      pushNotification({
        ...baseNotificationData,
        type: AppNotificationType.Transaction,
        txType: TransactionType.Wrap,
        currencyAmountRaw: typeInfo.currencyAmountRaw,
        unwrapped: typeInfo.unwrapped,
      }),
    )
  } else if (typeInfo.type === TransactionType.Send) {
    if (typeInfo?.assetType === AssetType.Currency && typeInfo?.currencyAmountRaw) {
      yield* put(
        pushNotification({
          ...baseNotificationData,
          type: AppNotificationType.Transaction,
          txType: TransactionType.Send,
          assetType: typeInfo.assetType,
          tokenAddress: typeInfo.tokenAddress,
          currencyAmountRaw: typeInfo.currencyAmountRaw,
          recipient: typeInfo.recipient,
        }),
      )
    } else if (
      (typeInfo?.assetType === AssetType.ERC1155 || typeInfo?.assetType === AssetType.ERC721) &&
      typeInfo?.tokenId
    ) {
      yield* put(
        pushNotification({
          ...baseNotificationData,
          type: AppNotificationType.Transaction,
          txType: TransactionType.Send,
          assetType: typeInfo.assetType,
          tokenAddress: typeInfo.tokenAddress,
          tokenId: typeInfo.tokenId,
          recipient: typeInfo.recipient,
        }),
      )
    }
  } else if (typeInfo.type === TransactionType.Receive) {
    const receiveNotification = buildReceiveNotification(action.payload, from)
    if (receiveNotification) {
      yield* put(pushNotification(receiveNotification))
    }
  } else if (typeInfo.type === TransactionType.WCConfirm) {
    yield* put(
      pushNotification({
        type: AppNotificationType.WalletConnect,
        event: WalletConnectEvent.TransactionConfirmed,
        dappName: typeInfo.dapp.name,
        imageUrl: typeInfo.dapp.icon ?? null,
        chainId,
      }),
    )
  } else if (typeInfo.type === TransactionType.Unknown) {
    yield* put(
      pushNotification({
        ...baseNotificationData,
        type: AppNotificationType.Transaction,
        txType: TransactionType.Unknown,
        tokenAddress: typeInfo?.tokenAddress,
      }),
    )
  }
}

export const STALE_TRANSACTION_TIME_MS = ONE_MINUTE_MS * 30

// If a wrap or approve tx is submitted with a swap, then suppress the notification.
export function shouldSuppressNotification(tx: TransactionDetails) {
  const staleTransaction = Date.now() > tx.addedTime + STALE_TRANSACTION_TIME_MS
  const chainedTransaction =
    (tx.typeInfo.type === TransactionType.Approve || tx.typeInfo.type === TransactionType.Wrap) && tx.typeInfo.swapTxId
  return chainedTransaction || staleTransaction
}
