import PropTypes from 'prop-types'

const StructuralVariantDetailPropType = PropTypes.shape({
  algorithms: PropTypes.arrayOf(PropTypes.string.isRequired),
  alts: PropTypes.arrayOf(PropTypes.string.isRequired),
  ac: PropTypes.number.isRequired,
  an: PropTypes.number.isRequired,
  chrom: PropTypes.string.isRequired,
  consequences: PropTypes.arrayOf(
    PropTypes.shape({
      consequence: PropTypes.string.isRequired,
      genes: PropTypes.arrayOf(PropTypes.string).isRequired,
    })
  ).isRequired,
  cpx_intervals: PropTypes.arrayOf(PropTypes.string),
  cpx_type: PropTypes.string,
  end_chrom: PropTypes.string.isRequired,
  end_pos: PropTypes.number.isRequired,
  evidence: PropTypes.arrayOf(PropTypes.string).isRequired,
  filters: PropTypes.arrayOf(PropTypes.string.isRequired),
  genes: PropTypes.arrayOf(PropTypes.string).isRequired,
  length: PropTypes.number.isRequired,
  pos: PropTypes.number.isRequired,
  qual: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
  variant_id: PropTypes.string.isRequired,
})

export default StructuralVariantDetailPropType
