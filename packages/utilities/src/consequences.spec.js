import { getCategoryFromConsequence, registerConsequences } from './consequences'

describe('getConsequenceFromCategory', () => {
  it('should return correct category for VEP consequence terms', () => {
    expect(getCategoryFromConsequence('transcript_ablation')).toBe('lof')
    expect(getCategoryFromConsequence('splice_acceptor_variant')).toBe('lof')
    expect(getCategoryFromConsequence('splice_donor_variant')).toBe('lof')
    expect(getCategoryFromConsequence('stop_gained')).toBe('lof')
    expect(getCategoryFromConsequence('frameshift_variant')).toBe('lof')
    expect(getCategoryFromConsequence('stop_lost')).toBe('missense')
    expect(getCategoryFromConsequence('start_lost')).toBe('missense')
    expect(getCategoryFromConsequence('inframe_insertion')).toBe('missense')
    expect(getCategoryFromConsequence('inframe_deletion')).toBe('missense')
    expect(getCategoryFromConsequence('missense_variant')).toBe('missense')
    expect(getCategoryFromConsequence('protein_altering_variant')).toBe('other')
    expect(getCategoryFromConsequence('incomplete_terminal_codon_variant')).toBe('other')
    expect(getCategoryFromConsequence('stop_retained_variant')).toBe('other')
    expect(getCategoryFromConsequence('synonymous_variant')).toBe('synonymous')
    expect(getCategoryFromConsequence('coding_sequence_variant')).toBe('other')
    expect(getCategoryFromConsequence('mature_miRNA_variant')).toBe('other')
    expect(getCategoryFromConsequence('5_prime_UTR_variant')).toBe('other')
    expect(getCategoryFromConsequence('3_prime_UTR_variant')).toBe('other')
    expect(getCategoryFromConsequence('non_coding_transcript_exon_variant')).toBe('other')
    expect(getCategoryFromConsequence('non_coding_exon_variant')).toBe('other')
    expect(getCategoryFromConsequence('NMD_transcript_variant')).toBe('other')
    expect(getCategoryFromConsequence('non_coding_transcript_variant')).toBe('other')
    expect(getCategoryFromConsequence('nc_transcript_variant')).toBe('other')
    expect(getCategoryFromConsequence('downstream_gene_variant')).toBe('other')
    expect(getCategoryFromConsequence('TFBS_ablation')).toBe('other')
    expect(getCategoryFromConsequence('TFBS_amplification')).toBe('other')
    expect(getCategoryFromConsequence('TF_binding_site_variant')).toBe('other')
    expect(getCategoryFromConsequence('regulatory_region_ablation')).toBe('other')
    expect(getCategoryFromConsequence('regulatory_region_amplification')).toBe('other')
    expect(getCategoryFromConsequence('feature_elongation')).toBe('other')
    expect(getCategoryFromConsequence('regulatory_region_variant')).toBe('other')
    expect(getCategoryFromConsequence('feature_truncation')).toBe('other')
    expect(getCategoryFromConsequence('intergenic_variant')).toBe('other')
    expect(getCategoryFromConsequence('intron_variant')).toBe('other')
    expect(getCategoryFromConsequence('splice_region_variant')).toBe('other')
    expect(getCategoryFromConsequence('upstream_gene_variant')).toBe('other')
  })

  it('should return correct category for registered consequences', () => {
    registerConsequences([
      { term: 'lof', category: 'lof' },
      { term: 'mis', category: 'missense' },
      { term: 'syn', category: 'synonymous' },
      { term: 'splice', category: 'other' },
    ])

    expect(getCategoryFromConsequence('lof')).toBe('lof')
    expect(getCategoryFromConsequence('mis')).toBe('missense')
    expect(getCategoryFromConsequence('syn')).toBe('synonymous')
    expect(getCategoryFromConsequence('splice')).toBe('other')
  })
})
