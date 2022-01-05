import PropTypes from 'prop-types'
import React from 'react'

import { Select } from '@gnomad/ui'

const ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect = ({
  shortTandemRepeatOrAdjacentRepeat,
  value,
  onChange,
}) => {
  // Adjacent repeats do not have classifications for repeat units.
  const isAdjacentRepeat = !shortTandemRepeatOrAdjacentRepeat.associated_diseases
  const repeatUnitClassifications = isAdjacentRepeat
    ? {}
    : shortTandemRepeatOrAdjacentRepeat.repeat_units.reduce(
        (acc, repeatUnit) => ({ ...acc, [repeatUnit.repeat_unit]: repeatUnit.classification }),
        {}
      )

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
                  .map(repeatUnit => {
                    const notes = []
                    if (repeatUnitClassifications[repeatUnit]) {
                      notes.push(repeatUnitClassifications[repeatUnit])
                    }
                    if (repeatUnit === shortTandemRepeatOrAdjacentRepeat.reference_repeat_unit) {
                      notes.push('reference')
                    }

                    if (
                      shortTandemRepeatOrAdjacentRepeat.repeat_units.length > 1 &&
                      notes.length > 0
                    ) {
                      return `${repeatUnit} (${notes.join(', ')})`
                    }
                    return repeatUnit
                  })
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
    associated_diseases: PropTypes.arrayOf(PropTypes.object),
    reference_repeat_unit: PropTypes.string.isRequired,
    genotype_distribution: PropTypes.shape({
      repeat_units: PropTypes.arrayOf(
        PropTypes.shape({
          repeat_units: PropTypes.arrayOf(PropTypes.string.isRequired),
        })
      ).isRequired,
    }).isRequired,
    repeat_units: PropTypes.arrayOf(PropTypes.any).isRequired,
  }).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}

export default ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect
