import PropTypes from 'prop-types'

const TranscriptConsequencePropType = PropTypes.shape({
  biotype: PropTypes.string,
  consequence_terms: PropTypes.arrayOf(PropTypes.string),
  gene_id: PropTypes.string.isRequired,
  gene_symbol: PropTypes.string.isRequired,
  hgvs: PropTypes.string,
  hgvsc: PropTypes.string,
  hgvsp: PropTypes.string,
  lof: PropTypes.string,
  lof_flags: PropTypes.string,
  lof_filter: PropTypes.string,
  major_consequence: PropTypes.string,
  polyphen_prediction: PropTypes.string,
  sift_prediction: PropTypes.string,
  transcript_id: PropTypes.string.isRequired,
})

export default TranscriptConsequencePropType
