import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list'
import { graphql } from 'babel-plugin-relay/macro'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { View, ViewStyle } from 'react-native'
import { useLazyLoadQuery, usePaginationFragment } from 'react-relay'
import { useAppDispatch, useAppTheme } from 'src/app/hooks'
import { SWAP_BUTTON_HEIGHT } from 'src/app/navigation/TabBar'
import { useHomeStackNavigation } from 'src/app/navigation/types'
import NoNFTsIcon from 'src/assets/icons/empty-state-picture.svg'
import VerifiedIcon from 'src/assets/icons/verified.svg'
import { TouchableArea } from 'src/components/buttons/TouchableArea'
import { Suspense } from 'src/components/data/Suspense'
import { NftBalancesPaginationQuery } from 'src/components/home/__generated__/NftBalancesPaginationQuery.graphql'
import { NftsTabQuery } from 'src/components/home/__generated__/NftsTabQuery.graphql'
import {
  NftsTab_asset$data,
  NftsTab_asset$key,
} from 'src/components/home/__generated__/NftsTab_asset.graphql'
import { NFTViewer } from 'src/components/images/NFTViewer'
import { BaseCard } from 'src/components/layout/BaseCard'
import { Box } from 'src/components/layout/Box'
import { Flex } from 'src/components/layout/Flex'
import { TabViewScrollProps } from 'src/components/layout/screens/TabbedScrollScreen'
import { Loading } from 'src/components/loading'
import { ScannerModalState } from 'src/components/QRCodeScanner/constants'
import { Text } from 'src/components/Text'
import { EMPTY_ARRAY } from 'src/constants/misc'
import { openModal } from 'src/features/modals/modalSlice'
import { NFTItem } from 'src/features/nfts/types'
import { getNFTAssetKey } from 'src/features/nfts/utils'
import { ModalName } from 'src/features/telemetry/constants'
import { removePendingSession } from 'src/features/walletConnect/walletConnectSlice'
import { Screens } from 'src/screens/Screens'
import { formatNFTFloorPrice } from 'src/utils/format'

const MAX_NFT_IMAGE_SIZE = 375
const ESTIMATED_ITEM_SIZE = 100
const PREFETCH_ITEMS_THRESHOLD = 0.5
const LOADING_ITEM = 'loading'

const nftsTabPaginationQuery = graphql`
  fragment NftsTab_asset on Query
  @argumentDefinitions(after: { type: "String" })
  @refetchable(queryName: "NftBalancesPaginationQuery") {
    nftBalances(ownerAddress: $ownerAddress, first: $first, after: $after)
      @connection(key: "NftsTab__nftBalances") {
      edges {
        node {
          ownedAsset {
            id
            collection {
              name
              isVerified
              markets(currencies: [ETH]) {
                floorPrice {
                  value
                }
              }
            }
            image {
              url
            }
            name
            tokenId
            description
            nftContract {
              address
            }
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
        hasPreviousPage
        startCursor
      }
    }
  }
`
const nftsTabQuery = graphql`
  query NftsTabQuery($ownerAddress: String!, $first: Int!) {
    ...NftsTab_asset
  }
`

function formatNftItems(data: NftsTab_asset$data | null | undefined): NFTItem[] {
  const items = data?.nftBalances?.edges?.flatMap((item) => item.node)
  if (!items) return EMPTY_ARRAY
  const nfts = items
    .filter((item) => item?.ownedAsset?.nftContract?.address && item?.ownedAsset?.tokenId)
    .map((item): NFTItem => {
      return {
        name: item?.ownedAsset?.name ?? undefined,
        description: item?.ownedAsset?.description ?? undefined,
        contractAddress: item?.ownedAsset?.nftContract?.address ?? undefined,
        tokenId: item?.ownedAsset?.tokenId ?? undefined,
        imageUrl: item?.ownedAsset?.image?.url ?? undefined,
        collectionName: item?.ownedAsset?.collection?.name ?? undefined,
        isVerifiedCollection: item?.ownedAsset?.collection?.isVerified ?? undefined,
        floorPrice: item?.ownedAsset?.collection?.markets?.[0]?.floorPrice?.value ?? undefined,
      }
    })
  return nfts
}

const keyExtractor = (item: NFTItem | string) =>
  typeof item === 'string'
    ? LOADING_ITEM
    : getNFTAssetKey(item.contractAddress ?? '', item.tokenId ?? '')

export function NftsTab(props: {
  owner: string
  tabViewScrollProps?: TabViewScrollProps
  loadingContainerStyle?: ViewStyle
}) {
  return (
    <Suspense
      fallback={
        <View style={props.loadingContainerStyle}>
          <Flex pt="sm">
            <Loading repeat={6} type="nft" />
          </Flex>
        </View>
      }>
      <NftsTabInner {...props} />
    </Suspense>
  )
}

