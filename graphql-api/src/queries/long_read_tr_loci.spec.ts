import { jest } from '@jest/globals'

const mockQuery = jest.fn()
jest.mock('../clickhouse', () => ({
  y1ClickhouseClient: { query: (...args: any[]) => mockQuery(...args) },
}))
jest.mock('../cache', () => ({ withCache: (fn: any) => fn }))

// The ClickHouse mock must be installed before this module initializes its client.
// eslint-disable-next-line import/first
import {
  buildCanonicalAlleleStratifiedView,
  buildLongReadTrComponentContract,
  buildLongReadTrFilterContract,
  buildLongReadTrPresentation,
  buildRepresentedLengthContract,
  buildSequenceCardinality,
  buildWholeRecordAlleleLandscape,
  buildWholeRecordGenotypeLandscape,
  certifySoleAncestryControlRedundant,
  countUniqueExactAltBytes,
  decodeTrAlleleCursor,
  encodeTrAlleleCursor,
  fetchLongReadTrLocus,
  longReadTrLocusCacheKey,
  MAX_TR_LOCUS_AGGREGATE_BYTES,
  MAX_TR_LOCUS_PAGE_SIZE,
  MAX_TR_SELECTED_ALLELE_DETAIL_BYTES,
} from './long_read_tr_loci'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const phase0Fixture = require('./__fixtures__/ben-round-two-tr-phase0.json')

const httLocusId =
  '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG'
const httSourceTrid = httLocusId.split('+').join(',')
const sourceVariantId = 'chr4-3074876-TRV-164'

const source = (
  cohort: 'hgsvc_hprc' | 'aou',
  options: { carriers?: boolean; metadata?: boolean } = {}
) => ({
  database: 'test',
  release: 'y1',
  cohort,
  reference_genome: 'GRCh38',
  chrom: 'chr4',
  load_scope: 'full_chromosome',
  run_id: `run-${cohort}`,
  state: 'accepted_frozen' as const,
  metadata_run_id: options.metadata ? 'metadata-1' : null,
  carriers_available: options.carriers ?? cohort === 'hgsvc_hprc',
})

const result = (rows: any[]) => Promise.resolve({ json: async () => rows })

const compactAlleles = (altCount: number, an: number) =>
  Array.from({ length: altCount }, (_, offset) => {
    let alleleLength = offset - 20
    let ac = 1
    if (altCount === 72) {
      alleleLength = 0
      ac = 0
      if (offset === 0) {
        alleleLength = -24
        ac = 292
      } else if (offset === 71) {
        alleleLength = 48
        ac = 264
      }
    }
    return {
      task_id: 'task-1',
      attempt_id: 'attempt-1',
      source_variant_id: sourceVariantId,
      alt_index: offset + 1,
      ref_allele: `A${'C'.repeat(164)}`,
      alt: `A${'C'.repeat(164 + alleleLength)}`,
      allele_length: alleleLength,
      length_provenance: 'sequence_derived',
      ac,
      an,
      af: ac / an,
    }
  })

const summary = (altCount: number, an: number) => {
  const purity = new Array(altCount + 1).fill(null)
  purity[altCount] = 0.97
  const ac = new Array(altCount).fill(altCount === 72 ? 0 : 1)
  if (altCount === 72) {
    ac[0] = 292
    ac[71] = 264
  }
  return {
    task_id: 'task-1',
    attempt_id: 'attempt-1',
    position: 3074876,
    source_variant_id: sourceVariantId,
    alt_count: altCount,
    ac,
    an,
    af: ac.map((value) => value / an),
    source_info_json: JSON.stringify({
      TRID: httSourceTrid,
      MOTIFS: 'CAA,CCG,CCT,CAG,GCC',
      STRUC: '<VC172773>',
      AP_allele: purity,
      SOURCE: 'TRGT',
    }),
  }
}

const selectedAlt72 = {
  source_variant_id: sourceVariantId,
  alt_index: 72,
  ref_allele: `A${'C'.repeat(164)}`,
  alt: `A${'C'.repeat(212)}`,
  allele_length: 48,
  ac: 264,
  an: 584,
  af: 264 / 584,
  rsids: ['rs-test'],
  filters: [],
  cadd_phred: null,
  phylop: null,
  major_consequence: 'intron_variant',
  short_read_match_id: null,
  short_read_match_type: null,
  short_read_match_source: null,
}

