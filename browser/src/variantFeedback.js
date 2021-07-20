import queryString from 'query-string'

export const variantFeedbackUrl = (variant, datasetId) => {
  if (process.env.REPORT_VARIANT_URL) {
    const params = {}
    if (process.env.REPORT_VARIANT_VARIANT_ID_PARAMETER) {
      params[process.env.REPORT_VARIANT_VARIANT_ID_PARAMETER] = variant.variant_id
    }
    if (process.env.REPORT_VARIANT_DATASET_PARAMETER) {
      if (datasetId.startsWith('gnomad_r3')) {
        params[process.env.REPORT_VARIANT_DATASET_PARAMETER] = 'gnomAD v3'
      }
      if (datasetId.startsWith('gnomad_r2') || datasetId.startsWith('gnomad_sv_r2')) {
        params[process.env.REPORT_VARIANT_DATASET_PARAMETER] = 'gnomAD v2'
      }
    }
    return `${process.env.REPORT_VARIANT_URL}?${queryString.stringify(params)}`
  }
  return 'mailto:gnomad@broadinstitute.org'
}