function NftsTabInner({
  owner,
  tabViewScrollProps,
  loadingContainerStyle,
}: {
  owner: string
  tabViewScrollProps?: TabViewScrollProps
  loadingContainerStyle?: ViewStyle
}) {
  const navigation = useHomeStackNavigation()
  const { t } = useTranslation()
  const theme = useAppTheme()
  const dispatch = useAppDispatch()

  const queryData = useLazyLoadQuery<NftsTabQuery>(
    nftsTabQuery,
    {
      ownerAddress: owner,
      first: 50,
    },
    // `NFTsTabQuery` has the same key as `PortfolioBalance`, which can cause
    // race conditions, where `PortfolioBalance` sends a network request first,
    // but does not pull NFT data. When `NFTsTabQuery` runs, it sees that a query
    // with the same key was executed recently, and does not try to send a request.
    // This change forces both a store lookup and a network request.
    // FIX(MOB-2498): possible fix is to use a fragment here.
    { fetchPolicy: 'store-and-network' }
  )

  const { data, loadNext, isLoadingNext, hasNext } = usePaginationFragment<
    NftBalancesPaginationQuery,
    NftsTab_asset$key
  >(nftsTabPaginationQuery, queryData)

  const nftDataItems = formatNftItems(data)
  const shouldAddInLoadingItem = isLoadingNext && nftDataItems.length % 2 === 1

  const onListEndReached = () => {
    if (!hasNext) return
    loadNext(50)
  }

  const onPressItem = useCallback(
    (asset: NFTItem) => {
      navigation.navigate(Screens.NFTItem, {
        owner: owner,
        address: asset.contractAddress ?? '',
        tokenId: asset.tokenId ?? '',
      })
    },
    [navigation, owner]
  )

  const onPressScan = () => {
    // in case we received a pending session from a previous scan after closing modal
    dispatch(removePendingSession())
    dispatch(
      openModal({ name: ModalName.WalletConnectScan, initialState: ScannerModalState.ScanQr })
    )
  }

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<string | NFTItem>) => {
      return typeof item === 'string' ? (
        <Loading repeat={1} type="nft" />
      ) : (
        <Box flex={1} justifyContent="flex-start" m="xs">
          <TouchableArea activeOpacity={1} onPress={() => onPressItem(item)}>
            <Box
              alignItems="center"
              aspectRatio={1}
              backgroundColor="backgroundOutline"
              borderRadius="md"
              // eslint-disable-next-line react-native/no-inline-styles
              style={{ overflow: 'hidden' }}
              width="100%">
              <NFTViewer
                maxHeight={MAX_NFT_IMAGE_SIZE}
                placeholderContent={item.name || item.collectionName}
                squareGridView={true}
                uri={item.imageUrl ?? ''}
              />
            </Box>
            <Flex gap="none" py="xs">
              <Text ellipsizeMode="tail" numberOfLines={1} variant="bodyLarge">
                {item.name}
              </Text>
              <Flex row alignItems="center" gap="xs" justifyContent="flex-start">
                <Flex row shrink>
                  <Text ellipsizeMode="tail" numberOfLines={1} variant="bodySmall">
                    {item.collectionName}
                  </Text>
                </Flex>
                {item.isVerifiedCollection && (
                  <VerifiedIcon color={theme.colors.userThemeMagenta} height={16} width={16} />
                )}
              </Flex>
              {item.floorPrice && (
                <Text
                  color="textSecondary"
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  variant="bodySmall">
                  {formatNFTFloorPrice(item.floorPrice)} ETH
                </Text>
              )}
            </Flex>
          </TouchableArea>
        </Box>
      )
    },
    [onPressItem, theme.colors.userThemeMagenta]
  )

  const footerHeight = useBottomTabBarHeight() + SWAP_BUTTON_HEIGHT

  return nftDataItems.length === 0 ? (
    <Flex centered flex={1} style={loadingContainerStyle}>
      <BaseCard.EmptyState
        buttonLabel={t('Receive NFTs')}
        description={t('Transfer NFTs from another wallet to get started.')}
        icon={<NoNFTsIcon color={theme.colors.textSecondary} />}
        title={t('No NFTs yet')}
        onPress={onPressScan}
      />
    </Flex>
  ) : (
    <Flex flexGrow={1} paddingHorizontal="xs" paddingTop="sm">
      <FlashList
        ref={tabViewScrollProps?.ref}
        ListFooterComponent={
          isLoadingNext ? <Loading repeat={4} type="nft" /> : <Box height={footerHeight} />
        }
        contentContainerStyle={tabViewScrollProps?.contentContainerStyle}
        data={shouldAddInLoadingItem ? [...nftDataItems, LOADING_ITEM] : nftDataItems}
        estimatedItemSize={ESTIMATED_ITEM_SIZE}
        keyExtractor={keyExtractor}
        numColumns={2}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        onEndReached={onListEndReached}
        onEndReachedThreshold={PREFETCH_ITEMS_THRESHOLD}
        onScroll={tabViewScrollProps?.onScroll}
      />
    </Flex>
  )
}
