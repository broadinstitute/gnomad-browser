import resolvers from './long_read_variants'

jest.mock('../../queries/long_read_variants', () => ({
  fetchVariantById: jest.fn(),
  fetchVariantsByGene: jest.fn(),
  fetchVariantsByRegion: jest.fn(),
}))

const components = [
  { chrom: '3', start0: 100, end0: 110, motif: 'CAG' },
  { chrom: '3', start0: 120, end0: 130, motif: 'CAG' },
  { chrom: '3', start0: 125, end0: 140, motif: 'CAA' },
]

describe('LongReadVariant tandem-repeat row contracts', () => {
  test('projects the same exact neutral fallback used by the canonical locus response', () => {
    const variant = { tr_locus_components: components }
    expect(resolvers.LongReadVariant.tr_locus_presentation(variant)).toMatchObject({
      source_representation_kind: 'UNKNOWN',
      presentation_layout: 'CLUSTER_FOCUSED',
      presentation_reason: 'MULTI_COMPONENT_FALLBACK',
    })
    expect(resolvers.LongReadVariant.tr_locus_bounds(variant)).toMatchObject({
      component_envelope_start0: 100,
      component_envelope_end0: 140,
      component_envelope_length_bp: 40,
      component_envelope_basis: 'EXACT_ORDERED_COMPONENTS',
    })
    expect(resolvers.LongReadVariant.tr_locus_component_summary(variant)).toEqual({
      ordered_component_count: 3,
      distinct_stored_motif_count: 2,
    })
  })

  test('returns null when no exact ordered component identity is available', () => {
    const variant = { tr_locus_components: [] }
    expect(resolvers.LongReadVariant.tr_locus_presentation(variant)).toBeNull()
    expect(resolvers.LongReadVariant.tr_locus_bounds(variant)).toBeNull()
    expect(resolvers.LongReadVariant.tr_locus_component_summary(variant)).toBeNull()
  })

  test('passes future receipt-backed contracts through without inferring from count', () => {
    const presentation = {
      source_representation_kind: 'VARIATION_CLUSTER',
      presentation_layout: 'CLUSTER_FOCUSED',
      presentation_reason: 'SOURCE_VARIATION_CLUSTER',
      classification_source: 'catalog',
      classification_release: 'v1',
      classification_digest: 'sha256:catalog',
    }
    expect(
      resolvers.LongReadVariant.tr_locus_presentation({
        tr_locus_components: components,
        tr_locus_presentation: presentation,
      })
    ).toBe(presentation)
  })
})