describe('long-read TR locus query contract', () => {
  beforeEach(() => mockQuery.mockReset())

  test('uses versioned source/ALT keyset cursors', () => {
    const encoded = encodeTrAlleleCursor({ sourceVariantId, altIndex: 50 })
    expect(decodeTrAlleleCursor(encoded)).toEqual({ version: 1, sourceVariantId, altIndex: 50 })
    expect(decodeTrAlleleCursor('not-a-cursor')).toBeNull()
  })

  test('uses collision-safe cache identities for nullable and delimiter-bearing filters', () => {
    const base = {
      id: httLocusId,
      cohort: 'hgsvc_hprc' as const,
      first: 50,
      source: source('hgsvc_hprc'),
    }
    expect(longReadTrLocusCacheKey(base)).not.toBe(
      longReadTrLocusCacheKey({ ...base, ancestryFilterId: 'all-ancestries' })
    )
    expect(
      longReadTrLocusCacheKey({ ...base, ancestryFilterId: 'a:b', sexFilterId: 'c' })
    ).not.toBe(longReadTrLocusCacheKey({ ...base, ancestryFilterId: 'a', sexFilterId: 'b:c' }))
  })

  test('returns complete, privacy-safe HTT whole-record aggregates and selected detail', async () => {
    mockQuery
      .mockImplementationOnce(() => result([summary(72, 584)]))
      .mockImplementationOnce(() => result(compactAlleles(72, 584)))
      .mockImplementationOnce(() =>
        result([
          {
            source_variant_id: sourceVariantId,
            alt_index: 1,
            division: 'afr_XX',
            ac: 20,
            an: 90,
            af: 20 / 90,
          },
        ])
      )
      .mockImplementationOnce(() => result([{ unique_carrier_count: 291 }]))
      .mockImplementationOnce(() =>
        result([
          {
            ancestry_group: 'afr',
            sex: 'XX',
            allele_pair: [0, 0],
            people: 14,
            phased_people: 0,
            invalid_people: 0,
          },
          {
            ancestry_group: 'afr',
            sex: 'XX',
            allele_pair: [1, 1],
            people: 146,
            phased_people: 140,
            invalid_people: 0,
          },
          {
            ancestry_group: 'nfe',
            sex: 'XY',
            allele_pair: [72, 72],
            people: 132,
            phased_people: 130,
            invalid_people: 0,
          },
        ])
      )
      .mockImplementationOnce(() => result([selectedAlt72]))

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'hgsvc_hprc',
      first: 600,
      selectedAllele: `${sourceVariantId}~72`,
      source: source('hgsvc_hprc', { carriers: true, metadata: true }),
    })

    const summaryRequest = mockQuery.mock.calls[0][0] as any
    expect(summaryRequest.query).toContain('length(alts) AS alt_count')
    expect(summaryRequest.query).not.toContain('ref_allele')
    expect(summaryRequest.query).toContain('LIMIT {limit:UInt16}')
    expect(summaryRequest.query_params.limit).toBe(MAX_TR_LOCUS_PAGE_SIZE + 1)
    const alleleRequest = mockQuery.mock.calls[1][0] as any
    expect(alleleRequest.query).toContain('task_id, attempt_id')
    expect(alleleRequest.query).toContain('length_provenance')
    expect(locus).toMatchObject({
      id: httLocusId,
      source_trid: httSourceTrid,
      exact_alt_count: 72,
      exact_alt_count_complete: true,
      delta_min: -24,
      delta_max: 48,
      represented_allele_length_min: null,
      represented_allele_length_max: null,
      represented_allele_length_unavailable_reason: 'ANCHOR_RULE_NOT_APPROVED',
      presentation: {
        source_representation_kind: 'UNKNOWN',
        presentation_layout: 'CLUSTER_FOCUSED',
        presentation_reason: 'MULTI_COMPONENT_FALLBACK',
        classification_digest: null,
        reviewed_override_digest: null,
      },
      bounds: {
        component_envelope_start0: 3074876,
        component_envelope_end0: 3075040,
        component_envelope_length_bp: 164,
        component_envelope_basis: 'EXACT_ORDERED_COMPONENTS',
        source_ref_span_status: 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT',
        variation_cluster_status: 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION',
        variation_cluster_start0: null,
        bounds_digest: null,
      },
      component_summary: {
        ordered_component_count: 6,
        distinct_stored_motif_count: 5,
      },
      sequence_cardinality: {
        source_alt_identity_count: 72,
        unique_alt_sequence_count: 3,
        all_source_alts_sequence_complete: true,
        status: 'AVAILABLE_EXACT',
        reason: null,
        algorithm_version: 'SHA256_WITH_BYTE_EQUALITY_V1',
      },
      represented_length: {
        status: 'UNAVAILABLE',
        reason: 'ANCHOR_RULE_NOT_APPROVED',
        represented_ref_length_bp: null,
        represented_alt_min_length_bp: null,
        represented_alt_max_length_bp: null,
        source_delta_provenance: 'SEQUENCE_DERIVED',
        sequence_length_provenance: null,
        anchor_rule: null,
        reconciliation_status: 'NOT_EVALUATED',
      },
      filter_contract: {
        status: 'PARTIAL',
        reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
        ancestry_mapping_status: 'UNAVAILABLE_PENDING_OWNER_APPROVAL',
        ancestry_control_redundant: false,
        available_color_dimensions: [],
        vocabulary_release: null,
        vocabulary_digest: null,
        source_key_inventory_release: 'SOURCE_KEY_INVENTORY_V1',
        source_release: 'y1',
        source_run_id: 'run-hgsvc_hprc',
        metadata_source_run_id: 'metadata-1',
      },
      called_allele_count: 584,
      called_sample_count: 292,
      unique_carrier_count: 291,
      sequences_available: true,
      sequences_unavailable_reason: null,
      selected_allele_valid: true,
      selected_allele_unavailable_reason: null,
      component_measurement_available: false,
      region: { chrom: '4', start0: 3074876, end0: 3075040, size: 164 },
    })
    expect(locus.components).toHaveLength(6)
    expect(locus.components[2]).toEqual({
      chrom: '4',
      start0: 3074939,
      end0: 3074966,
      motif: 'CCG',
    })
    expect(locus.components[5].motif).toBe('CCG')
    expect(locus.whole_record_allele_landscape).toMatchObject({
      status: 'AVAILABLE',
      called_alleles: 584,
      non_reference_called_alleles: 556,
      reference_called_alleles: 28,
      exact_alt_count: 72,
      stratified_view: {
        status: 'AVAILABLE',
        ancestry_filter_id: null,
        sex_filter_id: null,
        color_dimension: null,
        filtered_called_alleles: 556,
      },
    })
    expect(locus.whole_record_allele_landscape.bins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ delta: -24, called_alleles: 292, exact_alt_count: 1 }),
        expect.objectContaining({ delta: 48, called_alleles: 264, exact_alt_count: 1 }),
      ])
    )
    expect(locus.whole_record_genotype_landscape).toMatchObject({
      status: 'AVAILABLE',
      reference_allele_id: 'REFERENCE',
      called_samples: 292,
      called_alleles: 584,
    })
    expect(locus.selected_allele).toMatchObject({
      variant_id: `${sourceVariantId}~72`,
      source_variant_id: sourceVariantId,
      alt_index: 72,
      alt: `A${'C'.repeat(212)}`,
      length: 48,
      motif_purity: 0.97,
      motif_purity_source: 'source_ap_allele',
      decomposition_status: 'UNAVAILABLE_COMPOUND_LOCUS',
      source_run_id: 'run-hgsvc_hprc',
    })
    expect(locus.alleles.nodes).toHaveLength(72)
    expect(locus.alleles.nodes[1].variant_id).not.toBe(locus.alleles.nodes[2].variant_id)
    expect(locus.alleles.nodes[1].alt).toBe(locus.alleles.nodes[2].alt)
    expect(locus.alleles.nodes[0]).toMatchObject({
      ref: `A${'C'.repeat(164)}`,
      alt: `A${'C'.repeat(140)}`,
    })
    const aggregateJson = JSON.stringify({
      index: locus.alleles,
      alleles: locus.whole_record_allele_landscape,
      genotypes: locus.whole_record_genotype_landscape,
    })
    expect(aggregateJson).toContain(`A${'C'.repeat(140)}`)
    expect(aggregateJson).not.toContain('sample_id')
  })

  test('keeps valid compact metadata but withholds over-bound selected sequence detail', async () => {
    const overBoundAlt = 'G'.repeat(MAX_TR_SELECTED_ALLELE_DETAIL_BYTES)
    mockQuery
      .mockImplementationOnce(() => result([summary(1, 2)]))
      .mockImplementationOnce(() =>
        result([
          {
            task_id: 'task-1',
            attempt_id: 'attempt-1',
            source_variant_id: sourceVariantId,
            alt_index: 1,
            ref_allele: 'C',
            alt: overBoundAlt,
            allele_length: MAX_TR_SELECTED_ALLELE_DETAIL_BYTES - 1,
            length_provenance: 'sequence_derived',
            ac: 1,
            an: 2,
            af: 0.5,
          },
        ])
      )
      .mockImplementationOnce(() => result([]))
      .mockImplementationOnce(() =>
        result([
          {
            ...selectedAlt72,
            alt_index: 1,
            ref_allele: 'C',
            alt: overBoundAlt,
            allele_length: MAX_TR_SELECTED_ALLELE_DETAIL_BYTES - 1,
            ac: 1,
            an: 2,
            af: 0.5,
          },
        ])
      )

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'aou',
      first: 50,
      selectedAllele: `${sourceVariantId}~1`,
      source: source('aou', { carriers: false }),
    })

    expect(locus).toMatchObject({
      sequences_available: false,
      sequences_unavailable_reason: 'ALLELE_INDEX_SEQUENCE_BYTE_BOUND_EXCEEDED',
      represented_allele_length_min: null,
      represented_allele_length_max: null,
      represented_allele_length_unavailable_reason: 'ANCHOR_RULE_NOT_APPROVED',
      sequence_cardinality: {
        source_alt_identity_count: 1,
        unique_alt_sequence_count: 1,
        all_source_alts_sequence_complete: true,
        status: 'AVAILABLE_EXACT',
      },
      represented_length: {
        status: 'UNAVAILABLE',
        reason: 'ANCHOR_RULE_NOT_APPROVED',
      },
      selected_allele_valid: true,
      selected_allele: null,
      selected_allele_unavailable_reason: 'SELECTED_ALLELE_DETAIL_BYTE_BOUND_EXCEEDED',
      alleles: {
        nodes: [
          expect.objectContaining({
            variant_id: `${sourceVariantId}~1`,
            source_variant_id: sourceVariantId,
            alt_index: 1,
            ref: null,
            alt: null,
            length: MAX_TR_SELECTED_ALLELE_DETAIL_BYTES - 1,
            freq: { all: { ac: 1, an: 2, af: 0.5 }, populations: [] },
          }),
        ],
      },
    })
    expect(JSON.stringify(locus)).not.toContain('G'.repeat(100))
    const selectedRequest = mockQuery.mock.calls[3][0] as any
    expect(JSON.stringify(selectedRequest.query_params)).not.toContain(overBoundAlt)
  })

  test('keeps bounded selected detail when the cumulative exact-index sequence bound is exceeded', async () => {
    const boundedAlt = `C${'G'.repeat(549_999)}`
    const rows = [1, 2].map((altIndex) => ({
      task_id: 'task-1',
      attempt_id: 'attempt-1',
      source_variant_id: sourceVariantId,
      alt_index: altIndex,
      ref_allele: 'C',
      alt: boundedAlt,
      allele_length: boundedAlt.length - 1,
      length_provenance: 'sequence_derived',
      ac: 1,
      an: 2,
      af: 0.5,
    }))
    mockQuery
      .mockImplementationOnce(() => result([summary(2, 2)]))
      .mockImplementationOnce(() => result(rows))
      .mockImplementationOnce(() => result([]))
      .mockImplementationOnce(() =>
        result([
          {
            ...selectedAlt72,
            ...rows[0],
          },
        ])
      )

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'aou',
      first: 50,
      selectedAllele: `${sourceVariantId}~1`,
      source: source('aou', { carriers: false }),
    })

    expect(locus).toMatchObject({
      sequences_available: false,
      sequences_unavailable_reason: 'ALLELE_INDEX_SEQUENCE_BYTE_BOUND_EXCEEDED',
      sequence_cardinality: {
        source_alt_identity_count: 2,
        unique_alt_sequence_count: 1,
        all_source_alts_sequence_complete: true,
        status: 'AVAILABLE_EXACT',
      },
      represented_length: {
        status: 'UNAVAILABLE',
        reason: 'ANCHOR_RULE_NOT_APPROVED',
      },
      selected_allele_unavailable_reason: null,
      selected_allele: { variant_id: `${sourceVariantId}~1`, alt: boundedAlt },
      alleles: {
        nodes: [
          expect.objectContaining({ ref: null, alt: null }),
          expect.objectContaining({ ref: null, alt: null }),
        ],
      },
    })
  })

  test('fails exact-index sequence availability closed when source sequence is truly absent', async () => {
    mockQuery
      .mockImplementationOnce(() => result([summary(1, 2)]))
      .mockImplementationOnce(() =>
        result([
          {
            task_id: 'task-1',
            attempt_id: 'attempt-1',
            source_variant_id: sourceVariantId,
            alt_index: 1,
            allele_length: 0,
            length_provenance: 'sequence_derived',
            ac: 1,
            an: 2,
            af: 0.5,
          },
        ])
      )
      .mockImplementationOnce(() => result([]))

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'aou',
      first: 50,
      source: source('aou', { carriers: false }),
    })

    expect(locus).toMatchObject({
      sequences_available: false,
      sequences_unavailable_reason: 'EXACT_ALLELE_SEQUENCE_NOT_AVAILABLE',
      represented_allele_length_min: null,
      represented_allele_length_max: null,
      represented_allele_length_unavailable_reason: 'EXACT_REF_ALT_SEQUENCE_BYTES_INCOMPLETE',
      sequence_cardinality: {
        source_alt_identity_count: 1,
        unique_alt_sequence_count: null,
        all_source_alts_sequence_complete: false,
        status: 'UNAVAILABLE',
        reason: 'EXACT_ALT_SEQUENCE_BYTES_INCOMPLETE',
      },
      represented_length: {
        status: 'UNAVAILABLE',
        reason: 'EXACT_REF_ALT_SEQUENCE_BYTES_INCOMPLETE',
      },
      alleles: { nodes: [expect.objectContaining({ ref: null, alt: null })] },
    })
  })

  test('keeps all 497 AoU exact IDs reachable but makes carrier-only genotype data explicit', async () => {
    mockQuery
      .mockImplementationOnce(() => result([summary(497, 1000)]))
      .mockImplementationOnce(() => result(compactAlleles(497, 1000)))
      .mockImplementationOnce(() => result([]))

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'aou',
      first: 600,
      source: source('aou', { carriers: false }),
    })

    expect(locus).toMatchObject({
      exact_alt_count: 497,
      exact_alt_count_complete: true,
      unique_carrier_count: null,
      whole_record_genotype_landscape: {
        status: 'UNAVAILABLE',
        reason_code: 'CARRIER_CALLS_NOT_AVAILABLE',
      },
    })
    expect(locus.alleles.nodes).toHaveLength(497)
    expect(locus.alleles.nodes.at(-1).variant_id).toBe(`${sourceVariantId}~497`)
    expect(
      mockQuery.mock.calls.some(([request]: any[]) => request.query.includes('lr_y1_carriers'))
    ).toBe(false)
  })

  test('fails closed instead of returning a partial aggregate above the hard ALT bound', async () => {
    mockQuery
      .mockImplementationOnce(() => result([summary(601, 1202)]))
      .mockImplementationOnce(() => result(compactAlleles(601, 1202)))

    const locus = await fetchLongReadTrLocus({
      id: httLocusId,
      cohort: 'aou',
      first: 600,
      selectedAllele: `${sourceVariantId}~601`,
      source: source('aou', { carriers: false }),
    })

    expect(locus).toMatchObject({
      exact_alt_count: 601,
      exact_alt_count_complete: false,
      selected_allele_valid: true,
      selected_allele: null,
      selected_allele_unavailable_reason: 'ALT_COUNT_EXCEEDS_600',
      exact_alt_count_unavailable_reason: 'ALT_COUNT_EXCEEDS_600',
      sequence_cardinality: {
        source_alt_identity_count: 601,
        unique_alt_sequence_count: null,
        all_source_alts_sequence_complete: false,
        status: 'UNAVAILABLE',
        reason: 'ALT_COUNT_EXCEEDS_600',
      },
      represented_length: {
        status: 'UNAVAILABLE',
        reason: 'ALT_COUNT_EXCEEDS_600',
      },
      delta_min: null,
      delta_max: null,
      whole_record_allele_landscape: {
        status: 'UNAVAILABLE',
        reason_code: 'ALT_COUNT_EXCEEDS_600',
      },
    })
    expect(locus.alleles.nodes).toEqual([])
  })

  test('rejects page sizes over the hard bound before querying', async () => {
    expect(MAX_TR_LOCUS_PAGE_SIZE).toBe(600)
    await expect(
      fetchLongReadTrLocus({ id: httLocusId, cohort: 'aou', first: 601, source: source('aou') })
    ).rejects.toThrow('INVALID_TR_LOCUS_PAGE_SIZE')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  test('fails closed on malformed or nonidentical source TRID metadata', async () => {
    mockQuery.mockImplementationOnce(() =>
      result([
        {
          ...summary(1, 2),
          source_info_json: JSON.stringify({ TRID: '4-3074876-3074933-CAA' }),
        },
      ])
    )
    await expect(
      fetchLongReadTrLocus({ id: httLocusId, cohort: 'aou', source: source('aou') })
    ).rejects.toThrow('TR_LOCUS_INVARIANT')
  })
})

