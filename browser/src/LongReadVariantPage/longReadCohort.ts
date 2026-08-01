export type LongReadCohort = 'hgsvc_hprc' | 'aou'

export const parseLongReadCohort = (value: unknown): LongReadCohort | undefined =>
  value === 'hgsvc_hprc' || value === 'aou' ? value : undefined

export const longReadVariantUrl = (variantId: string, cohort: LongReadCohort) =>
  `/variant/${variantId}?dataset=gnomad_r4_lr&lr_cohort=${cohort}`
