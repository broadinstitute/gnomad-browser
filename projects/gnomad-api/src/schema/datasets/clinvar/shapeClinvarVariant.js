import { getConsequenceForContext } from '../shared/transcriptConsequence'

const shapeClinvarVariant = context => {
  const getConsequence = getConsequenceForContext(context)

  return esHit => {
    const variantData = esHit._source

    const transcriptConsequence = getConsequence(variantData) || {}

    return {
      // Variant ID fields
      variant_id: variantData.variant_id,
      reference_genome: context.referenceGenome,
      chrom: variantData.chrom,
      pos: variantData.locus.position,
      ref: variantData.alleles[0],
      alt: variantData.alleles[1],
      // ClinVar specific fields
      clinical_significance: variantData.clinical_significance,
      clinvar_variation_id: variantData.clinvar_variation_id,
      gold_stars: variantData.gold_stars,
      major_consequence: transcriptConsequence.major_consequence,
      review_status: variantData.review_status,
    }
  }
}

export default shapeClinvarVariant
