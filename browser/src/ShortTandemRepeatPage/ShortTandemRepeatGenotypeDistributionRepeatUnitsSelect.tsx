import React, { Dispatch, SetStateAction } from 'react'

import { Select } from '@gnomad/ui'
import { ShortTandemRepeat, ShortTandemRepeatAdjacentRepeat } from './ShortTandemRepeatPage'
import { genotypeRepunitPairs, isAdjacentRepeat } from './shortTandemRepeatHelpers'

type Props = {
  shortTandemRepeatOrAdjacentRepeat: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat
  selectedRepeatUnits: string[] | ''
  setSelectedRepeatUnits: Dispatch<SetStateAction<string[] | ''>>
}

const ShortTandemRepeatGenotypeDistributionRepeatUnitsSelect = ({
  shortTandemRepeatOrAdjacentRepeat,
  selectedRepeatUnits,
  setSelectedRepeatUnits,
}: Props) => {
  // Adjacent repeats do not have classifications for repeat units.
  const repeatUnitClassifications: Record<string, string> = isAdjacentRepeat(
    shortTandemRepeatOrAdjacentRepeat
  )
    ? {}
    : shortTandemRepeatOrAdjacentRepeat.repeat_units.reduce(
        (acc, repeatUnit) => ({ ...acc, [repeatUnit.repeat_unit]: repeatUnit.classification }),
        {}
      )

  const repunitPairs = genotypeRepunitPairs(shortTandemRepeatOrAdjacentRepeat)

  if (repunitPairs.length === 1) {
    return null
  }
  return (
    <label
      htmlFor={`short-tandem-repeat-${shortTandemRepeatOrAdjacentRepeat.id}-genotype-distribution-repeat-units`}
    >
      Repeat units: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
      <Select
        id={`short-tandem-repeat-${shortTandemRepeatOrAdjacentRepeat.id}-genotype-distribution-repeat-units`}
        value={selectedRepeatUnits === '' ? '' : selectedRepeatUnits.join(' / ')}
        onChange={({ target: { value } }: { target: { value: string } }) => {
          const newPair: string[] | '' = value === '' ? '' : value.split(' / ')
          setSelectedRepeatUnits(newPair)
        }}
      >
        <option value="">All</option>
        <optgroup label="Repeat unit pairs (only pairs found in gnomAD are listed here)">
          {repunitPairs.map((pair) => {
            return (
              <option key={pair.join(' / ')} value={pair.join(' / ')}>
                {pair
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
