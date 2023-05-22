import queryString from 'query-string'
import { variantFeedbackDescription } from '@gnomad/dataset-metadata/metadata'

export const variantFeedbackUrl = (variant: any, datasetId: any) => {
  if (process.env.REPORT_VARIANT_URL) {
    const params: Record<string, string> = {}
    if (process.env.REPORT_VARIANT_VARIANT_ID_PARAMETER) {
      params[process.env.REPORT_VARIANT_VARIANT_ID_PARAMETER] = variant.variant_id
    }

    const datasetName = variantFeedbackDescription(datasetId)
    if (datasetName && process.env.REPORT_VARIANT_DATASET_PARAMETER) {
      params[process.env.REPORT_VARIANT_DATASET_PARAMETER] = datasetName
    }
    return `${process.env.REPORT_VARIANT_URL}?${queryString.stringify(params)}`
  }
  return 'mailto:gnomad@broadinstitute.org'
}
