import PropTypes from 'prop-types'

const ShortTandemRepeatRepeatUnitPropType = PropTypes.shape({
  repeat_unit: PropTypes.string.isRequired,
  classification: PropTypes.string,
  repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  populations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    })
  ).isRequired,
})

export const ShortTandemRepeatAdjacentRepeatPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  reference_region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  reference_repeat_unit: PropTypes.string.isRequired,
  repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  populations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    })
  ).isRequired,
  repeat_units: PropTypes.arrayOf(ShortTandemRepeatRepeatUnitPropType).isRequired,
})

export const ShortTandemRepeatPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    ensembl_id: PropTypes.string.isRequired,
    symbol: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
  }).isRequired,
  inheritance_mode: PropTypes.string.isRequired,
  associated_disease: PropTypes.shape({
    name: PropTypes.string.isRequired,
    omim_id: PropTypes.string,
    normal_threshold: PropTypes.number,
    pathogenic_threshold: PropTypes.number,
  }).isRequired,
  stripy_id: PropTypes.string.isRequired,
  reference_region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  reference_repeat_unit: PropTypes.string.isRequired,
  repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  populations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    })
  ).isRequired,
  repeat_units: PropTypes.arrayOf(ShortTandemRepeatRepeatUnitPropType).isRequired,
  adjacent_repeats: PropTypes.arrayOf(ShortTandemRepeatAdjacentRepeatPropType).isRequired,
})
