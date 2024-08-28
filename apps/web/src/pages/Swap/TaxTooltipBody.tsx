import styled from 'lib/styled-components'
import { ThemedText } from 'theme/components'
import { Trans } from 'uniswap/src/i18n'

const Divider = styled.div`
  width: 100%;
  height: 1px;
  border-width: 0;
  margin: 12px 0;
  background-color: ${({ theme }) => theme.surface3};
`

export function OutputTaxTooltipBody({ currencySymbol }: { currencySymbol?: string }) {
  return (
    <>
      <ThemedText.SubHeaderSmall color="textPrimary">
        <Trans i18nKey="swap.taxTooltip.label" />
      </ThemedText.SubHeaderSmall>
      <Divider />
      <ThemedText.LabelMicro color="textPrimary">
        {currencySymbol ? (
          <Trans i18nKey="swap.taxTooltip.tokenSelected" values={{ tokenSymbol: currencySymbol }} />
        ) : (
          <Trans i18nKey="swap.taxTooltip.noTokenSelected" />
        )}
      </ThemedText.LabelMicro>
    </>
  )
}
