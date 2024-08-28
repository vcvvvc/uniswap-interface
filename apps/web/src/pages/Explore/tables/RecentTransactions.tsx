import { ApolloError } from '@apollo/client'
import { createColumnHelper } from '@tanstack/react-table'
import Row from 'components/Row'
import { Table } from 'components/Table'
import { Cell } from 'components/Table/Cell'
import { Filter } from 'components/Table/Filter'
import {
  FilterHeaderRow,
  HeaderArrow,
  HeaderSortText,
  StyledExternalLink,
  TimestampCell,
  TokenLinkCell,
} from 'components/Table/styled'
import { useChainFromUrlParam } from 'constants/chains'
import { useUpdateManualOutage } from 'featureFlags/flags/outageBanner'
import { BETypeToTransactionType, TransactionType, useAllTransactions } from 'graphql/data/useAllTransactions'
import { OrderDirection, getSupportedGraphQlChain } from 'graphql/data/util'
import { useActiveLocalCurrency } from 'hooks/useActiveLocalCurrency'
import { useMemo, useReducer, useState } from 'react'
import { ThemedText } from 'theme/components'
import { Text } from 'ui/src'
import {
  PoolTransaction,
  PoolTransactionType,
} from 'uniswap/src/data/graphql/uniswap-data-api/__generated__/types-and-hooks'
import { Trans } from 'uniswap/src/i18n'
import { shortenAddress } from 'utilities/src/addresses'
import { useFormatter } from 'utils/formatNumbers'
import { ExplorerDataType, getExplorerLink } from 'utils/getExplorerLink'

