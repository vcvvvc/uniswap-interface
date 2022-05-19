import React, { PropsWithChildren } from 'react'
import { useAppSelector } from 'src/app/hooks'
import { AssetType } from 'src/entities/assets'
import {
  ApproveNotification,
  DefaultNotification,
  ErrorNotification,
  SwapNotification,
  TransferCurrencyNotification,
  TransferNFTNotification,
  UnknownTxNotification,
  WCNotification,
} from 'src/features/notifications/Notifications'
import { AppNotification, AppNotificationType } from 'src/features/notifications/types'
import { TransactionType } from 'src/features/transactions/types'

export function NotificationToastWrapper({ children }: PropsWithChildren<any>) {
  const notificationQueue = useAppSelector((state) => state.notifications.notificationQueue)
  const notification = notificationQueue[0]
  return (
    <>
      {notification && <NotificationToastRouter notification={notification} />}
      {children}
    </>
  )
}

export function NotificationToastRouter({ notification }: { notification: AppNotification }) {
  switch (notification.type) {
    case AppNotificationType.WalletConnect:
      return <WCNotification notification={notification} />
    case AppNotificationType.Error:
      return <ErrorNotification notification={notification} />
    case AppNotificationType.Default:
      return <DefaultNotification notification={notification} />
    case AppNotificationType.Transaction:
      switch (notification.txType) {
        case TransactionType.Approve:
          return <ApproveNotification notification={notification} />
        case TransactionType.Swap:
          return <SwapNotification notification={notification} />
        case TransactionType.Send:
        case TransactionType.Receive:
          const { assetType } = notification
          if (assetType === AssetType.Currency) {
            return <TransferCurrencyNotification notification={notification} />
          } else {
            return <TransferNFTNotification notification={notification} />
          }
        case TransactionType.Unknown:
          return <UnknownTxNotification notification={notification} />
      }
  }
}
