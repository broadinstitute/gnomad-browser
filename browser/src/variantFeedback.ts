import queryString from 'query-string'

export const variantFeedbackUrl = (variant: any, datasetId: any) => {
  if (process.env.REPORT_VARIANT_URL) {
    const params = {}
    if (process.env.REPORT_VARIANT_VARIANT_ID_PARAMETER) {
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      params[process.env.REPORT_VARIANT_VARIANT_ID_PARAMETER] = variant.variant_id
    }
    if (process.env.REPORT_VARIANT_DATASET_PARAMETER) {
      if (datasetId.startsWith('gnomad_r3')) {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        params[process.env.REPORT_VARIANT_DATASET_PARAMETER] = 'gnomAD v3'
      }
      if (datasetId.startsWith('gnomad_r2') || datasetId.startsWith('gnomad_sv_r2')) {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        params[process.env.REPORT_VARIANT_DATASET_PARAMETER] = 'gnomAD v2'
      }
    }
    return `${process.env.REPORT_VARIANT_URL}?${queryString.stringify(params)}`
  }
  return 'mailto:gnomad@broadinstitute.org'
}
