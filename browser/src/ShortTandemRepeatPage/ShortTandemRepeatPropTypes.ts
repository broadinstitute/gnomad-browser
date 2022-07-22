import PropTypes from 'prop-types'

type ShortTandemRepeatRepeatUnitPropType = {
  repeat_unit: string
  distribution: number[][]
  populations: {
    id: string
    distribution: number[][]
  }[]
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ repeat_unit: Valida... Remove this comment to see the full error message
const ShortTandemRepeatRepeatUnitPropType: PropTypes.Requireable<ShortTandemRepeatRepeatUnitPropType> = PropTypes.shape(
  {
    repeat_unit: PropTypes.string.isRequired,
    distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    populations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
      })
    ).isRequired,
  }
)

type ShortTandemRepeatAdjacentRepeatPropType = {
  id: string
  reference_region: {
    chrom: string
    start: number
    stop: number
  }
  reference_repeat_unit: string
  repeat_units: string[]
  allele_size_distribution: {
    distribution: number[][]
    populations: {
      id: string
      distribution: number[][]
    }[]
    repeat_units: ShortTandemRepeatRepeatUnitPropType[]
  }
  genotype_distribution: {
    distribution: number[][]
    populations: {
      id: string
      distribution: number[][]
    }[]
    repeat_units: {
      repeat_units: string[]
      distribution: number[][]
      populations: {
        id: string
        distribution: number[][]
      }[]
    }[]
  }
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ id: Validator<strin... Remove this comment to see the full error message
const ShortTandemRepeatAdjacentRepeatPropType: PropTypes.Requireable<ShortTandemRepeatAdjacentRepeatPropType> = PropTypes.shape(
  {
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
  }
)
export { ShortTandemRepeatAdjacentRepeatPropType }

type ShortTandemRepeatPropType = {
  id: string
  gene: {
    ensembl_id: string
    symbol: string
    region: string
  }
  associated_diseases: {
    name: string
    symbol: string
    omim_id?: string
    inheritance_mode: string
    repeat_size_classifications: {
      classification: string
      min?: number
      max?: number
    }[]
    notes?: string
  }[]
  stripy_id?: string
  reference_region: {
    chrom: string
    start: number
    stop: number
  }
  reference_repeat_unit: string
  repeat_units: {
    repeat_unit: string
    classification: string
  }[]
  allele_size_distribution: {
    distribution: number[][]
    populations: {
      id: string
      distribution: number[][]
    }[]
    repeat_units: ShortTandemRepeatRepeatUnitPropType[]
  }
  genotype_distribution: {
    distribution: number[][]
    populations: {
      id: string
      distribution: number[][]
    }[]
    repeat_units: {
      repeat_units: string[]
      distribution: number[][]
      populations: {
        id: string
        distribution: number[][]
      }[]
    }[]
  }
  adjacent_repeats: ShortTandemRepeatAdjacentRepeatPropType[]
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ id: Validator<strin... Remove this comment to see the full error message
const ShortTandemRepeatPropType: PropTypes.Requireable<ShortTandemRepeatPropType> = PropTypes.shape(
  {
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
        notes: PropTypes.string,
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
  }
)
export { ShortTandemRepeatPropType }
