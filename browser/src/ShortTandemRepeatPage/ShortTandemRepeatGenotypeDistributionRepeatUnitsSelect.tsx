import React from 'react'

import { Select } from '@gnomad/ui'

type Props = {
  shortTandemRepeatOrAdjacentRepeat: {
    id: string
    associated_diseases?: any[]
    reference_repeat_unit: string
    genotype_distribution: {
      repeat_units: {
        repeat_units?: string[]
      }[]
    }
    repeat_units: any[]
  }
  value: string
  onChange: (...args: any[]) => any
}

const ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect = ({
  shortTandemRepeatOrAdjacentRepeat,
  value,
  onChange,
}: Props) => {
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
      Repeat units: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
      <Select
        id={`short-tandem-repeat-${shortTandemRepeatOrAdjacentRepeat.id}-genotype-distribution-repeat-units`}
        value={value}
        onChange={(e: any) => {
          onChange(e.target.value)
        }}
      >
        {shortTandemRepeatOrAdjacentRepeat.genotype_distribution.repeat_units.length > 1 && (
          <option value="">All</option>
        )}
        <optgroup label="Repeat unit pairs (only pairs found in gnomAD are listed here)">
          {shortTandemRepeatOrAdjacentRepeat.genotype_distribution.repeat_units.map(
            (repeatUnitDistribution) => {
              // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
              const optionValue = repeatUnitDistribution.repeat_units.join(' / ')
              return (
                <option key={optionValue} value={optionValue}>
                  {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
                  {repeatUnitDistribution.repeat_units
                    .map((repeatUnit) => {
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
        </optgroup>
      </Select>
    </label>
  )
}

export default ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect
