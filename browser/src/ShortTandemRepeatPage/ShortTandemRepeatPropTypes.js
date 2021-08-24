import PropTypes from 'prop-types'

export const ShortTandemRepeatVariantPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  repeat_unit: PropTypes.string.isRequired,
  repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  populations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    })
  ).isRequired,
})

export const ShortTandemRepeatPropType = PropTypes.shape({
  locus_id: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    ensembl_id: PropTypes.string.isRequired,
    symbol: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
  }).isRequired,
  inheritance_mode: PropTypes.string.isRequired,
  associated_disease: PropTypes.shape({
    name: PropTypes.string.isRequired,
    omim_id: PropTypes.string.isRequired,
    benign_threshold: PropTypes.number.isRequired,
    pathogenic_threshold: PropTypes.number.isRequired,
  }).isRequired,
  stripy_id: PropTypes.string.isRequired,
  variants: PropTypes.arrayOf(ShortTandemRepeatVariantPropType).isRequired,
})
