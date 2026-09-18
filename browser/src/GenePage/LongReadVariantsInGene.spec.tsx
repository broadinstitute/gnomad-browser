import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { LongReadTrTableCatalogRow } from '@gnomad/dataset-metadata/longReadTrCatalogContext'

import geneFactory from '../__factories__/Gene'

const queryProps: any[] = []
const unifiedViewProps: any[] = []
const mockCatalogRow: LongReadTrTableCatalogRow & { variant_id: string } = {
  variant_id: 'RFC1-source-alt-1',
  tr_locus_id: '4-39348424-39348479-AAAAG',
  data_source: 'Y1_ACCEPTED',
  reference_genome: 'GRCh38',
  lr_cohort: 'aou',
  source_release: 'row-release',
  source_run_id: 'row-run',
  tr_locus_short_read_context: {
    status: 'EXACT_UNIQUE',
    reason_code: null,
    catalog_dataset: 'gnomad_r4',
    catalog_source: 'frozen-catalog',
    catalog_digest: 'a'.repeat(64),
    catalog_record: {
      id: 'RFC1',
      reference_repeat_unit: 'AAAAG',
      main_reference_region: {
        reference_genome: 'GRCh38',
        chrom: '4',
        start: 39348425,
        stop: 39348479,
      },
      repeat_units: [{ repeat_unit: 'AAGGG', classification: 'pathogenic' }],
    },
    matched_component_index: 0,
    matched_component: { chrom: '4', start0: 39348424, end0: 39348479, motif: 'AAAAG' },
    matched_reference_region_index: 0,
    lr_database: 'source-database',
    // Deliberately different: forwarding must never replace expected row provenance
    // with self-authorizing context values. Phase 3 must reject this stale context.
    lr_release: 'context-release',
    lr_run_id: 'context-run',
    lr_cohort: 'aou',
  },
}

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
          mockCatalogRow,
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
    expect(queryProps[0].query).not.toContain('tr_locus_component_summary')
    expect(queryProps[0].query).toContain('tr_locus_short_read_context')
    expect(queryProps[0].query).toContain(
      'data_source source_release source_run_id reference_genome'
    )
    expect(queryProps[0].query).toContain('repeat_units { repeat_unit classification }')
    // None of the full-page/diagnostic/optional measurement surfaces enter this query.
    expect(queryProps[0].query).not.toMatch(
      /associated_diseases|candidates|primary_repeat|primary_motif|distributions|source_alleles/
    )
    expect(queryProps[0].query).not.toContain('gene(gene_id:')
    expect(queryProps[0].query).not.toMatch(/\n\s+variants\(dataset:/)

    expect(unifiedViewProps).toHaveLength(1)
    expect(unifiedViewProps[0]).toMatchObject({
      datasetId: 'gnomad_r4_lr',
      gene,
      variants: [
        { variant_id: '22-130-A-T', major_consequence: 'intron_variant' },
        { variant_id: '22-170-G-C', major_consequence: 'non_coding_transcript_variant' },
        mockCatalogRow,
      ],
      variantSearch: '22-150-A>T',
      lrCohort: 'aou',
      onChangeLrCohort,
      provenance: { enabled: true, sources: [] },
      clinvarReleaseDate: '2026-01-01',
      genes: [gene],
      zoomRegion: { start: 120, stop: 180 },
    })
    expect(unifiedViewProps[0].variants[2]).toBe(mockCatalogRow)
    expect(unifiedViewProps[0].variants[2].source_run_id).toBe('row-run')
    expect(unifiedViewProps[0].variants[2].source_release).toBe('row-release')
  })
})
