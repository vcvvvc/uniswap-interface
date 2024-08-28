import { useTranslation } from 'react-i18next'
import { Flex, Text } from 'ui/src'
import { iconSizes } from 'ui/src/theme'
import { CurrencyLogo } from 'uniswap/src/components/CurrencyLogo/CurrencyLogo'
import { BottomSheetModal } from 'uniswap/src/components/modals/BottomSheetModal'
import { LearnMoreLink } from 'uniswap/src/components/text/LearnMoreLink'
import { uniswapUrls } from 'uniswap/src/constants/urls'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { WalletChainId } from 'uniswap/src/types/chains'
import { useCurrencyInfo, useNativeCurrencyInfo } from 'wallet/src/features/tokens/useCurrencyInfo'
import { BuyNativeTokenButton } from 'wallet/src/features/transactions/InsufficientNativeTokenWarning/BuyNativeTokenButton'

export function BuyNativeTokenModal({
  chainId,
  currencyId,
  onClose,
}: {
  chainId: WalletChainId
  currencyId: string
  onClose: () => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const nativeCurrencyInfo = useNativeCurrencyInfo(chainId)
  const currencyInfo = useCurrencyInfo(currencyId)
  if (!nativeCurrencyInfo || !currencyInfo) {
    return null
  }

  return (
    <BottomSheetModal isDismissible alignment="top" name={ModalName.BuyNativeToken} onClose={onClose}>
      <Flex centered gap="$spacing24" px="$spacing24" py="$spacing12">
        <Flex centered gap="$spacing16">
          <CurrencyLogo currencyInfo={nativeCurrencyInfo} size={iconSizes.icon48} />
          <Flex centered gap="$spacing8">
            <Text variant="subheading1">
              {t('token.zeroNativeBalance.title', { nativeTokenName: nativeCurrencyInfo.currency.name })}
            </Text>
            <Text color="$neutral2" textAlign="center" variant="body3">
              {t('token.zeroNativeBalance.description', {
                tokenSymbol: currencyInfo.currency.symbol,
                nativeTokenSymbol: nativeCurrencyInfo.currency.symbol,
              })}
            </Text>
          </Flex>
        </Flex>
        <Flex centered gap="$spacing12" width="100%">
          <BuyNativeTokenButton nativeCurrencyInfo={nativeCurrencyInfo} />
          <Flex px="$spacing8" py="$spacing4">
            <LearnMoreLink
              textColor="$neutral2"
              textVariant="buttonLabel3"
              url={uniswapUrls.helpArticleUrls.networkFeeInfo}
            />
          </Flex>
        </Flex>
      </Flex>
    </BottomSheetModal>
  )
}