describe('round-two Phase 2A contracts', () => {
  const approvedAnchorRule = {
    id: 'VCF_SHARED_LEFT_PADDING_BASE_V1' as const,
    source: 'synthetic-test-receipt',
    release: 'test-v1',
    digest: 'a'.repeat(64),
  }

  test('keeps dense component summaries exact without inventing source bounds', () => {
    const components = Array.from({ length: 180 }, (_, index) => ({
      chrom: '3',
      start0: 1000 + index * 10,
      end0: 1005 + index * 10,
      motif: ['TGC', 'CAG', 'TG', 'A', 'TGC'][index % 5],
    }))
    const contract = buildLongReadTrComponentContract(components)
    expect(contract).toEqual({
      bounds: {
        component_envelope_start0: 1000,
        component_envelope_end0: 2795,
        component_envelope_length_bp: 1795,
        component_envelope_basis: 'EXACT_ORDERED_COMPONENTS',
        source_ref_span_start0: null,
        source_ref_span_end0: null,
        source_ref_span_status: 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT',
        variation_cluster_start0: null,
        variation_cluster_end0: null,
        variation_cluster_length_bp: null,
        variation_cluster_status: 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION',
        bounds_source: null,
        bounds_release: null,
        bounds_digest: null,
      },
      component_summary: {
        ordered_component_count: 180,
        distinct_stored_motif_count: 4,
      },
    })
    expect(components.map((component) => component.motif)).toEqual(
      Array.from({ length: 180 }, (_, index) => ['TGC', 'CAG', 'TG', 'A', 'TGC'][index % 5])
    )
  })

  test('uses only exact component count for the receipt-free presentation fallback', () => {
    expect(buildLongReadTrPresentation(1)).toEqual({
      source_representation_kind: 'UNKNOWN',
      presentation_layout: 'REPEAT_FOCUSED',
      presentation_reason: 'SOLE_EXACT_COMPONENT',
      classification_source: null,
      classification_release: null,
      classification_digest: null,
      reviewed_override_digest: null,
    })
    expect(buildLongReadTrPresentation(6)).toMatchObject({
      source_representation_kind: 'UNKNOWN',
      presentation_layout: 'CLUSTER_FOCUSED',
      presentation_reason: 'MULTI_COMPONENT_FALLBACK',
      classification_digest: null,
      reviewed_override_digest: null,
    })
    expect(JSON.stringify(buildLongReadTrPresentation(6))).not.toContain('VARIATION_CLUSTER')
  })

  test('counts exact ALT bytes without coalescing source identities', () => {
    const cardinality = buildSequenceCardinality({
      alleles: [
        {
          source_variant_id: 'record-a',
          alt_index: 1,
          alt: 'AACAC',
          allele_length: 0,
          ac: 1,
          an: 4,
          af: 0.25,
        },
        {
          source_variant_id: 'record-b',
          alt_index: 1,
          alt: 'AACAC',
          allele_length: 0,
          ac: 1,
          an: 4,
          af: 0.25,
        },
      ],
      sourceRecords: [
        { source_variant_id: 'record-a', alt_count: 1 },
        { source_variant_id: 'record-b', alt_count: 1 },
      ],
    })
    expect(cardinality).toEqual({
      source_alt_identity_count: 2,
      unique_alt_sequence_count: 1,
      all_source_alts_sequence_complete: true,
      status: 'AVAILABLE_EXACT',
      reason: null,
      algorithm_version: 'SHA256_WITH_BYTE_EQUALITY_V1',
    })

    const duplicateScaffold = phase0Fixture.future_contract_scaffolds.find(
      (item: any) => item.id === 'duplicate-alt-bytes'
    )
    expect(
      countUniqueExactAltBytes(
        duplicateScaffold.source_alt_identities.map((identity: any) =>
          Buffer.from(identity.alt, 'utf8')
        )
      )
    ).toBe(duplicateScaffold.expected.unique_alt_sequence_count)
    expect(duplicateScaffold.source_alt_identities).toHaveLength(
      duplicateScaffold.expected.source_alt_identity_count
    )

    // Even a forced digest collision cannot merge unequal exact ALT bytes.
    expect(
      countUniqueExactAltBytes(
        [Buffer.from('AACAC'), Buffer.from('AACAG')],
        () => 'forced-collision'
      )
    ).toBe(2)
  })

  test('admits absolute lengths only with a valid receipt and exact stored-delta reconciliation', () => {
    const disagreementScaffold = phase0Fixture.future_contract_scaffolds.find(
      (item: any) => item.id === 'represented-length-disagreement'
    )
    const sequenceDerivedDelta =
      Buffer.byteLength(disagreementScaffold.complete_alt) -
      Buffer.byteLength(disagreementScaffold.complete_ref)
    const base = {
      source_variant_id: 'record-a',
      alt_index: 1,
      ref_allele: disagreementScaffold.complete_ref,
      alt: disagreementScaffold.complete_alt,
      allele_length: sequenceDerivedDelta,
      length_provenance: 'sequence_derived',
      ac: 1,
      an: 2,
      af: 0.5,
    }
    const input = {
      alleles: [base],
      sourceRecords: [{ source_variant_id: 'record-a', alt_count: 1 }],
      sourceRunId: 'synthetic-run',
    }
    expect(buildRepresentedLengthContract({ ...input, approvedAnchorRule: null })).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'ANCHOR_RULE_NOT_APPROVED',
      represented_ref_length_bp: null,
      reconciliation_status: 'NOT_EVALUATED',
    })
    expect(buildRepresentedLengthContract({ ...input, approvedAnchorRule })).toMatchObject({
      status: 'AVAILABLE_EXACT',
      reason: null,
      represented_ref_length_bp: 4,
      represented_alt_min_length_bp: 6,
      represented_alt_max_length_bp: 6,
      sequence_length_provenance: 'lr_y1_alleles.ref_allele+alt@synthetic-run',
      sequence_source_record_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
      sequence_content_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
      anchor_rule: 'VCF_SHARED_LEFT_PADDING_BASE_V1',
      anchor_rule_source: 'synthetic-test-receipt',
      anchor_rule_release: 'test-v1',
      anchor_rule_digest: 'a'.repeat(64),
      reconciliation_status: 'RECONCILED',
    })
    expect(
      buildRepresentedLengthContract({
        ...input,
        alleles: [{ ...base, allele_length: disagreementScaffold.stored_length_delta_bp }],
        approvedAnchorRule,
      })
    ).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'STORED_DELTA_RECONCILIATION_MISMATCH',
      represented_ref_length_bp: null,
      reconciliation_status: 'MISMATCH',
      source_delta_provenance: 'SEQUENCE_DERIVED',
    })
  })

  test('keeps represented-length failure modes distinct and byte-bound independent', () => {
    const base = {
      source_variant_id: 'record-a',
      alt_index: 1,
      task_id: 'task-a',
      attempt_id: 'attempt-a',
      ref_allele: 'AACAC',
      alt: 'AACACAC',
      allele_length: 2,
      length_provenance: 'info_svlen',
      ac: 1,
      an: 2,
      af: 0.5,
    }
    const oneRecord = {
      source_variant_id: 'record-a',
      alt_count: 1,
      task_id: 'task-a',
      attempt_id: 'attempt-a',
    }
    const build = (alleles: any[], sourceRecords: any[] = [oneRecord]) =>
      buildRepresentedLengthContract({
        alleles,
        sourceRecords,
        sourceRunId: 'synthetic-run',
        approvedAnchorRule,
      })

    expect(build([{ ...base, alt: null }])).toMatchObject({
      reason: 'EXACT_REF_ALT_SEQUENCE_BYTES_INCOMPLETE',
    })
    expect(build([{ ...base, alt: 'TACACAC' }])).toMatchObject({
      reason: 'SHARED_PADDING_BASE_NOT_VALIDATED',
      reconciliation_status: 'NOT_RECONCILED',
    })
    expect(build([{ ...base, allele_length: null }])).toMatchObject({
      reason: 'NONFINITE_WHOLE_RECORD_DELTA',
      source_delta_provenance: 'INFO_SVLEN',
    })
    expect(build([{ ...base, length_provenance: null }])).toMatchObject({
      reason: 'SOURCE_DELTA_PROVENANCE_UNAVAILABLE',
      source_delta_provenance: 'UNAVAILABLE',
    })
    expect(build([{ ...base, task_id: 'wrong-task' }])).toMatchObject({
      reason: 'SOURCE_RECORD_PROVENANCE_MISMATCH',
    })

    const second = {
      ...base,
      alt_index: 2,
      ref_allele: 'ATCAC',
      alt: 'ATCACAC',
    }
    expect(build([base, second], [{ ...oneRecord, alt_count: 2 }])).toMatchObject({
      reason: 'SOURCE_REF_BYTES_INCONSISTENT',
    })
    expect(
      build(
        [base, { ...base, alt_index: 2, length_provenance: 'sequence_derived' }],
        [{ ...oneRecord, alt_count: 2 }]
      )
    ).toMatchObject({ status: 'AVAILABLE_EXACT', source_delta_provenance: 'MIXED' })
    expect(
      build(
        [base, { ...base, source_variant_id: 'record-b' }],
        [oneRecord, { source_variant_id: 'record-b', alt_count: 1 }]
      )
    ).toMatchObject({ reason: 'MULTIPLE_SOURCE_RECORDS' })

    const overResponseBoundAlt = `A${'C'.repeat(MAX_TR_SELECTED_ALLELE_DETAIL_BYTES + 1)}`
    expect(
      build([
        {
          ...base,
          ref_allele: 'A',
          alt: overResponseBoundAlt,
          allele_length: overResponseBoundAlt.length - 1,
        },
      ])
    ).toMatchObject({
      status: 'AVAILABLE_EXACT',
      represented_ref_length_bp: 0,
      represented_alt_min_length_bp: MAX_TR_SELECTED_ALLELE_DETAIL_BYTES + 1,
      source_delta_provenance: 'INFO_SVLEN',
      reconciliation_status: 'RECONCILED',
    })
  })
})

