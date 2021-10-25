import PropTypes from 'prop-types'

const ShortTandemRepeatRepeatUnitPropType = PropTypes.shape({
  repeat_unit: PropTypes.string.isRequired,
  distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  populations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
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
  repeat_units: PropTypes.arrayOf(PropTypes.string).isRequired,
  allele_size_distribution: PropTypes.shape({
    distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    populations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
      })
    ).isRequired,
    repeat_units: PropTypes.arrayOf(ShortTandemRepeatRepeatUnitPropType).isRequired,
  }).isRequired,
  genotype_distribution: PropTypes.shape({
    distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    populations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
      })
    ).isRequired,
    repeat_units: PropTypes.arrayOf(
      PropTypes.shape({
        repeat_units: PropTypes.arrayOf(PropTypes.string).isRequired,
        distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
        populations: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
          })
        ).isRequired,
      })
    ).isRequired,
  }).isRequired,
})

export const ShortTandemRepeatPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  gene: PropTypes.shape({
    ensembl_id: PropTypes.string.isRequired,
    symbol: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
  }).isRequired,
  associated_diseases: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      symbol: PropTypes.string.isRequired,
      omim_id: PropTypes.string,
      inheritance_mode: PropTypes.string.isRequired,
      repeat_size_classifications: PropTypes.arrayOf(
        PropTypes.shape({
          classification: PropTypes.string.isRequired,
          min: PropTypes.number,
          max: PropTypes.number,
        })
      ).isRequired,
    })
  ).isRequired,
  stripy_id: PropTypes.string,
  reference_region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  reference_repeat_unit: PropTypes.string.isRequired,
  repeat_units: PropTypes.arrayOf(
    PropTypes.shape({
      repeat_unit: PropTypes.string.isRequired,
      classification: PropTypes.string.isRequired,
    })
  ).isRequired,
  allele_size_distribution: PropTypes.shape({
    distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    populations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
      })
    ).isRequired,
    repeat_units: PropTypes.arrayOf(ShortTandemRepeatRepeatUnitPropType).isRequired,
  }).isRequired,
  genotype_distribution: PropTypes.shape({
    distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    populations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
      })
    ).isRequired,
    repeat_units: PropTypes.arrayOf(
      PropTypes.shape({
        repeat_units: PropTypes.arrayOf(PropTypes.string).isRequired,
        distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
        populations: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string.isRequired,
            distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
          })
        ).isRequired,
      })
    ).isRequired,
  }).isRequired,
  adjacent_repeats: PropTypes.arrayOf(ShortTandemRepeatAdjacentRepeatPropType).isRequired,
})
