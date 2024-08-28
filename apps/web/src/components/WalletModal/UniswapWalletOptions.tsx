import Column from 'components/Column'
import Row from 'components/Row'
import { DownloadWalletOption } from 'components/WalletModal/DownloadWalletOption'
import { DetectedBadge } from 'components/WalletModal/shared'
import { useConnectorWithId } from 'components/WalletModal/useOrderedConnections'
import { CONNECTION } from 'components/Web3Provider/constants'
import { useConnect } from 'hooks/useConnect'
import styled from 'lib/styled-components'
import { Z_INDEX } from 'theme/zIndex'
import { Image, Text } from 'ui/src'
import { UNISWAP_LOGO } from 'ui/src/assets'
import { ScanQr } from 'ui/src/components/icons'
import { iconSizes } from 'ui/src/theme'
import { FeatureFlags } from 'uniswap/src/features/gating/flags'
import { useFeatureFlag } from 'uniswap/src/features/gating/hooks'
import { Trans } from 'uniswap/src/i18n'

export const OptionContainer = styled(Row)`
  padding: 16px;
  gap: 12px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.surface3};
  overflow: hidden;
  max-height: 72px;
  justify-content: space-between;
  cursor: pointer;
  position: relative;
  z-index: ${Z_INDEX.default};
  :hover {
    background: ${({ theme }) => theme.surface3};
  }
`

export const AppIcon = styled.img`
  height: 40px;
  width: 40px;
  border-radius: 10px;
  fill: linear-gradient(0deg, #fff1ff 0%, rgba(255, 255, 255, 0) 100%), #fffbff;
  filter: drop-shadow(0px 1.179px 3.537px rgba(255, 117, 249, 0.24));
`

export function UniswapWalletOptions() {
  const uniswapExtensionConnector = useConnectorWithId(CONNECTION.UNISWAP_EXTENSION_RDNS)
  const uniswapWalletConnectConnector = useConnectorWithId(CONNECTION.UNISWAP_WALLET_CONNECT_CONNECTOR_ID, {
    shouldThrow: true,
  })
  const extensionIsLaunched = useFeatureFlag(FeatureFlags.ExtensionLaunch)

  const { connect } = useConnect()

  return (
    <Column gap="16px">
      <Column gap="md">
        {uniswapExtensionConnector ? (
          // If the extension is detected, show the option to connect
          <OptionContainer
            onClick={() => connect({ connector: uniswapExtensionConnector })}
            data-testid="connect-uniswap-extension"
          >
            <Image height={iconSizes.icon40} source={UNISWAP_LOGO} width={iconSizes.icon40} />
            <Row gap="xs">
              <Text variant="buttonLabel3" color="$neutral1" whiteSpace="nowrap">
                <Trans i18nKey="common.extension" />
              </Text>
            </Row>
            <DetectedBadge />
          </OptionContainer>
        ) : // If the extension is not detected, show the option to download the app
        extensionIsLaunched ? (
          <DownloadWalletOption />
        ) : null}
        <OptionContainer gap="md" onClick={() => connect({ connector: uniswapWalletConnectConnector })}>
          <ScanQr size="$icon.40" minWidth={40} color="$accent1" backgroundColor="$accent2" borderRadius={8} p={7} />
          <Row gap="xs">
            <Column>
              <Text variant="buttonLabel3" color="$neutral1" whiteSpace="nowrap">
                <Trans i18nKey="common.uniswapMobile" />
              </Text>
              <Text variant="body4" color="$neutral2" whiteSpace="nowrap">
                <Trans i18nKey="wallet.scanToConnect" />
              </Text>
            </Column>
          </Row>
        </OptionContainer>
      </Column>
    </Column>
  )
}
