import PropTypes from 'prop-types'

const TranscriptConsequencePropType = PropTypes.shape({
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
})

export default TranscriptConsequencePropType
