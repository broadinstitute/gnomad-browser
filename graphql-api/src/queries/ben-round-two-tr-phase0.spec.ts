import crypto from 'node:crypto'

import { parseTrLocusId } from '../../../dataset-metadata/longReadTrLocusId'

// Aggregate/public characterization only. Phase 2 must explicitly replace or extend these
// contracts rather than changing their scientific identity in place.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fixture = require('./__fixtures__/ben-round-two-tr-phase0.json')

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex')
const caseById = (id: string) => fixture.cases.find((item: any) => item.id === id)

const summaryFor = (canonicalLocusId: string) => {
  const parsed = parseTrLocusId(canonicalLocusId)
  if (!parsed) throw new Error(`invalid frozen canonical locus ID: ${canonicalLocusId}`)
  const start0 = Math.min(...parsed.components.map((component) => component.start0))
  const end0 = Math.max(...parsed.components.map((component) => component.end0))
  return {
    canonicalLocusId: parsed.canonicalId,
    orderedComponentCount: parsed.components.length,
    distinctStoredMotifCount: new Set(parsed.components.map((component) => component.motif)).size,
    start0,
    end0,
    lengthBp: end0 - start0,
    components: parsed.components,
  }
}

describe('Ben round-two TR Phase 0 fixture freeze', () => {
  test('pins the clean source baseline and superseded zero-traffic candidate', () => {
    expect(fixture.baseline).toEqual({
      browser_api_source_sha: '29fc595d970e88992e06061ec56594ba8da5a41f',
      backend_source_sha: '4d38525fba925b0956b94e484bc03a600a75c5d1',
      starting_branch: 'gnomad-lr',
      starting_status: 'clean',
    })
    expect(fixture.held_candidate).toEqual(
      expect.objectContaining({
        api_revision: 'gnomad-lr-api-00026-gej',
        browser_revision: 'gnomad-lr-browser-00020-top',
        api_traffic_percent: 0,
        browser_traffic_percent: 0,
        disposition: 'SUPERSEDED_ZERO_TRAFFIC_EVIDENCE',
        rollback_target: false,
      })
    )
  })

  test.each([
    'anonymous-simple',
    'arx-1',
    'atxn1',
    'rfc1',
    'htt',
    'sparse-compound',
    'chr16-interruption',
    'ruvbl1-24-component',
    'second-24-component',
    'extreme-103-component',
    'synthetic-180-component',
  ])('round-trips exact ordered identity and envelope for %s', (id) => {
    const item = caseById(id)
    const summary = summaryFor(item.canonical_locus_id)
    expect(summary.canonicalLocusId).toBe(item.canonical_locus_id)
    expect(summary.orderedComponentCount).toBe(item.expected.ordered_component_count)
    expect(summary.distinctStoredMotifCount).toBe(item.expected.distinct_stored_motif_count)
    expect(summary.start0).toBe(item.expected.component_envelope_start0)
    expect(summary.end0).toBe(item.expected.component_envelope_end0)
    expect(summary.lengthBp).toBe(item.expected.component_envelope_length_bp)
    if (item.canonical_locus_id_sha256) {
      expect(sha256(item.canonical_locus_id)).toBe(item.canonical_locus_id_sha256)
    }
  })

  test('preserves reviewed orientation, duplicate motifs, overlap, and sparse gaps', () => {
    const atxn1 = summaryFor(caseById('atxn1').canonical_locus_id)
    expect(atxn1.components[0].motif).toBe('TGC')

    const rfc1 = summaryFor(caseById('rfc1').canonical_locus_id)
    expect(rfc1.components[0].motif).toBe('AAAAG')
    expect(caseById('rfc1').expected.catalog_role).toBe('benign reference motif')

    const htt = summaryFor(caseById('htt').canonical_locus_id)
    expect(htt.components.filter((component) => component.motif === 'CCG')).toEqual([
      { chrom: '4', start0: 3074939, end0: 3074966, motif: 'CCG' },
      { chrom: '4', start0: 3075029, end0: 3075040, motif: 'CCG' },
    ])
    expect(htt.components[1].start0).toBeLessThan(htt.components[0].end0)

    const sparse = caseById('sparse-compound')
    expect(sparse.expected.component_envelope_length_bp).toBe(37)
    expect(sparse.expected.component_length_sum_bp).toBe(28)
    expect(sparse.expected.positive_gap_bp).toBe(9)
  })

  test('freezes cohort-scoped chr16 source ALT bytes and represented lengths', () => {
    const item = caseById('chr16-interruption')
    const hgsvc = item.cohorts.hgsvc_hprc
    const aou = item.cohorts.aou

    for (const cohort of [hgsvc, aou]) {
      expect(cohort.complete_ref).toHaveLength(cohort.complete_ref_length_bp)
      expect(cohort.complete_alt).toHaveLength(cohort.complete_alt_length_bp)
      expect(cohort.represented_ref_length_bp).toBe(cohort.complete_ref_length_bp - 1)
      expect(cohort.represented_alt_length_bp).toBe(cohort.complete_alt_length_bp - 1)
      expect(cohort.length_delta_bp).toBe(
        cohort.represented_alt_length_bp - cohort.represented_ref_length_bp
      )
      expect(cohort.decomposition_status).toBe('UNAVAILABLE_COMPOUND_LOCUS')
    }

    expect(hgsvc.complete_ref).toBe(aou.complete_ref)
    expect(hgsvc.complete_alt).not.toBe(aou.complete_alt)
    expect(hgsvc.source_run_id).not.toBe(aou.source_run_id)
    expect(hgsvc.represented_alt_length_bp).toBe(87)
    expect(aou.represented_alt_length_bp).toBe(85)
    expect(hgsvc.length_delta_bp).toBe(-6)
    expect(aou.length_delta_bp).toBe(-8)
  })

  test('freezes ordinary, dense, and bounded-unavailable aggregate cardinalities', () => {
    expect(caseById('anonymous-simple').cohorts.hgsvc_hprc.source_alt_identity_count).toBe(3)
    expect(caseById('htt').cohorts).toMatchObject({
      hgsvc_hprc: { source_alt_identity_count: 72 },
      aou: { source_alt_identity_count: 497 },
    })
    expect(caseById('rfc1').cohorts.aou).toMatchObject({
      source_alt_identity_count: 682,
      bounded_sequence_product_status: 'UNAVAILABLE_OVER_600_ALTS',
    })
    expect(caseById('extreme-103-component').cohorts.aou).toMatchObject({
      source_alt_identity_count: 1994,
      called_allele_count: 2044,
      bounded_sequence_product_status: 'UNAVAILABLE_OVER_600_ALTS',
    })
  })

  test('keeps component envelope separate from source-record span at the extreme locus', () => {
    const extreme = caseById('extreme-103-component')
    expect(extreme.canonical_locus_id).toHaveLength(2880)
    expect(extreme.expected.component_envelope_length_bp).toBe(2486)
    expect(extreme.expected.source_record_span_bp).toBe(3206)
    expect(extreme.expected.overlap_count).toBe(22)
    expect(extreme.expected.adjacency_count).toBe(4)
    expect(extreme.expected.positive_gap_count).toBe(76)
    expect(
      extreme.expected.overlap_count +
        extreme.expected.adjacency_count +
        extreme.expected.positive_gap_count
    ).toBe(extreme.expected.ordered_component_count - 1)
  })

  test('pins deterministic 24/103/180 density fixtures without reclassifying biology', () => {
    expect(caseById('ruvbl1-24-component').canonical_locus_id_sha256).toBeUndefined()
    expect(sha256(caseById('ruvbl1-24-component').canonical_locus_id)).toBe(
      '95c88f66a61ff1cd26b30e111cd7d1acb29e7a3eccd2198106a39668a790e0c2'
    )
    expect(sha256(caseById('second-24-component').canonical_locus_id)).toBe(
      'e3219fd6409eab6ec21a48340313cbeb09e70a0fdcbea9e395513ca18d3a1f45'
    )
    const synthetic = caseById('synthetic-180-component')
    expect(synthetic.evidence).toMatch(/not a biological\/source classification/)
    expect(synthetic.canonical_locus_id_sha256).toBe(
      'aa6757f68a53d566afe2e81e021ed69d33df42c567c88acc3703b0482bb20626'
    )
  })

  test('scaffolds later byte-uniqueness and represented-length fail-closed contracts', () => {
    const duplicate = fixture.future_contract_scaffolds.find(
      (item: any) => item.id === 'duplicate-alt-bytes'
    )
    expect(duplicate.source_alt_identities).toHaveLength(2)
    expect(new Set(duplicate.source_alt_identities.map((item: any) => item.alt)).size).toBe(1)
    expect(duplicate.expected).toEqual({
      source_alt_identity_count: 2,
      unique_alt_sequence_count: 1,
      all_source_alts_sequence_complete: true,
    })

    const disagreement = fixture.future_contract_scaffolds.find(
      (item: any) => item.id === 'represented-length-disagreement'
    )
    expect(disagreement.complete_alt.length - disagreement.complete_ref.length).toBe(2)
    expect(disagreement.stored_length_delta_bp).toBe(1)
    expect(disagreement.expected.absolute_mode_status).toBe('UNAVAILABLE_RECONCILIATION_MISMATCH')
  })

  test('contains aggregate/public observations only and no sample identity keys', () => {
    expect(fixture.privacy).toMatch(/aggregate\/public/i)
    const serialized = JSON.stringify(fixture)
    expect(serialized).not.toMatch(/"sample_?id"/i)
    expect(serialized).not.toMatch(/"carrier_?id"/i)
    expect(serialized).not.toMatch(/"person_?id"/i)
  })
})
