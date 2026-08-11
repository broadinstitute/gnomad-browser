import { expect, test } from '@jest/globals'
import 'jest-styled-components'

import React from 'react'
import renderer from 'react-test-renderer'
import DatasetSelector, { sanitizeDatasetSearch } from './DatasetSelector'

import { forAllDatasets } from '../../tests/__helpers__/datasets'
import { BrowserRouter } from 'react-router-dom'

const textContent = (node: renderer.ReactTestInstance): string =>
  node.children
    .map((child) => (typeof child === 'string' ? child : textContent(child)))
    .join('')

describe('dataset URL sanitizer', () => {
  test('preserves only sanitized variant search for compatible datasets', () => {
    const search = sanitizeDatasetSearch(
      '?dataset=gnomad_r4_lr&variant_id=%00chr22%3A100%20A%3ET%0A&lr_cohort=aou&show_haplotypes=true&show_tree=true&methylation_sample=HG001&show_methylation=true&filter=PASS&other=unsafe',
      'gnomad_r4'
    )
    const params = new URLSearchParams(search)

    expect(Object.fromEntries(params.entries())).toEqual({
      dataset: 'gnomad_r4',
      variant_id: 'chr22:100 A>T',
    })
  })

  test('clears variant and LR-only state for an incompatible structural-variant dataset', () => {
    const search = sanitizeDatasetSearch(
      '?variant_id=22-100-A-T&lr_cohort=hgsvc_hprc&show_haplotypes=true&show_tree=true&show_per_copy_methylation=true&methylation=true',
      'gnomad_sv_r4'
    )

    expect(Object.fromEntries(new URLSearchParams(search).entries())).toEqual({
      dataset: 'gnomad_sv_r4',
    })
  })
})

test('identifies the long-read dataset in the top-level selector', () => {
  const tree = renderer.create(
    <BrowserRouter>
      <DatasetSelector selectedDataset="gnomad_r4_lr" datasetOptions={{}} />
    </BrowserRouter>
  )
  const selectedDatasetLink = tree.root.find(
    (node) => node.type === 'a' && node.props['data-item'] === 'current_short_variant'
  )

  expect(textContent(selectedDatasetLink)).toBe('gnomAD v4.1.1 (long reads)')
  expect(selectedDatasetLink.props.href).toBe('/?dataset=gnomad_r4_lr')
})

forAllDatasets('DataSelector with "%s" dataset selected', (datasetId) => {
  test('has no unexpected changes', () => {
    const tree = renderer.create(
      <BrowserRouter>
        <DatasetSelector selectedDataset={datasetId} datasetOptions={{}} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })

  test('has no unexpected changes when showing all possible datasets', () => {
    const tree = renderer.create(
      <BrowserRouter>
        <DatasetSelector
          selectedDataset={datasetId}
          datasetOptions={{
            includeShortVariants: true,
            includeStructuralVariants: true,
            includeExac: true,
            includeGnomad2: true,
            includeGnomad2Subsets: true,
            includeGnomad3: true,
            includeGnomad3Subsets: true,
            includeCopyNumberVariants: true,
            includeGnomad4: true,
          }}
        />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})
