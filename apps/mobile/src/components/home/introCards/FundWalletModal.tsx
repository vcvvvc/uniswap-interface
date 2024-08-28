import React, { PropsWithChildren, useCallback, useMemo } from 'react'
import { FlatList, ImageBackground } from 'react-native'
import { useDispatch } from 'react-redux'
import { openModal } from 'src/features/modals/modalSlice'
import { Flex, useIsDarkMode } from 'ui/src'
import { CRYPTO_PURCHASE_BACKGROUND_DARK, CRYPTO_PURCHASE_BACKGROUND_LIGHT } from 'ui/src/assets'
import { ArrowDownCircle, Buy } from 'ui/src/components/icons'
import { borderRadii, iconSizes, spacing } from 'ui/src/theme'
import { ActionCard, ActionCardItem } from 'uniswap/src/components/misc/ActionCard'
import { BottomSheetModal } from 'uniswap/src/components/modals/BottomSheetModal'
import { useCexTransferProviders } from 'uniswap/src/features/fiatOnRamp/useCexTransferProviders'
import { ElementName, ModalName } from 'uniswap/src/features/telemetry/constants'
import { useTranslation } from 'uniswap/src/i18n'
import { ScannerModalState } from 'wallet/src/components/QRCodeScanner/constants'
import { ImageUri } from 'wallet/src/features/images/ImageUri'

export function FundWalletModal({ onClose }: { onClose: () => void }): JSX.Element {
  const isDarkMode = useIsDarkMode()
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const cexTransferProviders = useCexTransferProviders()

  const BackgroundImageWrapperCallback = useCallback(
    ({ children }: { children: React.ReactNode }) => {
      return (
        <ImageBackground
          borderRadius={borderRadii.rounded24}
          source={isDarkMode ? CRYPTO_PURCHASE_BACKGROUND_DARK : CRYPTO_PURCHASE_BACKGROUND_LIGHT}
        >
          {children}
        </ImageBackground>
      )
    },
    [isDarkMode],
  )

  const onPressBuy = useCallback(() => {
    dispatch(openModal({ name: ModalName.FiatOnRampAggregator }))
  }, [dispatch])
  const onPressReceive = useCallback(() => {
    dispatch(
      openModal(
        cexTransferProviders.length > 0
          ? {
              name: ModalName.ReceiveCryptoModal,
              initialState: cexTransferProviders,
            }
          : {
              name: ModalName.WalletConnectScan,
              initialState: ScannerModalState.WalletQr,
            },
      ),
    )
  }, [cexTransferProviders, dispatch])

  const cards = useMemo(
    () =>
      [
        {
          title: t('home.tokens.empty.action.buy.title'),
          blurb: t('home.tokens.empty.action.buy.description'),
          elementName: ElementName.EmptyStateBuy,
          // Intentionally sized differently per designs because this icon has more vertical padding than others
          icon: (
            <Flex my={-spacing.spacing4}>
              <Buy color="$accent1" size="$icon.28" />
            </Flex>
          ),
          onPress: onPressBuy,
          BackgroundImageWrapperCallback,
        },
        {
          title: t('home.tokens.empty.action.receive.title'),
          blurb: t('home.tokens.empty.action.receive.description'),
          elementName: ElementName.EmptyStateReceive,
          icon:
            cexTransferProviders.length > 0 ? (
              <OverlappingLogos
                logos={[<ReceiveCryptoIcon />, ...cexTransferProviders.map((provider) => provider.logos.lightLogo)]}
              />
            ) : (
              <ArrowDownCircle color="$accent1" size="$icon.24" />
            ),
          onPress: onPressReceive,
        },
      ] satisfies ActionCardItem[],
    [BackgroundImageWrapperCallback, cexTransferProviders, onPressBuy, onPressReceive, t],
  )
  return (
    <BottomSheetModal name={ModalName.FundWallet} onClose={onClose}>
      <Flex gap="$spacing12" pb="$spacing12" px="$spacing16">
        {cards.map((card) => (
          <ActionCard
            key={card.title}
            {...card}
            containerProps={{
              py: '$spacing20',
              // TODO WALL-3699 replace with spore shadow support
              shadowColor: isDarkMode ? 'rgba(0, 0, 0, 0.24)' : 'rgba(0, 0, 0, 0.02)',
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 6,
            }}
          />
        ))}
      </Flex>
    </BottomSheetModal>
  )
}

const ICON_SHIFT = 10

function OverlappingLogos({ logos }: { logos: (string | JSX.Element)[] }): JSX.Element {
  return (
    <Flex height={iconSizes.icon24}>
      <FlatList
        horizontal
        CellRendererComponent={LogoRendererComponent}
        contentContainerStyle={{
          paddingEnd: -ICON_SHIFT,
          marginEnd: ICON_SHIFT,
        }}
        data={logos}
        renderItem={({ item }) => (typeof item === 'string' ? <ServiceProviderLogo uri={item} /> : item)}
      />
    </Flex>
  )
}

/*
 * Set the zIndex to -index to reverse the order of the elements.
 */
const LogoRendererComponent = ({
  children,
  index,
}: PropsWithChildren<{
  index: number
}>): JSX.Element => {
  return (
    <Flex
      centered
      animation="quick"
      enterStyle={{ opacity: 0 }}
      exitStyle={{ opacity: 0 }}
      marginEnd={-ICON_SHIFT}
      zIndex={-index}
    >
      {children}
    </Flex>
  )
}

function ServiceProviderLogo({ uri }: { uri: string }): JSX.Element {
  return (
    <Flex
      backgroundColor="$surface1"
      borderColor="$surface1"
      borderRadius="$rounded8"
      borderWidth={2}
      overflow="hidden"
    >
      <ImageUri
        imageStyle={{
          borderRadius: borderRadii.rounded8,
          height: iconSizes.icon24,
          width: iconSizes.icon24,
        }}
        resizeMode="cover"
        uri={uri}
      />
    </Flex>
  )
}

function ReceiveCryptoIcon(): JSX.Element {
  return (
    <Flex
      backgroundColor="$surface1"
      borderColor="$surface1"
      borderRadius="$roundedFull"
      borderWidth={1}
      overflow="hidden"
    >
      <ArrowDownCircle color="$accent1" size="$icon.24" />
    </Flex>
  )
}
