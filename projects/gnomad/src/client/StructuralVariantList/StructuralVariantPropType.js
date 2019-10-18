import PropTypes from 'prop-types'

const StructuralVariantPropType = PropTypes.shape({
  ac: PropTypes.number.isRequired,
  an: PropTypes.number.isRequired,
  chrom: PropTypes.string.isRequired,
  chrom2: PropTypes.string,
  consequence: PropTypes.string,
  end: PropTypes.number.isRequired,
  end2: PropTypes.number,
  filters: PropTypes.arrayOf(PropTypes.string.isRequired),
  length: PropTypes.number.isRequired,
  pos: PropTypes.number.isRequired,
  pos2: PropTypes.number,
  type: PropTypes.string.isRequired,
  variant_id: PropTypes.string.isRequired,
})

export default StructuralVariantPropType
