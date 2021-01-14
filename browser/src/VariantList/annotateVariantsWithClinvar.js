const annotateVariantsWithClinvar = (variants, clinvarVariants) => {
  const clinvarInfo = new Map()
  clinvarVariants.forEach(clinvarVariant => {
    clinvarInfo.set(clinvarVariant.variant_id, {
      clinical_significance: clinvarVariant.clinical_significance,
      clinvar_variation_id: clinvarVariant.clinvar_variation_id,
    })
  })

  return variants.map(variant => ({
    ...variant,
    ...clinvarInfo.get(variant.variant_id),
  }))
}

export default annotateVariantsWithClinvar
