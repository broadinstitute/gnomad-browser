import PropTypes from 'prop-types'

type TranscriptConsequencePropType = {
  consequence_terms?: string[]
  domains?: string[]
  gene_id: string
  gene_version: string
  gene_symbol: string
  hgvs?: string
  hgvsc?: string
  hgvsp?: string
  is_canonical?: boolean
  is_mane_select?: boolean
  is_mane_select_version?: boolean
  lof?: string
  lof_flags?: string
  lof_filter?: string
  major_consequence?: string
  polyphen_prediction?: string
  sift_prediction?: string
  transcript_id: string
  transcript_version: string
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ consequence_terms: ... Remove this comment to see the full error message
const TranscriptConsequencePropType: PropTypes.Requireable<TranscriptConsequencePropType> = PropTypes.shape(
  {
    consequence_terms: PropTypes.arrayOf(PropTypes.string),
    domains: PropTypes.arrayOf(PropTypes.string),
    gene_id: PropTypes.string.isRequired,
    gene_version: PropTypes.string.isRequired,
    gene_symbol: PropTypes.string.isRequired,
    hgvs: PropTypes.string,
    hgvsc: PropTypes.string,
    hgvsp: PropTypes.string,
    is_canonical: PropTypes.bool,
    is_mane_select: PropTypes.bool,
    is_mane_select_version: PropTypes.bool,
    lof: PropTypes.string,
    lof_flags: PropTypes.string,
    lof_filter: PropTypes.string,
    major_consequence: PropTypes.string,
    polyphen_prediction: PropTypes.string,
    sift_prediction: PropTypes.string,
    transcript_id: PropTypes.string.isRequired,
    transcript_version: PropTypes.string.isRequired,
  }
)

export default TranscriptConsequencePropType
