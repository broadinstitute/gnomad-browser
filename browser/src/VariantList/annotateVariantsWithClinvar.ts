const annotateVariantsWithClinvar = (variants: any, clinvarVariants: any) => {
  const clinvarInfo = new Map()
  clinvarVariants.forEach((clinvarVariant: any) => {
    clinvarInfo.set(clinvarVariant.variant_id, {
      clinical_significance: clinvarVariant.clinical_significance,
      clinvar_variation_id: clinvarVariant.clinvar_variation_id,
    })
  })

  return variants.map((variant: any) => ({
    ...variant,
    ...clinvarInfo.get(variant.variant_id),
  }))
}

export default annotateVariantsWithClinvar
