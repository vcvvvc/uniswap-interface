import { utils } from 'ethers'
import React from 'react'
import { useAppSelector } from 'src/app/hooks'
import { navigate } from 'src/app/navigation/rootNavigation'
import { CurrencyLogoOrPlaceholder } from 'src/components/CurrencyLogo/CurrencyLogoOrPlaceholder'
import { LogoWithTxStatus } from 'src/components/CurrencyLogo/LogoWithTxStatus'
import { NetworkLogo } from 'src/components/CurrencyLogo/NetworkLogo'
import { RemoteImage } from 'src/components/images/RemoteImage'
import { Box } from 'src/components/layout/Box'
import { AssetType } from 'src/entities/assets'
import { useSpotPrices } from 'src/features/dataApi/prices'
import { useENS } from 'src/features/ens/useENS'
import { useNFT } from 'src/features/nfts/hooks'
import {
  NotificationToast,
  NotificationToastProps,
  NOTIFICATION_SIZING,
} from 'src/features/notifications/NotificationToast'
import {
  AppErrorNotification,
  AppNotificationDefault,
  ApproveTxNotification,
  SwapTxNotification,
  TransactionNotificationBase,
  TransferCurrencyTxNotification,
  TransferNFTTxNotification,
  WalletConnectNotification,
} from 'src/features/notifications/types'
import {
  createBalanceUpdate,
  formApproveNotificationTitle,
  formSwapNotificationTitle,
  formTransferCurrencyNotificationTitle,
  formTransferNFTNotificationTitle,
  formUnknownTxTitle,
  formWCNotificationTitle,
} from 'src/features/notifications/utils'
import { useCurrency } from 'src/features/tokens/useCurrency'
import { useCreateSwapFormState } from 'src/features/transactions/hooks'
import { TransactionStatus, TransactionType } from 'src/features/transactions/types'
import { activeAccountAddressSelector } from 'src/features/wallet/walletSlice'
import { Screens } from 'src/screens/Screens'
import { toSupportedChainId } from 'src/utils/chainId'
import { buildCurrencyId } from 'src/utils/currencyId'

interface TxNotificationToastProps extends NotificationToastProps {
  txHash: string
}

function TxNotificationToast({
  title,
  icon,
  balanceUpdate,
  onPress,
  txHash,
}: TxNotificationToastProps) {
  const defaultOnPress = () => navigate(Screens.Notifications, { txHash })
  const onTxPress = onPress ? onPress : defaultOnPress
  return (
    <NotificationToast
      balanceUpdate={balanceUpdate}
      icon={icon}
      title={title}
      onPress={onTxPress}
    />
  )
}

export function WCNotification({ notification }: { notification: WalletConnectNotification }) {
  // TODO: Define onPress to handle navigating to relevant screen
  const { imageUrl, chainId: chainIdString } = notification
  const chainId = toSupportedChainId(chainIdString)
  const title = formWCNotificationTitle(notification)
  const icon = (
    <>
      <RemoteImage
        borderRadius={NOTIFICATION_SIZING.primaryImage / 2}
        height={NOTIFICATION_SIZING.primaryImage}
        imageUrl={imageUrl}
        width={NOTIFICATION_SIZING.primaryImage}
      />
      {chainId && (
        <Box bottom={0} position="absolute" right={0}>
          <NetworkLogo chainId={chainId} size={NOTIFICATION_SIZING.secondaryImage} />
        </Box>
      )}
    </>
  )

  return <NotificationToast icon={icon} title={title} />
}

export function ApproveNotification({
  notification: { chainId, tokenAddress, spender, txStatus, txHash, txType },
}: {
  notification: ApproveTxNotification
}) {
  const currency = useCurrency(buildCurrencyId(chainId, tokenAddress))
  const title = formApproveNotificationTitle(txStatus, currency, tokenAddress, spender)
  const icon = (
    <LogoWithTxStatus
      assetType={AssetType.Currency}
      currency={currency}
      size={NOTIFICATION_SIZING}
      txStatus={txStatus}
      txType={txType}
    />
  )

  return <TxNotificationToast icon={icon} title={title} txHash={txHash} />
}