describe('whole-record aggregate integrity', () => {
  const compact = [
    {
      source_variant_id: sourceVariantId,
      alt_index: 1,
      allele_length: 0,
      ac: 1,
      an: 2,
      af: 0.5,
    },
  ]

  test('distinguishes reference from a zero-delta exact ALT in genotype pairs', () => {
    const landscape: any = buildWholeRecordGenotypeLandscape({
      rows: [
        {
          ancestry_group: 'afr',
          sex: 'XX',
          allele_pair: [0, 1],
          people: 1,
          phased_people: 1,
          invalid_people: 0,
        },
      ],
      alleles: compact,
      expectedCalledAlleles: 2,
    })
    expect(landscape).toMatchObject({ status: 'AVAILABLE', called_samples: 1 })
    expect(landscape.cells[0]).toMatchObject({
      shorter_delta: 0,
      longer_delta: 0,
      pairs: [
        expect.objectContaining({
          shorter_allele_id: `${sourceVariantId}~1`,
          longer_allele_id: 'REFERENCE',
        }),
      ],
    })
  })

  test('rejects genotype totals that do not reproduce exact ALT counts', () => {
    expect(
      buildWholeRecordGenotypeLandscape({
        rows: [
          {
            ancestry_group: 'afr',
            sex: 'XX',
            allele_pair: [0, 0],
            people: 1,
            phased_people: 0,
            invalid_people: 0,
          },
        ],
        alleles: compact,
        expectedCalledAlleles: 2,
      })
    ).toMatchObject({ status: 'UNAVAILABLE', reason_code: 'GENOTYPE_TOTAL_DOES_NOT_RECONCILE' })
  })

  test('scopes genotype output under active sex filters and fails frequency ancestry IDs closed', () => {
    const genotypeAlleles = [{ ...compact[0], ac: 2, an: 4, af: 0.5 }]
    const rows = [
      {
        ancestry_group: 'AFR',
        sex: 'XX',
        allele_pair: [0, 1],
        people: 1,
        phased_people: 1,
        invalid_people: 0,
      },
      {
        ancestry_group: 'EUR',
        sex: 'XY',
        allele_pair: [0, 1],
        people: 1,
        phased_people: 1,
        invalid_people: 0,
      },
    ]
    const sexFiltered: any = buildWholeRecordGenotypeLandscape({
      rows,
      alleles: genotypeAlleles,
      expectedCalledAlleles: 4,
      sexFilterId: 'XX',
      colorBy: 'SEX',
    })
    expect(sexFiltered).toMatchObject({
      status: 'AVAILABLE',
      cells: [],
      stratified_view: {
        status: 'AVAILABLE',
        sex_filter_id: 'XX',
        color_dimension: 'SEX',
        called_samples: 1,
        cells: [
          {
            people: 1,
            pairs: [
              expect.objectContaining({
                ancestry_group: 'AFR',
                ancestry_group_id: 'metadata:AFR',
                sex: 'XX',
                sex_group_id: 'XX',
                people: 1,
              }),
            ],
          },
        ],
      },
    })
    expect(JSON.stringify(sexFiltered.stratified_view)).not.toContain('XY')

    const unmapped: any = buildWholeRecordGenotypeLandscape({
      rows,
      alleles: genotypeAlleles,
      expectedCalledAlleles: 4,
      ancestryFilterId: 'frequency:nfe',
      colorBy: 'ANCESTRY',
    })
    expect(unmapped).toMatchObject({
      cells: [],
      stratified_view: {
        status: 'UNAVAILABLE',
        reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
        cells: [],
      },
    })
  })

  test('retains every exact ID in equal-length allele bins and aligned purity only', () => {
    const second = { ...compact[0], alt_index: 2, ac: 1, an: 3, af: 1 / 3 }
    const first = { ...compact[0], an: 3, af: 1 / 3 }
    const landscape = buildWholeRecordAlleleLandscape({
      alleles: [first, second],
      frequencyRows: [],
      sourceRecordCount: 1,
      purityByAllele: new Map([[`${sourceVariantId}\u00001`, 0.99]]),
    })
    expect(landscape).toMatchObject({
      status: 'AVAILABLE',
      called_alleles: 3,
      non_reference_called_alleles: 2,
      bins: [
        expect.objectContaining({
          delta: 0,
          exact_alt_count: 2,
          allele_ids: [`${sourceVariantId}~1`, `${sourceVariantId}~2`],
        }),
      ],
      purity_points: [expect.objectContaining({ allele_id: `${sourceVariantId}~1` })],
    })
  })

  test('fails stratified controls closed when stratum counts do not reconcile', () => {
    const alleles = [
      { ...compact[0], ac: 1 },
      { ...compact[0], alt_index: 2, ac: 1 },
    ]
    const frequencyRows = alleles.map((allele) => ({
      source_variant_id: allele.source_variant_id,
      alt_index: allele.alt_index,
      division: 'afr_XX',
      ac: 2,
      an: 2,
      af: 1,
    }))
    const landscape: any = buildWholeRecordAlleleLandscape({
      alleles,
      frequencyRows,
      sourceRecordCount: 1,
      purityByAllele: new Map(),
    })
    expect(landscape).toMatchObject({
      status: 'AVAILABLE',
      stratified_available: false,
      stratified_unavailable_reason: 'MALFORMED_STRATIFIED_FREQUENCIES',
      ancestry_groups: [],
      sexes: [],
      bins: [expect.objectContaining({ stacks: [] })],
    })
  })
})

