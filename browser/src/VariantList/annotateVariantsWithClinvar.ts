import { ClinvarVariant } from '../VariantPage/VariantPage'

type ClinvarAnnotation = {
  clinical_significance?: string
  clinvar_variation_id?: string
}

const annotateVariantsWithClinvar = (
  variants: any[],
  clinvarVariants: ClinvarVariant[] | null | undefined
) => {
  if (!clinvarVariants) {
    return variants
  }

  const clinvarInfo = new Map<string, ClinvarAnnotation>()
  clinvarVariants.forEach((clinvarVariant) => {
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
