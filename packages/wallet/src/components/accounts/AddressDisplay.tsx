import { SharedEventName } from '@uniswap/analytics-events'
import { PropsWithChildren, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FlexAlignType } from 'react-native'
import { useDispatch } from 'react-redux'
import { ColorTokens, Flex, SpaceTokens, Text, TextProps, TouchableArea, useHapticFeedback } from 'ui/src'
import { CopySheets } from 'ui/src/components/icons'
import { fonts } from 'ui/src/theme'
import { ElementName } from 'uniswap/src/features/telemetry/constants'
import { sendAnalyticsEvent } from 'uniswap/src/features/telemetry/send'
import { TestID } from 'uniswap/src/test/fixtures/testIDs'
import { sanitizeAddressText, shortenAddress } from 'uniswap/src/utils/addresses'
import { setClipboard } from 'uniswap/src/utils/clipboard'
import { AccountIcon } from 'wallet/src/components/accounts/AccountIcon'
import { DisplayNameText } from 'wallet/src/components/accounts/DisplayNameText'
import { pushNotification } from 'wallet/src/features/notifications/slice'
import { AppNotificationType, CopyNotificationType } from 'wallet/src/features/notifications/types'
import { useAvatar, useDisplayName } from 'wallet/src/features/wallet/hooks'
import { DisplayNameType } from 'wallet/src/features/wallet/types'

type AddressDisplayProps = {
  address: string
  overrideDisplayName?: string
  allowFontScaling?: boolean
  lineHeight?: number
  hideAddressInSubtitle?: boolean
  size?: number
  variant?: keyof typeof fonts
  textColor?: ColorTokens
  captionTextColor?: ColorTokens
  captionVariant?: keyof typeof fonts
  direction?: 'row' | 'column'
  showCopy?: boolean
  showCopyWrapperButton?: boolean
  showAccountIcon?: boolean
  contentAlign?: FlexAlignType
  showIconBackground?: boolean
  showIconBorder?: boolean
  includeUnitagSuffix?: boolean
  textAlign?: FlexAlignType
  horizontalGap?: SpaceTokens
  notificationsBadgeContainer?: ({ children, address }: { children: JSX.Element; address: string }) => JSX.Element
  gapBetweenLines?: SpaceTokens
  showViewOnlyLabel?: boolean
  showViewOnlyBadge?: boolean
}

type CopyButtonWrapperProps = {
  onPress?: () => void
  backgroundColor?: string
}

function CopyButtonWrapper({ children, onPress }: PropsWithChildren<CopyButtonWrapperProps>): JSX.Element {
  if (onPress) {
    return (
      <TouchableArea hapticFeedback hitSlop={16} testID={TestID.Copy} onPress={onPress}>
        {children}
      </TouchableArea>
    )
  }

  return <>{children}</>
}

// This seems to work for most font sizes and screens, but could probably be improved and abstracted
// if we find more uses for it in other areas.
function getLineHeightForAdjustedFontSize(nameLength: number, maxLineHeight?: number): number {
  // as name gets longer, number gets smaller down to 1, past 50 just 1
  const lineHeightBase = 50 - Math.min(49, nameLength)
  const scale = 1.2
  const calculatedLineHeight = lineHeightBase * scale
  return maxLineHeight ? Math.min(calculatedLineHeight, maxLineHeight) : calculatedLineHeight
}

/** Helper component to display identicon and formatted address */