export function SwapNotification({
  notification: {
    chainId,
    txHash,
    txType,
    txStatus,
    inputCurrencyId,
    inputCurrencyAmountRaw,
    outputCurrencyId,
    outputCurrencyAmountRaw,
    tradeType,
  },
}: {
  notification: SwapTxNotification
}) {
  const inputCurrency = useCurrency(inputCurrencyId)
  const outputCurrency = useCurrency(outputCurrencyId)
  const title = formSwapNotificationTitle(
    txStatus,
    tradeType,
    inputCurrency,
    outputCurrency,
    inputCurrencyId,
    outputCurrencyId,
    inputCurrencyAmountRaw,
    outputCurrencyAmountRaw
  )

  const swapFormState = useCreateSwapFormState(chainId, txHash)

  const onPress =
    txStatus === TransactionStatus.Failed
      ? () => navigate(Screens.Swap, swapFormState ? { swapFormState } : undefined)
      : undefined

  const { spotPrices } = useSpotPrices([outputCurrency])
  const balanceUpdate = createBalanceUpdate(
    txStatus,
    outputCurrency,
    outputCurrencyAmountRaw,
    spotPrices
  )

  const icon =
    txStatus === TransactionStatus.Success ? (
      <>
        <Box left={0} position="absolute" testID="swap-success-toast" top={0}>
          <CurrencyLogoOrPlaceholder
            currency={inputCurrency}
            size={NOTIFICATION_SIZING.primaryImage}
          />
        </Box>
        <Box bottom={0} position="absolute" right={0}>
          <CurrencyLogoOrPlaceholder
            currency={outputCurrency}
            size={NOTIFICATION_SIZING.primaryImage}
          />
        </Box>
      </>
    ) : (
      <LogoWithTxStatus
        assetType={AssetType.Currency}
        currency={inputCurrency}
        size={NOTIFICATION_SIZING}
        txStatus={txStatus}
        txType={txType}
      />
    )

  return (
    <TxNotificationToast
      balanceUpdate={balanceUpdate}
      icon={icon}
      title={title}
      txHash={txHash}
      onPress={onPress}
    />
  )
}

export function TransferCurrencyNotification({
  notification,
}: {
  notification: TransferCurrencyTxNotification
}) {
  const { assetType, chainId, tokenAddress, currencyAmountRaw, txType, txStatus, txHash } =
    notification
  const senderOrRecipient =
    txType === TransactionType.Send ? notification.recipient : notification.sender
  const { name: ensName } = useENS(chainId, senderOrRecipient)
  const currency = useCurrency(buildCurrencyId(chainId, tokenAddress))
  const { spotPrices } = useSpotPrices([currency])
  const balanceUpdate = createBalanceUpdate(txStatus, currency, currencyAmountRaw, spotPrices)
  const title = formTransferCurrencyNotificationTitle(
    txType,
    txStatus,
    currency,
    tokenAddress,
    currencyAmountRaw,
    ensName ?? senderOrRecipient
  )

  const icon = (
    <LogoWithTxStatus
      assetType={assetType}
      currency={currency}
      size={NOTIFICATION_SIZING}
      txStatus={txStatus}
      txType={txType}
    />
  )

  return (
    <TxNotificationToast balanceUpdate={balanceUpdate} icon={icon} title={title} txHash={txHash} />
  )
}

export function TransferNFTNotification({
  notification,
}: {
  notification: TransferNFTTxNotification
}) {
  const { assetType, chainId, tokenAddress, tokenId, txType, txStatus, txHash } = notification
  const userAddress = useAppSelector(activeAccountAddressSelector) || ''
  const senderOrRecipient =
    txType === TransactionType.Send ? notification.recipient : notification.sender
  const nftOwner = txType === TransactionType.Send ? notification.recipient : userAddress
  const { asset: nft } = useNFT(nftOwner, utils.getAddress(tokenAddress), tokenId)
  const { name: ensName } = useENS(chainId, senderOrRecipient)
  const title = formTransferNFTNotificationTitle(
    txType,
    txStatus,
    nft,
    tokenAddress,
    tokenId,
    ensName ?? senderOrRecipient
  )

  const icon = (
    <LogoWithTxStatus
      assetType={assetType}
      nft={nft}
      size={NOTIFICATION_SIZING}
      txStatus={txStatus}
      txType={txType}
    />
  )

  return <TxNotificationToast icon={icon} title={title} txHash={txHash} />
}

export function UnknownTxNotification({
  notification: { chainId, tokenAddress, txStatus, txType, txHash },
}: {
  notification: TransactionNotificationBase
}) {
  const { name: ensName } = useENS(chainId, tokenAddress)
  const currency = useCurrency(buildCurrencyId(chainId, tokenAddress ?? ''))
  const title = formUnknownTxTitle(txStatus, tokenAddress, ensName)
  const icon = (
    <LogoWithTxStatus
      assetType={AssetType.Currency}
      currency={currency}
      size={NOTIFICATION_SIZING}
      txStatus={txStatus}
      txType={txType}
    />
  )

  return <TxNotificationToast icon={icon} title={title} txHash={txHash} />
}

export function ErrorNotification({
  notification: { errorMessage },
}: {
  notification: AppErrorNotification
}) {
  return <NotificationToast title={errorMessage} />
}

export function DefaultNotification({
  notification: { title },
}: {
  notification: AppNotificationDefault
}) {
  return <NotificationToast title={title} />
}
