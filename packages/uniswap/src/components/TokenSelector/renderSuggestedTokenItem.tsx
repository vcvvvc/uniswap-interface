import { Flex } from 'ui/src'
import { SuggestedToken } from 'uniswap/src/components/TokenSelector/SuggestedToken'
import { OnSelectCurrency, TokenOption, TokenSection } from 'uniswap/src/components/TokenSelector/types'

export function renderSuggestedTokenItem({
  item: suggestedTokens,
  index,
  section,
  onSelectCurrency,
}: {
  item: TokenOption[]
  section: TokenSection
  index: number
  onSelectCurrency: OnSelectCurrency
}): JSX.Element {
  return (
    <Flex row flexWrap="wrap" gap="$spacing8" pb="$spacing8" pt="$spacing16">
      {suggestedTokens.map((token) => (
        <SuggestedToken
          key={token.currencyInfo.currencyId}
          index={index}
          section={section}
          token={token}
          onSelectCurrency={onSelectCurrency}
        />
      ))}
    </Flex>
  )
}
