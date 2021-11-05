import PropTypes from 'prop-types'
import React from 'react'

import { Select } from '@gnomad/ui'

const ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect = ({
  shortTandemRepeatOrAdjacentRepeat,
  value,
  onChange,
}) => {
  return (
    <label
      htmlFor={`short-tandem-repeat-${shortTandemRepeatOrAdjacentRepeat.id}-genotype-distribution-repeat-units`}
    >
      Repeat units:{' '}
      <Select
        id={`short-tandem-repeat-${shortTandemRepeatOrAdjacentRepeat.id}-genotype-distribution-repeat-units`}
        value={value}
        onChange={e => {
          onChange(e.target.value)
        }}
      >
        {shortTandemRepeatOrAdjacentRepeat.genotype_distribution.repeat_units.length > 1 && (
          <option value="">All</option>
        )}
        {shortTandemRepeatOrAdjacentRepeat.genotype_distribution.repeat_units.map(
          repeatUnitDistribution => {
            const optionValue = repeatUnitDistribution.repeat_units.join(' / ')
            return (
              <option key={optionValue} value={optionValue}>
                {repeatUnitDistribution.repeat_units
                  .map(repeatUnit =>
                    repeatUnit === shortTandemRepeatOrAdjacentRepeat.reference_repeat_unit
                      ? `${repeatUnit} (reference)`
                      : repeatUnit
                  )
                  .join(' / ')}
              </option>
            )
          }
        )}
      </Select>
    </label>
  )
}

ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect.propTypes = {
  shortTandemRepeatOrAdjacentRepeat: PropTypes.shape({
    id: PropTypes.string.isRequired,
    reference_repeat_unit: PropTypes.string.isRequired,
    genotype_distribution: PropTypes.shape({
      repeat_units: PropTypes.arrayOf(
        PropTypes.shape({
          repeat_units: PropTypes.arrayOf(PropTypes.string.isRequired),
        })
      ).isRequired,
    }).isRequired,
  }).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}

export default ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect
