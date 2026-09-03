import { exactStoredMotifDistribution } from './exactStoredMotifDistribution'
import {
  LongReadTrAllele,
  LongReadTrRepresentedLength,
  LongReadTrSequenceCardinality,
} from './types'

const sourceId = 'chr4-test'
const allele = (
  altIndex: number,
  alt: string,
  ac: number,
  populations: LongReadTrAllele['freq']['populations'] = []
): LongReadTrAllele => ({
  variant_id: `${sourceId}~${altIndex}`,
  source_variant_id: sourceId,
  alt_index: altIndex,
  alt_count: 3,
  ref: 'A',
  alt,
  length: alt.length - 1,
  repeat_count: null,
  repeat_count_source: null,
  motif_purity: null,
  freq: { all: { ac, an: 40, af: ac / 40 }, populations },
})

const sequenceCardinality: LongReadTrSequenceCardinality = {
  source_alt_identity_count: 3,
  unique_alt_sequence_count: 3,
  all_source_alts_sequence_complete: true,
  status: 'AVAILABLE_EXACT',
  reason: null,
  algorithm_version: 'test',
}

const representedLength: LongReadTrRepresentedLength = {
  status: 'AVAILABLE_EXACT',
  reason: null,
  represented_ref_length_bp: 0,
  represented_alt_min_length_bp: 3,
  represented_alt_max_length_bp: 9,
  source_delta_provenance: 'SEQUENCE_DERIVED',
  sequence_length_provenance: 'test',
  sequence_source_record_digest: 'a'.repeat(64),
  sequence_content_digest: 'b'.repeat(64),
  anchor_rule: 'VCF_SHARED_LEFT_PADDING_BASE_V1',
  anchor_rule_source: 'test',
  anchor_rule_release: 'test',
  anchor_rule_digest: 'c'.repeat(64),
  reconciliation_status: 'RECONCILED',
}

const build = (
  alleles: LongReadTrAllele[],
  motifs: string[],
  selectedFrequencyId: string | null = null
) =>
  exactStoredMotifDistribution({
    alleles,
    motifs,
    sequenceCardinality: { ...sequenceCardinality, source_alt_identity_count: alleles.length },
    representedLength,
    exactAltCountComplete: true,
    selectedFrequencyId,
  })

describe('exactStoredMotifDistribution', () => {
  test('groups each stored motif by exact whole-ALT occurrences and weights by source ALT AC', () => {
    const result = build(
      [allele(1, 'ACAGCAGCAA', 5), allele(2, 'ACAACAA', 3), allele(3, 'ACCG', 2)],
      ['CAG', 'CAA', 'CCG']
    )
    expect(result).toEqual({
      status: 'available',
      motifs: [
        {
          motif: 'CAG',
          motif_index: 0,
          bins: [
            {
              occurrence_count: 0,
              allele_copies: 5,
              allele_ids: [`${sourceId}~2`, `${sourceId}~3`],
            },
            { occurrence_count: 2, allele_copies: 5, allele_ids: [`${sourceId}~1`] },
          ],
        },
        {
          motif: 'CAA',
          motif_index: 1,
          bins: [
            { occurrence_count: 0, allele_copies: 2, allele_ids: [`${sourceId}~3`] },
            { occurrence_count: 1, allele_copies: 5, allele_ids: [`${sourceId}~1`] },
            { occurrence_count: 2, allele_copies: 3, allele_ids: [`${sourceId}~2`] },
          ],
        },
        {
          motif: 'CCG',
          motif_index: 2,
          bins: [
            {
              occurrence_count: 0,
              allele_copies: 8,
              allele_ids: [`${sourceId}~1`, `${sourceId}~2`],
            },
            { occurrence_count: 1, allele_copies: 2, allele_ids: [`${sourceId}~3`] },
          ],
        },
      ],
    })
  })

  test('preserves duplicate vocabulary positions and longest-match precedence', () => {
    const result = build(
      [allele(1, 'ACAGCAG', 5), allele(2, 'ACAG', 3), allele(3, 'AC', 2)],
      ['CAG', 'CAG', 'CA']
    )
    expect(result.status).toBe('available')
    if (result.status !== 'available') return
    expect(result.motifs[0].bins).toEqual([
      { occurrence_count: 0, allele_copies: 2, allele_ids: [`${sourceId}~3`] },
      { occurrence_count: 1, allele_copies: 3, allele_ids: [`${sourceId}~2`] },
      { occurrence_count: 2, allele_copies: 5, allele_ids: [`${sourceId}~1`] },
    ])
    expect(result.motifs[1].bins).toEqual([
      {
        occurrence_count: 0,
        allele_copies: 10,
        allele_ids: [`${sourceId}~1`, `${sourceId}~2`, `${sourceId}~3`],
      },
    ])
    expect(result.motifs[2].bins).toEqual(result.motifs[1].bins)
  })

  test('uses the selected frequency slice and excludes zero-AC identities from bins', () => {
    const result = build(
      [
        allele(1, 'ACAGCAG', 5, [{ id: 'afr', ac: 0, an: 20, af: 0 }]),
        allele(2, 'ACAG', 3, [{ id: 'afr', ac: 2, an: 20, af: 0.1 }]),
        allele(3, 'AC', 2, [{ id: 'afr', ac: 0, an: 20, af: 0 }]),
      ],
      ['CAG'],
      'afr'
    )
    expect(result).toEqual({
      status: 'available',
      motifs: [
        {
          motif: 'CAG',
          motif_index: 0,
          bins: [{ occurrence_count: 1, allele_copies: 2, allele_ids: [`${sourceId}~2`] }],
        },
      ],
    })
  })

  test.each([
    {
      name: 'missing identity',
      update: (input: Parameters<typeof exactStoredMotifDistribution>[0]) => ({
        ...input,
        alleles: input.alleles.slice(0, 2),
      }),
      reason: 'incomplete_source_alt_identities',
    },
    {
      name: 'missing bytes',
      update: (input: Parameters<typeof exactStoredMotifDistribution>[0]) => ({
        ...input,
        alleles: input.alleles.map((item, index) => (index === 1 ? { ...item, alt: null } : item)),
      }),
      reason: 'incomplete_source_alt_sequences',
    },
    {
      name: 'one over-bound ALT',
      update: (input: Parameters<typeof exactStoredMotifDistribution>[0]) => ({
        ...input,
        alleles: input.alleles.map((item, index) =>
          index === 1 ? { ...item, alt: `A${'CAG'.repeat(667)}` } : item
        ),
      }),
      reason: 'stored_motif_preview_unavailable',
    },
  ])('fails closed for $name', ({ update, reason }) => {
    const input: Parameters<typeof exactStoredMotifDistribution>[0] = {
      alleles: [allele(1, 'ACAGCAG', 5), allele(2, 'ACAG', 3), allele(3, 'AC', 2)],
      motifs: ['CAG'],
      sequenceCardinality,
      representedLength,
      exactAltCountComplete: true,
    }
    expect(exactStoredMotifDistribution(update(input))).toEqual({ status: 'unavailable', reason })
  })
})
