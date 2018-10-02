const rankedVepConsequences = [
  {
    term: 'transcript_ablation',
    label: 'transcript ablation',
    category: 'lof',
  },
  {
    term: 'splice_acceptor_variant',
    label: 'splice acceptor',
    category: 'lof',
  },
  {
    term: 'splice_donor_variant',
    label: 'splice donor',
    category: 'lof',
  },
  {
    term: 'stop_gained',
    label: 'stop gained',
    category: 'lof',
  },
  {
    term: 'frameshift_variant',
    label: 'frameshift',
    category: 'lof',
  },
  {
    term: 'stop_lost',
    label: 'stop lost',
    category: 'missense',
  },
  {
    term: 'start_lost',
    label: 'start lost',
    category: 'missense',
  },
  {
    term: 'inframe_insertion',
    label: 'inframe insertion',
    category: 'missense',
  },
  {
    term: 'inframe_deletion',
    label: 'inframe deletion',
    category: 'missense',
  },
  {
    term: 'missense_variant',
    label: 'missense',
    category: 'missense',
  },
  {
    term: 'protein_altering_variant',
    label: 'protein altering',
    category: 'other',
  },
  {
    term: 'incomplete_terminal_codon_variant',
    label: 'incomplete terminal codon',
    category: 'other',
  },
  {
    term: 'stop_retained_variant',
    label: 'stop retained',
    category: 'other',
  },
  {
    term: 'synonymous_variant',
    label: 'synonymous',
    category: 'synonymous',
  },
  {
    term: 'coding_sequence_variant',
    label: 'coding sequence',
    category: 'other',
  },
  {
    term: 'mature_miRNA_variant',
    label: 'mature miRNA',
    category: 'other',
  },
  {
    term: '5_prime_UTR_variant',
    label: "5' UTR",
    category: 'other',
  },
  {
    term: '3_prime_UTR_variant',
    label: "3' UTR",
    category: 'other',
  },
  {
    term: 'non_coding_transcript_exon_variant',
    label: 'non coding transcript exon',
    category: 'other',
  },
  {
    term: 'non_coding_exon_variant',
    label: 'non coding exon',
    category: 'other',
  },
  {
    term: 'NMD_transcript_variant',
    label: 'NMD transcript',
    category: 'other',
  },
  {
    term: 'non_coding_transcript_variant',
    label: 'non coding transcript',
    category: 'other',
  },
  {
    term: 'nc_transcript_variant',
    label: 'nc transcript',
    category: 'other',
  },
  {
    term: 'downstream_gene_variant',
    label: 'downstream gene',
    category: 'other',
  },
  {
    term: 'TFBS_ablation',
    label: 'TFBS ablation',
    category: 'other',
  },
  {
    term: 'TFBS_amplification',
    label: 'TFBS amplification',
    category: 'other',
  },
  {
    term: 'TF_binding_site_variant',
    label: 'TF binding site',
    category: 'other',
  },
  {
    term: 'regulatory_region_ablation',
    label: 'regulatory region ablation',
    category: 'other',
  },
  {
    term: 'regulatory_region_amplification',
    label: 'regulatory region amplification',
    category: 'other',
  },
  {
    term: 'feature_elongation',
    label: 'feature elongation',
    category: 'other',
  },
  {
    term: 'regulatory_region_variant',
    label: 'regulatory region',
    category: 'other',
  },
  {
    term: 'feature_truncation',
    label: 'feature truncation',
    category: 'other',
  },
  {
    term: 'intergenic_variant',
    label: 'intergenic variant',
    category: 'other',
  },
  {
    term: 'intron_variant',
    label: 'intron',
    category: 'other',
  },
  {
    term: 'splice_region_variant',
    label: 'splice region',
    category: 'other',
  },
  {
    term: 'upstream_gene_variant',
    label: 'upstream gene',
    category: 'other',
  },
]

const categoryByTerm = Object.create(null)
const labelByTerm = Object.create(null)

export const getCategoryFromConsequence = consequenceTerm => categoryByTerm[consequenceTerm]

export const getLabelForConsequenceTerm = consequenceTerm =>
  labelByTerm[consequenceTerm] || consequenceTerm

export const registerConsequences = consequences => {
  consequences.forEach(consequence => {
    categoryByTerm[consequence.term] = consequence.category
    labelByTerm[consequence.term] = consequence.label
  })
}

registerConsequences(rankedVepConsequences)
