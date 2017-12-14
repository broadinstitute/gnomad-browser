import { OrderedMap, fromJS } from 'immutable'

export const csq_order = [
  'lof', // category
  'transcript_ablation',
  'splice', // category
  'splice_acceptor_variant',
  'splice_donor_variant',
  'stop_gained',
  'frameshift_variant',
  'stop_lost',
  'start_lost',
  'inframe_insertion',
  'inframe_deletion',
  'mis', // category
  'missense_variant',
  'protein_altering_variant',
  'incomplete_terminal_codon_variant',
  'stop_retained_variant',
  'synonymous_variant',
  'syn', // category
  'coding_sequence_variant',
  'mature_miRNA_variant',
  '5_prime_UTR_variant',
  '3_prime_UTR_variant',
  'non_coding_transcript_exon_variant',
  'non_coding_exon_variant',
  'NMD_transcript_variant',
  'non_coding_transcript_variant',
  'nc_transcript_variant',
  'downstream_gene_variant',
  'TFBS_ablation',
  'TFBS_amplification',
  'TF_binding_site_variant',
  'regulatory_region_ablation',
  'regulatory_region_amplification',
  'feature_elongation',
  'regulatory_region_variant',
  'feature_truncation',
  'intergenic_variant',
  'intron_variant',
  'splice_region_variant',
  'upstream_gene_variant',
]

export const CATEGORY_DEFINITIONS = {
  all: csq_order,
  lof: csq_order.slice(0, csq_order.indexOf('stop_lost')),
  missense: csq_order.slice(
    csq_order.indexOf('stop_lost'),
    csq_order.indexOf('protein_altering_variant')
  ),
}

export const CATEGORY_DEFINITIONS_ORDERED_MAP = OrderedMap({
  lof: csq_order.slice(0, csq_order.indexOf('stop_lost')),
  missense: csq_order.slice(
    csq_order.indexOf('stop_lost'),
    csq_order.indexOf('protein_altering_variant')
  ),
  synonymous: ['synonymous_variant', 'syn'],
  all: csq_order,
})

CATEGORY_DEFINITIONS.missenseAndLof = CATEGORY_DEFINITIONS.lof.concat(CATEGORY_DEFINITIONS.missense)

const CATEGORY_DEFINITIONS_MAP = fromJS(CATEGORY_DEFINITIONS)

export default CATEGORY_DEFINITIONS


export function getCategoryFromConsequence(consequence) {

  return CATEGORY_DEFINITIONS_ORDERED_MAP.findKey((value) => {
    return value.includes(consequence)
  })
}

export function isCategoryLoF(consequence) {
  return CATEGORY_DEFINITIONS_MAP.get('lof').contains(consequence)
}
export function isCategoryMissense(consequence) {
  return CATEGORY_DEFINITIONS_MAP.get('missense').contains(consequence)
}
export function isCategoryMissenseOrLoF(consequence) {
  return CATEGORY_DEFINITIONS_MAP.get('missenseAndLof').contains(consequence)
}


