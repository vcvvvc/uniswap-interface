import { memo } from 'react'
import { ImpactFeedbackStyle, isWeb, TouchableArea, useSporeColors } from 'ui/src'
import { iconSizes } from 'ui/src/theme'
import { TokenLogo } from 'uniswap/src/components/CurrencyLogo/TokenLogo'
import { Pill } from 'uniswap/src/components/pill/Pill'
import { OnSelectCurrency, TokenOption, TokenSection } from 'uniswap/src/components/TokenSelector/types'
import { getSymbolDisplayText } from 'uniswap/src/utils/currency'

function _SuggestedToken({
  onSelectCurrency,
  token,
  index,
  section,
}: {
  onSelectCurrency: OnSelectCurrency
  token: TokenOption
  index: number
  section: TokenSection
}): JSX.Element {
  const { currency, logoUrl } = token.currencyInfo
  const colors = useSporeColors()
  const onPress = (): void => {
    onSelectCurrency?.(token.currencyInfo, section, index)
  }
  return (
    <TouchableArea
      hapticFeedback
      hapticStyle={ImpactFeedbackStyle.Light}
      testID={`token-option-${currency.chainId}-${currency.symbol}`}
      onPress={onPress}
    >
      <Pill
        borderColor="$surface3"
        borderRadius="$roundedFull"
        borderWidth={1}
        foregroundColor={colors.neutral1.val}
        icon={
          <TokenLogo
            name={currency.name}
            size={isWeb ? iconSizes.icon24 : iconSizes.icon28}
            symbol={currency.symbol}
            url={logoUrl}
          />
        }
        label={getSymbolDisplayText(currency.symbol)}
        pl="$spacing4"
        pr="$spacing12"
        py="$spacing4"
        textVariant="buttonLabel1"
      />
    </TouchableArea>
  )
}

export const SuggestedToken = memo(_SuggestedToken)
