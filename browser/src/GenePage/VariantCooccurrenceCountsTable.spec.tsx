import { describe, test, expect } from '@jest/globals'
import React from 'react'
import { render } from '@testing-library/react'
import {
  HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory,
  HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory,
} from '../__factories__/VariantCooccurrenceCountsPerSeverityAndAf'

import VariantCooccurrenceCountsTable from './VariantCooccurrenceCountsTable'

describe('VariantCooccurrenceCountsTable', () => {
  test('renders correct data into correct table cells in both regular and extended mode', () => {
    const heterozygousCounts = HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
    const homozygousCounts = HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
    const tableContent = render(
      <VariantCooccurrenceCountsTable
        heterozygous_variant_cooccurrence_counts={heterozygousCounts}
        homozygous_variant_cooccurrence_counts={homozygousCounts}
      />
    )
    const normalContentFragment = tableContent.asFragment()
    const tables = normalContentFragment.querySelectorAll('table')
    expect(tables.length).toEqual(2)
    const [normalHeterozygousTable, homozygousTable] = tables
    expect(normalHeterozygousTable.querySelectorAll('td').length).toEqual(24)
    expect(homozygousTable.querySelectorAll('td').length).toEqual(24)
    expect(normalContentFragment).toMatchSnapshot()

    const expandButton = tableContent.getByText('expand')
    expandButton.click()

    const expandedTableFragment = tableContent.asFragment()
    expect(expandedTableFragment.querySelectorAll('td').length).toEqual(66)
    expect(expandedTableFragment).toMatchSnapshot()

    const collapseButton = tableContent.getByText('collapse')
    collapseButton.click()
    const collapsedTableFragment = tableContent.asFragment()
    expect(collapsedTableFragment).toEqual(normalContentFragment)
  })

  test('fills in missing data with zeroes', () => {
    const tableContent = render(
      <VariantCooccurrenceCountsTable
        heterozygous_variant_cooccurrence_counts={{}}
        homozygous_variant_cooccurrence_counts={{}}
      />
    )
    const normalContentFragment = tableContent.asFragment()
    const tables = normalContentFragment.querySelectorAll('table')
    expect(tables.length).toEqual(2)
    const [normalHeterozygousTable, homozygousTable] = tables
    expect(normalHeterozygousTable.querySelectorAll('td').length).toEqual(24)
    expect(homozygousTable.querySelectorAll('td').length).toEqual(24)
    expect(normalContentFragment).toMatchSnapshot()

    const expandButton = tableContent.getByText('expand')
    expandButton.click()

    const expandedTableFragment = tableContent.asFragment()
    expect(expandedTableFragment.querySelectorAll('td').length).toEqual(66)
    expect(expandedTableFragment).toMatchSnapshot()

    const collapseButton = tableContent.getByText('collapse')
    collapseButton.click()
    const collapsedTableFragment = tableContent.asFragment()
    expect(collapsedTableFragment).toEqual(normalContentFragment)
  })
})
