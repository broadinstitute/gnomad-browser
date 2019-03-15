import PropTypes from 'prop-types'

const StructuralVariantPropType = PropTypes.shape({
  ac: PropTypes.number.isRequired,
  an: PropTypes.number.isRequired,
  chrom: PropTypes.string.isRequired,
  consequence: PropTypes.string,
  end_chrom: PropTypes.string.isRequired,
  end_pos: PropTypes.number.isRequired,
  filters: PropTypes.arrayOf(PropTypes.string.isRequired),
  length: PropTypes.number.isRequired,
  pos: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
  variant_id: PropTypes.string.isRequired,
})

export default StructuralVariantPropType
