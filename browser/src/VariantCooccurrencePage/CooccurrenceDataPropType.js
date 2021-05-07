import PropTypes from 'prop-types'

const CooccurrenceDataPropType = PropTypes.shape({
  variant_ids: PropTypes.arrayOf(PropTypes.string).isRequired,
  genotype_counts: PropTypes.arrayOf(PropTypes.number).isRequired,
  p_compound_heterozygous: PropTypes.number,
  populations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      genotype_counts: PropTypes.arrayOf(PropTypes.number).isRequired,
      p_compound_heterozygous: PropTypes.number,
    })
  ),
})

export default CooccurrenceDataPropType
