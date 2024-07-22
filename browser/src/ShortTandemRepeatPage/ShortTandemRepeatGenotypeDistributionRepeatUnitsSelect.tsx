import React, { Dispatch, SetStateAction } from 'react'

import { Select } from '@gnomad/ui'
import { ShortTandemRepeat } from './ShortTandemRepeatPage'

type Props = {
  shortTandemRepeatOrAdjacentRepeat: ShortTandemRepeat
  repunitPairs: string[]
  value: string
  onChange: Dispatch<SetStateAction<string>>
}

const ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect = ({
  shortTandemRepeatOrAdjacentRepeat,
  value,
  repunitPairs,
  onChange,
}: Props) => {
  // Adjacent repeats do not have classifications for repeat units.
  const isAdjacentRepeat = !shortTandemRepeatOrAdjacentRepeat.associated_diseases
  const repeatUnitClassifications: Record<string, string> = isAdjacentRepeat
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
        onChange={(e: { target: { value: string } }) => {
          onChange(e.target.value)
        }}
      >
        {repunitPairs.length > 1 && <option value="">All</option>}
        <optgroup label="Repeat unit pairs (only pairs found in gnomAD are listed here)">
          {repunitPairs.map((pair) => {
            return (
              <option key={pair} value={pair}>
                {pair
                  .split(' / ')
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
          })}
        </optgroup>
      </Select>
    </label>
  )
}

export default ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect
