import { RepeatCountPlots } from '../types'

export const sourceContextHistogram = (
  overrides: Partial<RepeatCountPlots> = {}
): RepeatCountPlots => ({
  status: 'AVAILABLE_SOURCE_CONTEXT',
  reason_code: null,
  repeat_unit: 'CAG',
  max_repunits: 11,
  allele_status: 'AVAILABLE',
  pair_status: 'AVAILABLE_SOURCE_ENCODING',
  pair_encoding: 'TWO_COPY_CONSISTENT',
  pair_observations: 1,
  source_context: {
    source_uri: 'gs://candidate/fixture.tsv',
    source_generation: 'fixture-generation',
    source_md5_base64: 'fixture-md5',
    source_row_ordinal: '1',
    source_locus_id: '1-100-130-CAG',
    interval_raw: '1:100-130',
    vc_raw: '',
    context_relation: 'EQUAL',
    measurement_kind: 'SOURCE_REPORTED_SIZE',
    unit: 'SOURCE_REPORTED_UNIT',
    semantics_evidence_status: 'PRODUCER_VERSION_UNKNOWN',
    projection_version: 'candidate-fixture-v2',
    receipt_digest: 'fixture-receipt',
  },
  primary_binding: { status: 'NOT_ESTABLISHED', an_concordance: 'NOT_ESTABLISHED' },
  allele_size_distribution: [
    {
      ancestry_group: 'afr',
      sex: 'XX',
      repunit: 'CAG',
      distribution: [
        { repunit_count: 10, frequency: 1 },
        { repunit_count: 11, frequency: 1 },
      ],
    },
  ],
  genotype_distribution: [
    {
      ancestry_group: 'afr',
      sex: 'XX',
      short_allele_repunit: 'CAG',
      long_allele_repunit: 'CAG',
      distribution: [
        { short_allele_repunit_count: 10, long_allele_repunit_count: 11, frequency: 1 },
      ],
    },
  ],
  interaction: {
    interaction_status: 'UNAVAILABLE_SOURCE_IDENTITIES',
    reason: 'Aggregate source only.',
  },
  ...overrides,
})
