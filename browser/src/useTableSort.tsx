import React, { useCallback, useState, ReactNode } from 'react'
import { TooltipAnchor, TooltipHint } from '@gnomad/ui'

export type RowCompareFunction<RowData> = (a: RowData, b: RowData) => number

export type ColumnSpecifier<RowData> = {
  key: keyof RowData
  label: string
  tooltip: string | null
  compareValueFunction: RowCompareFunction<RowData>
}

const renderColumnHeader = <RowData,>(
  key: keyof RowData,
  sortBy: keyof RowData,
  setSortBy: (key: keyof RowData) => void,
  sortAscending: boolean,
  label: string,
  tooltip: string | null
) => {
  let ariaSortAttr: React.AriaAttributes['aria-sort'] = 'none'
  if (sortBy === key) {
    ariaSortAttr = sortAscending ? 'ascending' : 'descending'
  }

  return tooltip ? (
    <th aria-sort={ariaSortAttr} scope="col">
      {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message */}
      <TooltipAnchor tooltip={tooltip}>
        <button type="button" onClick={() => setSortBy(key)}>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <TooltipHint>{label}</TooltipHint>
        </button>
      </TooltipAnchor>
    </th>
  ) : (
    <th aria-sort={ariaSortAttr} scope="col">
      <button type="button" onClick={() => setSortBy(key)}>
        {label}
      </button>
    </th>
  )
}

const useTableSort = <RowData,>(
  columnSpecifiers: ColumnSpecifier<RowData>[],
  defaultSortKey: keyof RowData,
  rowData: RowData[]
): { headers: ReactNode; sortedRowData: RowData[] } => {
  const [key, setKey] = useState<keyof RowData>(defaultSortKey)
  const [ascending, setAscending] = useState<boolean>(false)

  const setSortKey = useCallback(
    (newKey: keyof RowData) => {
      setKey(newKey)
      setAscending(newKey === key ? !ascending : false)
    },
    [key, ascending]
  )

  const { compareValueFunction } = columnSpecifiers.find((column) => column.key === key)!
  const sortedRowData = [...rowData].sort((a, b) => {
    const ascendingCompare = compareValueFunction(a, b)
    return ascending ? ascendingCompare : -ascendingCompare
  })

  const headers = (
    <>
      {columnSpecifiers.map((columnSpecifier) =>
        renderColumnHeader(
          columnSpecifier.key,
          key,
          setSortKey,
          ascending,
          columnSpecifier.label,
          columnSpecifier.tooltip
        )
      )}
    </>
  )
  return { headers, sortedRowData }
}

type Holder<Key extends string, Value> = {
  [K in Key]: Value
}

type NumberHolder<Key extends string> = Holder<Key, number>
type StringHolder<Key extends string> = Holder<Key, string>

export const numericCompareFunction =
  <Key extends string>(key: Key) =>
  <RowData extends NumberHolder<Key>>(a: RowData, b: RowData) =>
    a[key] - b[key]

export const stringCompareFunction =
  <Key extends string>(key: Key) =>
  <RowData extends StringHolder<Key>>(a: RowData, b: RowData) =>
    b[key].toLowerCase().localeCompare(a[key].toLowerCase())

export default useTableSort
