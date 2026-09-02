import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import geneFactory from '../__factories__/Gene'

const queryProps: any[] = []
const unifiedViewProps: any[] = []

jest.mock('../Query', () => (props: any) => {
  queryProps.push(props)
  return props.children({
    data: {
      meta: { clinvar_release_date: '2026-01-01' },
      long_read_y1_provenance: { enabled: true, sources: [] },
      region: {
        long_read_variants: [
          { variant_id: '22-130-A-T', major_consequence: 'intron_variant' },
          { variant_id: '22-170-G-C', major_consequence: 'non_coding_transcript_variant' },
        ],
      },
    },
    requestVariables: props.variables,
    stale: false,
  })
})
jest.mock(
  '../RequestRevalidationFrame',
  () =>
    ({ children }: any) =>
      children
)
jest.mock('../LongReadVariantPage/LongReadUnifiedView', () => (props: any) => {
  unifiedViewProps.push(props)
  return <div data-testid="long-read-view" />
})

// Jest mocks must be registered before importing the component under test.
// eslint-disable-next-line import/first
import LongReadVariantsInGene from './LongReadVariantsInGene'

describe('LongReadVariantsInGene', () => {
  beforeEach(() => {
    queryProps.length = 0
    unifiedViewProps.length = 0
  })

  test('loads the full gene span through the region API with parity behavior', () => {
    const gene = geneFactory.build({
      gene_id: 'ENSG1',
      chrom: '22',
      start: 100,
      stop: 200,
      reference_genome: 'GRCh38',
    })
    const onChangeLrCohort = jest.fn()

    render(
      <MemoryRouter
        initialEntries={['/gene/ENSG1?dataset=gnomad_r4_lr&lr_cohort=aou&variant_id=22-150-A%3ET']}
      >
        <LongReadVariantsInGene
          datasetId={'gnomad_r4_lr' as any}
          gene={gene}
          zoomRegion={{ start: 120, stop: 180 }}
          onChangeZoomRegion={jest.fn()}
          onSetRegion={jest.fn()}
          lrCohort="aou"
          onChangeLrCohort={onChangeLrCohort}
          onGenealogyPanelVisibilityChange={jest.fn()}
        />
      </MemoryRouter>
    )

    expect(screen.getByTestId('long-read-view')).not.toBeNull()
    expect(queryProps).toHaveLength(1)
    expect(queryProps[0]).toMatchObject({
      operationName: 'LongReadVariantsInGene',
      retainPreviousData: true,
      variables: {
        datasetId: 'gnomad_r4_lr',
        lrCohort: 'aou',
        chrom: '22',
        start: 100,
        stop: 200,
        referenceGenome: 'GRCh38',
      },
    })
    expect(queryProps[0].query).toContain(
      'region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome)'
    )
    expect(queryProps[0].query).toContain(
      'long_read_variants(dataset: $datasetId, lr_cohort: $lrCohort)'
    )
    expect(queryProps[0].query).toContain('tr_locus_presentation')
    expect(queryProps[0].query).toContain('tr_locus_bounds')
    expect(queryProps[0].query).toContain('tr_locus_component_summary')
    expect(queryProps[0].query).not.toContain('gene(gene_id:')
    expect(queryProps[0].query).not.toMatch(/\n\s+variants\(dataset:/)

    expect(unifiedViewProps).toHaveLength(1)
    expect(unifiedViewProps[0]).toMatchObject({
      datasetId: 'gnomad_r4_lr',
      gene,
      variants: [
        { variant_id: '22-130-A-T', major_consequence: 'intron_variant' },
        { variant_id: '22-170-G-C', major_consequence: 'non_coding_transcript_variant' },
      ],
      variantSearch: '22-150-A>T',
      lrCohort: 'aou',
      onChangeLrCohort,
      provenance: { enabled: true, sources: [] },
      clinvarReleaseDate: '2026-01-01',
      genes: [gene],
      zoomRegion: { start: 120, stop: 180 },
    })
  })
})
