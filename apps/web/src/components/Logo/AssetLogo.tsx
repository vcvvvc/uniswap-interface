import { Currency } from '@uniswap/sdk-core'
import { PortfolioLogo } from 'components/AccountDrawer/MiniPortfolio/PortfolioLogo'
import styled from 'lib/styled-components'
import React from 'react'
import { UniverseChainId } from 'uniswap/src/types/chains'

export const MissingImageLogo = styled.div<{ $size?: string; $textColor: string; $backgroundColor: string }>`
  --size: ${({ $size }) => $size};
  border-radius: 100px;
  color: ${({ $textColor }) => $textColor};
  background-color: ${({ $backgroundColor }) => $backgroundColor};
  font-size: calc(var(--size) / 3);
  font-weight: 535;
  height: ${({ $size }) => $size ?? '24px'};
  line-height: ${({ $size }) => $size ?? '24px'};
  text-align: center;
  width: ${({ $size }) => $size ?? '24px'};
  display: flex;
  align-items: center;
  justify-content: center;
`

export type AssetLogoBaseProps = {
  symbol?: string | null
  primaryImg?: string | null
  size?: number
  style?: React.CSSProperties
  currency?: Currency | null
  loading?: boolean
}
type AssetLogoProps = AssetLogoBaseProps & { isNative?: boolean; address?: string | null; chainId?: number }

const LogoContainer = styled.div`
  position: relative;
  display: flex;
`

/**
 * Renders an image by prioritizing a list of sources, and then eventually a fallback triangle alert
 */
export default function AssetLogo({
  currency,
  chainId = UniverseChainId.Mainnet,
  size = 24,
  style,
  loading,
}: AssetLogoProps) {
  return (
    <LogoContainer style={{ height: size, width: size, ...style }}>
      <PortfolioLogo currencies={currency ? [currency] : []} size={size} chainId={chainId} loading={loading} />
    </LogoContainer>
  )
}
