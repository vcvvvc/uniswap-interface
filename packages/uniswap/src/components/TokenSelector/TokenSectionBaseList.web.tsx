import isEqual from 'lodash/isEqual'
import React, { CSSProperties, Key, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { VariableSizeList as List } from 'react-window'
import { Flex, useWindowDimensions } from 'ui/src'
import { zIndices } from 'ui/src/theme'
import {
  ItemRowInfo,
  SectionRowInfo,
  TokenSectionBaseListProps,
} from 'uniswap/src/components/TokenSelector/TokenSectionBaseList'

const ITEM_ROW_HEIGHT = 72
const ITEM_SECTION_HEADER_ROW_HEIGHT = 40

type BaseListRowInfo = {
  key: Key | undefined
}
type BaseListSectionRowInfo = SectionRowInfo & BaseListRowInfo & Pick<TokenSectionBaseListProps, 'renderSectionHeader'>
type BaseListItemRowInfo = ItemRowInfo & BaseListRowInfo & Pick<TokenSectionBaseListProps, 'renderItem'>

type BaseListData = BaseListItemRowInfo | BaseListSectionRowInfo

function isSectionHeader(rowInfo: BaseListSectionRowInfo | BaseListItemRowInfo): rowInfo is BaseListSectionRowInfo {
  return !('renderItem' in rowInfo)
}

export function TokenSectionBaseList({
  ListEmptyComponent,
  keyExtractor,
  renderItem,
  renderSectionHeader,
  sections,
  sectionListRef,
}: TokenSectionBaseListProps): JSX.Element {
  const ref = useRef<List>(null)
  const rowHeightMap = useRef<{ [key: number]: number }>({})
  const [firstVisibleIndex, setFirstVisibleIndex] = useState(-1)
  const { width: windowWidth } = useWindowDimensions()

  useEffect(() => {
    if (sectionListRef) {
      sectionListRef.current = {
        scrollToLocation: ({ itemIndex, sectionIndex }): void => {
          let listIndex = 0
          for (let i = 0; i < sectionIndex; i++) {
            const section = sections[i]
            listIndex += section?.data?.length ?? 0
          }
          listIndex += itemIndex

          ref.current?.scrollToItem(listIndex)
        },
      }
    }
  }, [sectionListRef, sections])

  const items = useMemo(() => {
    return sections.reduce((acc: BaseListData[], section) => {
      const sectionInfo: BaseListSectionRowInfo = {
        section: { sectionKey: section.sectionKey, rightElement: section.rightElement },
        key: section.sectionKey,
        renderSectionHeader,
      }
      acc.push(sectionInfo)

      return acc.concat(
        section.data.map((item, index) => {
          const itemInfo: BaseListItemRowInfo = {
            item,
            section,
            index,
            key: keyExtractor?.(item, index),
            renderItem,
          }
          return itemInfo
        }),
      )
    }, [])
  }, [sections, renderSectionHeader, keyExtractor, renderItem])

  const activeSessionIndex = useMemo(() => {
    return items.slice(0, firstVisibleIndex + 1).findLastIndex((item) => isSectionHeader(item))
  }, [firstVisibleIndex, items])

  useEffect(() => {
    rowHeightMap.current = {}
  }, [items])

  const updateRowHeight = useCallback((index: number, height: number) => {
    if (rowHeightMap.current[index] !== height) {
      rowHeightMap.current[index] = height
      ref.current?.resetAfterIndex(index)
    }
  }, [])

  const getRowHeight = useCallback(
    (index: number): number => {
      const item = items[index]
      const measuredHeight = rowHeightMap.current[index]

      if (!item) {
        return 0
      } else if (measuredHeight) {
        return measuredHeight
      }

      return isSectionHeader(item) ? ITEM_SECTION_HEADER_ROW_HEIGHT : ITEM_ROW_HEIGHT
    },
    [items],
  )

  const ListContent = useCallback(
    ({ data, index, style }: { data: BaseListData[]; index: number; style: CSSProperties }) => {
      return (
        <TokenSectionBaseListRow
          data={data}
          index={index}
          style={style}
          updateRowHeight={updateRowHeight}
          windowWidth={windowWidth}
        />
      )
    },
    [updateRowHeight, windowWidth],
  )

  return (
    <Flex grow>
      {!sections.length && ListEmptyComponent}
      <AutoSizer disableWidth>
        {({ height }: { height: number }): JSX.Element => {
          return (
            <Flex style={{ position: 'relative' }}>
              <Flex
                backgroundColor="$surface1"
                style={{ position: 'absolute', top: 0, zIndex: zIndices.sticky, width: '100%' }}
              >
                {activeSessionIndex >= 0 && (
                  <TokenSectionBaseListRow data={items} index={activeSessionIndex} windowWidth={windowWidth} />
                )}
              </Flex>
              <List
                ref={ref}
                height={height}
                itemCount={items.length}
                itemData={items}
                itemSize={getRowHeight}
                width="100%"
                onItemsRendered={({ visibleStartIndex }): void => {
                  setFirstVisibleIndex(visibleStartIndex)
                }}
              >
                {ListContent}
              </List>
            </Flex>
          )
        }}
      </AutoSizer>
    </Flex>
  )
}

function TokenSectionBaseListRow({
  index,
  data,
  style,
  windowWidth,
  updateRowHeight,
}: {
  index: number
  data: BaseListData[]
  style?: CSSProperties
  windowWidth: number
  updateRowHeight?: (index: number, height: number) => void
}): JSX.Element {
  const itemData = data[index]

  return (
    <>
      {itemData && (
        <Row
          index={index}
          itemData={itemData}
          style={style}
          updateRowHeight={updateRowHeight}
          windowWidth={windowWidth}
        />
      )}
    </>
  )
}

type RowProps = {
  index: number
  itemData: BaseListItemRowInfo | BaseListSectionRowInfo
  style?: CSSProperties
  windowWidth: number
  updateRowHeight?: (index: number, height: number) => void
}
function _Row({ index, itemData, style, windowWidth, updateRowHeight }: RowProps): JSX.Element {
  const rowRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // We need to run this in the next tick to get the correct height.
    setTimeout(() => {
      const height = rowRef.current?.getBoundingClientRect().height
      if (!height || !updateRowHeight) {
        return
      }
      updateRowHeight(index, height)
    }, 0)
  }, [updateRowHeight, index, windowWidth, itemData.key])

  return (
    <Flex key={itemData?.key ?? index} style={style}>
      <Flex ref={rowRef}>
        {itemData &&
          (isSectionHeader(itemData) ? itemData.renderSectionHeader?.(itemData) : itemData.renderItem(itemData))}
      </Flex>
    </Flex>
  )
}

const Row = React.memo(_Row, isEqual)
