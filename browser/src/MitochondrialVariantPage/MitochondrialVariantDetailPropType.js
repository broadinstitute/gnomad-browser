import PropTypes from 'prop-types'

const MitochondrialVariantDetailPropType = PropTypes.shape({
  alt: PropTypes.string.isRequired,
  an: PropTypes.number.isRequired,
  ac_hom: PropTypes.number.isRequired,
  ac_hom_mnv: PropTypes.number.isRequired,
  ac_het: PropTypes.number.isRequired,
  excluded_ac: PropTypes.number,
  flags: PropTypes.arrayOf(PropTypes.string),
  haplogroup_defining: PropTypes.bool,
  haplogroups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      an: PropTypes.number.isRequired,
      ac_hom: PropTypes.number.isRequired,
      ac_het: PropTypes.number.isRequired,
    })
  ).isRequired,
  max_heteroplasmy: PropTypes.number,
  pos: PropTypes.number.isRequired,
  ref: PropTypes.string.isRequired,
  reference_genome: PropTypes.string.isRequired,
  variant_id: PropTypes.string.isRequired,
})

export default MitochondrialVariantDetailPropType