export function AddressDisplay({
  allowFontScaling = true,
  overrideDisplayName,
  lineHeight,
  address,
  size = 24,
  variant = 'body1',
  textColor = '$neutral1',
  captionTextColor = '$neutral2',
  captionVariant = 'subheading2',
  hideAddressInSubtitle,
  direction = 'row',
  showCopy = false,
  showCopyWrapperButton = false,
  showAccountIcon = true,
  textAlign,
  contentAlign = 'center', // vertical alignment of all items
  showIconBackground,
  showIconBorder,
  horizontalGap = '$spacing12',
  showViewOnlyBadge = false,
  showViewOnlyLabel = false,
  notificationsBadgeContainer,
  includeUnitagSuffix = false,
  gapBetweenLines = '$none',
}: AddressDisplayProps): JSX.Element {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const displayName = useDisplayName(address, { includeUnitagSuffix, overrideDisplayName })
  const { avatar } = useAvatar(address)
  const { hapticFeedback } = useHapticFeedback()

  const showAddressAsSubtitle = !hideAddressInSubtitle && displayName?.type !== DisplayNameType.Address

  const onPressCopyAddress = async (): Promise<void> => {
    if (!address) {
      return
    }
    await hapticFeedback.impact()
    await setClipboard(address)
    dispatch(
      pushNotification({
        type: AppNotificationType.Copied,
        copyType: CopyNotificationType.Address,
      }),
    )
    sendAnalyticsEvent(SharedEventName.ELEMENT_CLICKED, {
      element: ElementName.CopyAddress,
    })
  }

  // Extract sizes so copy icon can match font variants
  const mainSize = fonts[variant].fontSize
  const captionSize = fonts[captionVariant].fontSize
  const itemAlignment = textAlign || (!showAccountIcon || direction === 'column' ? 'center' : 'flex-start')

  const icon = useMemo(() => {
    return (
      <AccountIcon
        address={address}
        avatarUri={avatar}
        showBackground={showIconBackground}
        showBorder={showIconBorder}
        showViewOnlyBadge={showViewOnlyBadge}
        size={size}
      />
    )
  }, [address, avatar, showIconBackground, showIconBorder, showViewOnlyBadge, size])

  const name = displayName?.name ?? ''

  // since adjustsFontSizeToFit doesn't really work adjusting line height properly
  // manually adjust lineHeight things to keep vertical center
  const dynamicSizedTextVerticalStyles: TextProps =
    name.length > 20
      ? {
          adjustsFontSizeToFit: true,
          lineHeight: getLineHeightForAdjustedFontSize(name.length, lineHeight),
        }
      : {
          lineHeight: lineHeight ?? fonts[variant].lineHeight,
        }

  return (
    <Flex shrink alignItems={contentAlign} flexDirection={direction} gap={horizontalGap}>
      {showAccountIcon &&
        (notificationsBadgeContainer ? notificationsBadgeContainer({ children: icon, address }) : icon)}
      <Flex shrink alignItems={itemAlignment} gap={gapBetweenLines}>
        <CopyButtonWrapper onPress={showCopy && !showAddressAsSubtitle ? onPressCopyAddress : undefined}>
          <Flex centered row gap="$spacing12">
            <DisplayNameText
              displayName={displayName}
              gap="$spacing4"
              includeUnitagSuffix={includeUnitagSuffix}
              textProps={{
                adjustsFontSizeToFit: true,
                allowFontScaling,
                color: textColor,
                ellipsizeMode: 'tail',
                fontFamily: '$heading',
                fontSize: mainSize,
                numberOfLines: 1,
                testID: `address-display/name/${displayName?.name}`,
                ...dynamicSizedTextVerticalStyles,
              }}
              unitagIconSize={mainSize}
            />
            {showCopy && !showAddressAsSubtitle && <CopySheets color="$neutral1" size={mainSize} />}
          </Flex>
        </CopyButtonWrapper>
        {showAddressAsSubtitle && (
          <AddressSubtitle
            address={address}
            captionSize={captionSize}
            captionTextColor={captionTextColor}
            captionVariant={captionVariant}
            showCopy={showCopy}
            showCopyWrapperButton={showCopyWrapperButton}
            onPressCopyAddress={onPressCopyAddress}
          />
        )}
      </Flex>

      {showViewOnlyLabel && (
        <Flex grow alignItems="flex-end" mr="$spacing8">
          <Flex backgroundColor="$surface2" borderRadius="$rounded12" px="$spacing8" py="$spacing4">
            <Text color="$neutral2" variant="body4">
              {t('settings.section.wallet.label.viewOnly')}
            </Text>
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}

const AddressSubtitle = ({
  address,
  captionTextColor,
  captionVariant,
  captionSize,
  showCopy,
  showCopyWrapperButton,
  onPressCopyAddress,
}: { captionSize: number; onPressCopyAddress: () => Promise<void> } & Pick<
  AddressDisplayProps,
  'address' | 'captionTextColor' | 'captionVariant' | 'showCopy' | 'showCopyWrapperButton'
>): JSX.Element => (
  <CopyButtonWrapper onPress={showCopy ? onPressCopyAddress : undefined}>
    <Flex
      centered
      row
      backgroundColor={showCopyWrapperButton ? '$surface2' : '$transparent'}
      borderRadius="$roundedFull"
      gap="$spacing4"
      mt={showCopyWrapperButton ? '$spacing8' : '$none'}
      px={showCopyWrapperButton ? '$spacing8' : '$none'}
      py={showCopyWrapperButton ? '$spacing4' : '$none'}
    >
      <Text color={captionTextColor} variant={captionVariant}>
        {sanitizeAddressText(shortenAddress(address))}
      </Text>
      {showCopy && <CopySheets color={captionTextColor} size={captionSize} />}
    </Flex>
  </CopyButtonWrapper>
)
