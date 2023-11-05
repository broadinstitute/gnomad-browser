import { describe, test, expect } from '@jest/globals'
import React from 'react'
import { render } from '@testing-library/react'
import {
  HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory,
  HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory,
} from '../__factories__/VariantCooccurrenceCountsPerSeverityAndAf'

import VariantCooccurrenceCountsTable from './VariantCooccurrenceCountsTable'
import { forDatasetsMatching, forDatasetsNotMatching } from '../../../tests/__helpers__/datasets'

const v2Regexp = /_r2/

forDatasetsNotMatching(
  v2Regexp,
  'VariantCoocurrenceCountsTable with non v2 dataset "%s"',
  (datasetId) => {
    test('has no unexpected changes and renders as placeholder text', () => {
      const heterozygousCounts =
        HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
      const homozygousCounts = HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
      const tableContent = render(
        <VariantCooccurrenceCountsTable
          datasetId={datasetId}
          heterozygous_variant_cooccurrence_counts={heterozygousCounts}
          homozygous_variant_cooccurrence_counts={homozygousCounts}
        />
      )
      const normalContentFragment = tableContent.asFragment()
      expect(normalContentFragment.querySelectorAll('p').length).toEqual(1)
      expect(normalContentFragment.querySelectorAll('table').length).toEqual(0)
      expect(normalContentFragment).toMatchSnapshot()
    })
  }
)

forDatasetsMatching(v2Regexp, 'VariantCoocurrenceCountsTable with v2 dataset "%s"', (datasetId) => {
  test('has no unexpected changes and renders as a table', () => {
    const heterozygousCounts = HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
    const homozygousCounts = HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
    const tableContent = render(
      <VariantCooccurrenceCountsTable
        datasetId={datasetId}
        heterozygous_variant_cooccurrence_counts={heterozygousCounts}
        homozygous_variant_cooccurrence_counts={homozygousCounts}
      />
    )
    const normalContentFragment = tableContent.asFragment()
    expect(normalContentFragment.querySelectorAll('p').length).toEqual(0)
    expect(normalContentFragment.querySelectorAll('table').length).toEqual(2)
    expect(normalContentFragment).toMatchSnapshot()
  })
})

describe('VariantCooccurrenceCountsTable', () => {
  test('renders correct data into correct table cells in both regular and extended mode', () => {
    const heterozygousCounts = HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
    const homozygousCounts = HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
    const tableContent = render(
      <VariantCooccurrenceCountsTable
        datasetId="gnomad_r2_1"
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
        datasetId="gnomad_r2_1"
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
