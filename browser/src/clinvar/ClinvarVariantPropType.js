import PropTypes from 'prop-types'

const ClinvarVariantPropType = PropTypes.shape({
  clinical_significance: PropTypes.string.isRequired,
  clinvar_variation_id: PropTypes.string.isRequired,
  gnomad: PropTypes.shape({
    exome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      filters: PropTypes.arrayOf(PropTypes.string).isRequired,
    }),
    genome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      filters: PropTypes.arrayOf(PropTypes.string).isRequired,
    }),
  }),
  gold_stars: PropTypes.number.isRequired,
  hgvsc: PropTypes.string,
  hgvsp: PropTypes.string,
  in_gnomad: PropTypes.bool.isRequired,
  major_consequence: PropTypes.string,
  pos: PropTypes.number.isRequired,
  review_status: PropTypes.string.isRequired,
  variant_id: PropTypes.string.isRequired,
})

export default ClinvarVariantPropType