describe('Phase 2B filter and coloring contract', () => {
  const alleles = [
    {
      source_variant_id: sourceVariantId,
      alt_index: 1,
      allele_length: -1,
      ac: 3,
      an: 10,
      af: 0.3,
    },
    {
      source_variant_id: sourceVariantId,
      alt_index: 2,
      allele_length: 1,
      ac: 1,
      an: 10,
      af: 0.1,
    },
  ]
  const frequencyRow = (altIndex: number, division: string, ac: number, an: number) => ({
    source_variant_id: sourceVariantId,
    alt_index: altIndex,
    division,
    ac,
    an,
    af: an ? ac / an : 0,
  })

  test('keeps HGSVC frequency and metadata ancestry keys distinct without an approved mapping', () => {
    const contract = buildLongReadTrFilterContract({
      cohort: 'hgsvc_hprc',
      sourceRelease: 'y1',
      sourceRunId: 'run-hgsvc',
      metadataRunId: 'metadata-hgsvc',
      alleles,
      frequencyRows: [
        frequencyRow(1, 'afr', 1, 4),
        frequencyRow(2, 'afr', 0, 4),
        frequencyRow(1, 'nfe', 2, 6),
        frequencyRow(2, 'nfe', 1, 6),
        frequencyRow(1, 'afr_XX', 1, 4),
        frequencyRow(2, 'afr_XX', 0, 4),
        frequencyRow(1, 'nfe_XY', 2, 6),
        frequencyRow(2, 'nfe_XY', 1, 6),
      ],
      frequencyProductAvailable: true,
      genotypeRows: [
        { source_ancestry_key: 'AFR', source_sex_key: 'female' },
        { source_ancestry_key: 'EUR', source_sex_key: 'male' },
      ],
      genotypeProductAvailable: true,
    })

    expect(contract).toMatchObject({
      status: 'PARTIAL',
      reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
      ancestry_mapping_status: 'UNAVAILABLE_PENDING_OWNER_APPROVAL',
      available_color_dimensions: ['SEX'],
      allele_color_dimensions: ['ANCESTRY', 'SEX'],
      genotype_color_dimensions: ['ANCESTRY', 'SEX'],
      vocabulary_release: null,
      vocabulary_digest: null,
      source_key_inventory_release: 'SOURCE_KEY_INVENTORY_V1',
      source_release: 'y1',
      source_run_id: 'run-hgsvc',
      metadata_source_run_id: 'metadata-hgsvc',
    })
    expect(contract.source_key_inventory_digest).toMatch(/^[a-f0-9]{64}$/)
    expect(contract.ancestry_groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'frequency:nfe',
          source_frequency_keys: ['nfe', 'nfe_XY'],
          source_metadata_keys: [],
          shared_available: false,
        }),
        expect.objectContaining({
          id: 'metadata:EUR',
          source_frequency_keys: [],
          source_metadata_keys: ['EUR'],
          shared_available: false,
        }),
      ])
    )
    expect(
      contract.ancestry_groups.some(
        (group: any) =>
          group.source_frequency_keys.includes('nfe') && group.source_metadata_keys.includes('EUR')
      )
    ).toBe(false)
  })

  test('keeps an oversized source-key inventory typed unavailable under the aggregate guard', () => {
    const hugeKey = 'x'.repeat(MAX_TR_LOCUS_AGGREGATE_BYTES)
    const contract = buildLongReadTrFilterContract({
      cohort: 'hgsvc_hprc',
      sourceRelease: 'y1',
      sourceRunId: 'run-hgsvc',
      alleles,
      frequencyRows: [frequencyRow(1, hugeKey, 1, 10)],
      frequencyProductAvailable: true,
      genotypeRows: [],
      genotypeProductAvailable: false,
    })
    expect(contract).toMatchObject({
      status: 'UNAVAILABLE',
      reason: 'AGGREGATE_RESPONSE_BYTE_BOUND_EXCEEDED',
      ancestry_groups: [],
      sex_groups: [],
      available_color_dimensions: [],
      source_key_inventory_digest: expect.stringMatching(/^[a-f0-9]{64}$/),
    })
  })

  test('certifies AoU sole-ancestry redundancy only on exact global reconciliation', () => {
    const exactRows = [frequencyRow(1, 'afr', 3, 10), frequencyRow(2, 'afr', 1, 10)]
    expect(certifySoleAncestryControlRedundant(alleles, exactRows)).toEqual({
      redundant: true,
      reason: 'CERTIFIED_EXACT_SOLE_STRATUM',
    })
    expect(
      certifySoleAncestryControlRedundant(alleles, [
        frequencyRow(1, 'afr', 2, 9),
        frequencyRow(2, 'afr', 1, 9),
      ])
    ).toEqual({
      redundant: false,
      reason: 'SOLE_STRATUM_GLOBAL_OBSERVATIONS_DIFFER',
    })
    expect(
      certifySoleAncestryControlRedundant(alleles, [
        ...exactRows,
        frequencyRow(1, 'eur_XX', 0, 2),
        frequencyRow(2, 'eur_XX', 0, 2),
      ])
    ).toEqual({
      redundant: false,
      reason: 'NOT_SOLE_ANCESTRY_STRATUM',
    })
  })

  test('exposes the AoU ancestry distinction unless the sole control is certified redundant', () => {
    const build = (rows: any[]) =>
      buildLongReadTrFilterContract({
        cohort: 'aou',
        sourceRelease: 'y1',
        sourceRunId: 'run-aou',
        alleles,
        frequencyRows: rows,
        frequencyProductAvailable: true,
        genotypeRows: [],
        genotypeProductAvailable: false,
      })
    const redundant = build([frequencyRow(1, 'afr', 3, 10), frequencyRow(2, 'afr', 1, 10)])
    expect(redundant).toMatchObject({
      ancestry_control_redundant: true,
      ancestry_control_redundancy_reason: 'CERTIFIED_EXACT_SOLE_STRATUM',
      available_color_dimensions: [],
    })
    expect(redundant.ancestry_groups).toEqual([
      expect.objectContaining({ id: 'frequency:afr', source_frequency_keys: ['afr'] }),
    ])

    const distinct = build([frequencyRow(1, 'afr', 2, 9), frequencyRow(2, 'afr', 1, 9)])
    expect(distinct).toMatchObject({
      ancestry_control_redundant: false,
      ancestry_control_redundancy_reason: 'SOLE_STRATUM_GLOBAL_OBSERVATIONS_DIFFER',
      available_color_dimensions: ['ANCESTRY'],
    })
  })

  test('derives sex options from supported source keys without inventing Unknown', () => {
    const contract = buildLongReadTrFilterContract({
      cohort: 'aou',
      sourceRelease: 'y1',
      sourceRunId: 'run-aou',
      alleles,
      frequencyRows: [frequencyRow(1, 'XX', 3, 10), frequencyRow(2, 'XX', 1, 10)],
      frequencyProductAvailable: true,
      genotypeRows: [{ source_ancestry_key: 'AFR', source_sex_key: 'unsupported' }],
      genotypeProductAvailable: true,
    })
    expect(contract.sex_groups).toEqual([
      expect.objectContaining({
        id: 'XX',
        source_frequency_keys: ['XX'],
        source_metadata_keys: [],
      }),
    ])
    expect(contract.sex_groups.some((group) => group.id === 'SOURCE_UNKNOWN')).toBe(false)
  })

  test('same-dimension sex filtering emits only the selected sex and reconciles every bar', () => {
    const view = buildCanonicalAlleleStratifiedView({
      alleles,
      frequencyRows: [
        frequencyRow(1, 'XX', 2, 4),
        frequencyRow(2, 'XX', 0, 4),
        frequencyRow(1, 'XY', 1, 6),
        frequencyRow(2, 'XY', 1, 6),
      ],
      frequencyProductAvailable: true,
      sexFilterId: 'XX',
      colorBy: 'SEX',
    })
    expect(view).toMatchObject({
      status: 'AVAILABLE',
      sex_filter_id: 'XX',
      color_dimension: 'SEX',
      filtered_called_alleles: 2,
    })
    for (const bin of view.bins) {
      expect(bin.segments.every((segment: any) => segment.group_id === 'XX')).toBe(true)
      expect(
        bin.segments.reduce((sum: number, segment: any) => sum + segment.called_alleles, 0)
      ).toBe(bin.called_alleles)
    }
    expect(JSON.stringify(view)).not.toContain('XY')

    const landscape: any = buildWholeRecordAlleleLandscape({
      alleles,
      frequencyRows: [
        frequencyRow(1, 'XX', 2, 4),
        frequencyRow(2, 'XX', 0, 4),
        frequencyRow(1, 'XY', 1, 6),
        frequencyRow(2, 'XY', 1, 6),
      ],
      sourceRecordCount: 1,
      purityByAllele: new Map(),
      sexFilterId: 'XX',
      colorBy: 'SEX',
    })
    expect(landscape).toMatchObject({
      status: 'AVAILABLE',
      bins: [],
      purity_points: [],
      stratified_view: { status: 'AVAILABLE', sex_filter_id: 'XX' },
    })
  })

  test('uses exact joint rows for cross-dimension filtering and coloring', () => {
    const view = buildCanonicalAlleleStratifiedView({
      alleles,
      frequencyRows: [
        frequencyRow(1, 'afr', 2, 6),
        frequencyRow(2, 'afr', 1, 6),
        frequencyRow(1, 'nfe', 1, 4),
        frequencyRow(2, 'nfe', 0, 4),
        frequencyRow(1, 'afr_XX', 1, 2),
        frequencyRow(2, 'afr_XX', 0, 2),
        frequencyRow(1, 'afr_XY', 1, 4),
        frequencyRow(2, 'afr_XY', 1, 4),
      ],
      frequencyProductAvailable: true,
      ancestryFilterId: 'frequency:afr',
      colorBy: 'SEX',
    })
    expect(view).toMatchObject({
      status: 'AVAILABLE',
      ancestry_filter_id: 'frequency:afr',
      color_dimension: 'SEX',
      filtered_called_alleles: 3,
    })
    expect(JSON.stringify(view)).not.toContain('nfe')
    for (const bin of view.bins) {
      expect(
        bin.segments.reduce((sum: number, segment: any) => sum + segment.called_alleles, 0)
      ).toBe(bin.called_alleles)
    }
  })

  test('keeps source Unknown distinct from computed Unstratified and fails bad remainders closed', () => {
    const sourceUnknownRows = [frequencyRow(1, 'unknown', 2, 5), frequencyRow(2, 'unknown', 0, 5)]
    expect(
      buildCanonicalAlleleStratifiedView({
        alleles,
        frequencyRows: sourceUnknownRows,
        frequencyProductAvailable: true,
        colorBy: 'ANCESTRY',
      })
    ).toMatchObject({ status: 'UNAVAILABLE', reason: 'DENOMINATOR_COMPATIBILITY_NOT_PROVEN' })

    const admitted = buildCanonicalAlleleStratifiedView({
      alleles,
      frequencyRows: sourceUnknownRows,
      frequencyProductAvailable: true,
      colorBy: 'ANCESTRY',
      remainderCompatibilityProven: true,
    })
    expect(admitted).toMatchObject({ status: 'AVAILABLE' })
    expect(admitted.bins.flatMap((bin: any) => bin.segments)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ group_id: 'frequency:unknown', kind: 'SOURCE_UNKNOWN' }),
        expect.objectContaining({ group_id: 'UNSTRATIFIED', kind: 'UNSTRATIFIED' }),
      ])
    )
    for (const bin of admitted.bins) {
      expect(
        bin.segments.reduce((sum: number, segment: any) => sum + segment.called_alleles, 0)
      ).toBe(bin.called_alleles)
    }

    expect(
      buildCanonicalAlleleStratifiedView({
        alleles: [alleles[0]],
        frequencyRows: [frequencyRow(1, 'afr', 4, 10)],
        frequencyProductAvailable: true,
        colorBy: 'ANCESTRY',
        remainderCompatibilityProven: true,
      })
    ).toMatchObject({ status: 'UNAVAILABLE', reason: 'NEGATIVE_REMAINDER' })
  })
})