export default function RecentTransactions() {
  const activeLocalCurrency = useActiveLocalCurrency()
  const { formatNumber, formatFiatPrice } = useFormatter()
  const [filterModalIsOpen, toggleFilterModal] = useReducer((s) => !s, false)
  const [filter, setFilters] = useState<TransactionType[]>([
    TransactionType.SWAP,
    TransactionType.REMOVE,
    TransactionType.ADD,
  ])
  const chain = getSupportedGraphQlChain(useChainFromUrlParam(), { fallbackToEthereum: true })

  const { transactions, loading, loadMore, errorV2, errorV3 } = useAllTransactions(chain.backendChain.chain, filter)
  const combinedError =
    errorV2 && errorV3
      ? new ApolloError({ errorMessage: `Could not retrieve V2 and V3 Transactions for chain: ${chain.id}` })
      : undefined
  const allDataStillLoading = loading && !transactions.length
  const showLoadingSkeleton = allDataStillLoading || !!combinedError
  useUpdateManualOutage({ chainId: chain.id, errorV3, errorV2 })
  // TODO(WEB-3236): once GQL BE Transaction query is supported add usd, token0 amount, and token1 amount sort support
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<PoolTransaction>()
    return [
      columnHelper.accessor((transaction) => transaction, {
        id: 'timestamp',
        header: () => (
          <Cell minWidth={120} justifyContent="flex-start" grow>
            <Row gap="4px">
              <HeaderArrow direction={OrderDirection.Desc} />
              <HeaderSortText $active>
                <Trans i18nKey="common.time" />
              </HeaderSortText>
            </Row>
          </Cell>
        ),
        cell: (transaction) => (
          <Cell loading={showLoadingSkeleton} minWidth={120} justifyContent="flex-start" grow>
            <TimestampCell
              timestamp={Number(transaction.getValue?.().timestamp)}
              link={getExplorerLink(chain.id, transaction.getValue?.().hash, ExplorerDataType.TRANSACTION)}
            />
          </Cell>
        ),
      }),
      columnHelper.accessor((transaction) => transaction, {
        id: 'swap-type',
        header: () => (
          <Cell minWidth={276} justifyContent="flex-start" grow>
            <FilterHeaderRow modalOpen={filterModalIsOpen} onClick={() => toggleFilterModal()}>
              <Filter
                allFilters={Object.values(TransactionType)}
                activeFilter={filter}
                setFilters={setFilters}
                isOpen={filterModalIsOpen}
                toggleFilterModal={toggleFilterModal}
                isSticky={true}
              />
              <ThemedText.BodySecondary>
                <Trans i18nKey="common.type.label" />
              </ThemedText.BodySecondary>
            </FilterHeaderRow>
          </Cell>
        ),
        cell: (transaction) => {
          const amountWithSymbolA = (
            <>
              <ThemedText.BodySecondary>
                {BETypeToTransactionType[transaction.getValue?.().type]}
              </ThemedText.BodySecondary>
              <TokenLinkCell token={transaction.getValue?.().token0} />
            </>
          )
          const amountWithSymbolB = <TokenLinkCell token={transaction.getValue?.().token1} />

          return (
            <Cell loading={showLoadingSkeleton} minWidth={276} justifyContent="flex-start" grow>
              <Text variant="body2" display="flex" flexDirection="row" gap="$spacing8">
                {transaction.getValue?.().type === PoolTransactionType.Swap ? (
                  <Trans
                    i18nKey="activity.transaction.swap.descriptor.formatted"
                    components={{
                      amountWithSymbolA,
                      amountWithSymbolB,
                    }}
                  />
                ) : (
                  <Trans
                    i18nKey="activity.transaction.tokens.descriptor.formatted"
                    components={{
                      amountWithSymbolA,
                      amountWithSymbolB,
                    }}
                  />
                )}
              </Text>
            </Cell>
          )
        },
      }),
      columnHelper.accessor((transaction) => transaction.usdValue.value, {
        id: 'fiat-value',
        header: () => (
          <Cell minWidth={125}>
            <ThemedText.BodySecondary>{activeLocalCurrency}</ThemedText.BodySecondary>
          </Cell>
        ),
        cell: (fiat) => (
          <Cell loading={showLoadingSkeleton} minWidth={125}>
            <ThemedText.BodyPrimary>{formatFiatPrice({ price: fiat.getValue?.() })}</ThemedText.BodyPrimary>
          </Cell>
        ),
      }),
      columnHelper.accessor((transaction) => transaction, {
        id: 'token-amount-0',
        header: () => (
          <Cell minWidth={200}>
            <ThemedText.BodySecondary>
              <Trans i18nKey="common.tokenAmount" />
            </ThemedText.BodySecondary>
          </Cell>
        ),
        cell: (transaction) => (
          <Cell loading={showLoadingSkeleton} minWidth={200}>
            <Row gap="8px" justify="flex-end">
              <ThemedText.BodyPrimary>
                {formatNumber({
                  input: Math.abs(parseFloat(transaction.getValue?.().token0Quantity)) || 0,
                })}
              </ThemedText.BodyPrimary>
              <TokenLinkCell token={transaction.getValue?.().token0} />
            </Row>
          </Cell>
        ),
      }),
      columnHelper.accessor((transaction) => transaction, {
        id: 'token-amount-1',
        header: () => (
          <Cell minWidth={200}>
            <ThemedText.BodySecondary>
              <Trans i18nKey="common.tokenAmount" />
            </ThemedText.BodySecondary>
          </Cell>
        ),
        cell: (transaction) => (
          <Cell loading={showLoadingSkeleton} minWidth={200}>
            <Row gap="8px" justify="flex-end">
              <ThemedText.BodyPrimary>
                {formatNumber({
                  input: Math.abs(parseFloat(transaction.getValue?.().token1Quantity)) || 0,
                })}
              </ThemedText.BodyPrimary>
              <TokenLinkCell token={transaction.getValue?.().token1} />
            </Row>
          </Cell>
        ),
      }),
      columnHelper.accessor((transaction) => transaction.account, {
        id: 'maker-address',
        header: () => (
          <Cell minWidth={150}>
            <ThemedText.BodySecondary>
              <Trans i18nKey="common.wallet.label" />
            </ThemedText.BodySecondary>
          </Cell>
        ),
        cell: (makerAddress) => (
          <Cell loading={showLoadingSkeleton} minWidth={150}>
            <StyledExternalLink href={getExplorerLink(chain.id, makerAddress.getValue?.(), ExplorerDataType.ADDRESS)}>
              {shortenAddress(makerAddress.getValue?.())}
            </StyledExternalLink>
          </Cell>
        ),
      }),
    ]
  }, [activeLocalCurrency, chain.id, filter, filterModalIsOpen, formatFiatPrice, formatNumber, showLoadingSkeleton])

  return (
    <Table
      columns={columns}
      data={transactions}
      loading={allDataStillLoading}
      error={combinedError}
      loadMore={loadMore}
      maxWidth={1200}
    />
  )
}
