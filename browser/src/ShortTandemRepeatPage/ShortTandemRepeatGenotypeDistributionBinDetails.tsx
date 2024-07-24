import React from 'react'

import { List, ListItem } from '@gnomad/ui'

import { ShortTandemRepeat, ShortTandemRepeatAdjacentRepeat, Sex } from './ShortTandemRepeatPage'
import { getSelectedGenotypeDistribution } from './shortTandemRepeatHelpers'
import { AncestryGroupId } from '@gnomad/dataset-metadata/gnomadPopulations'

type Props = {
  shortTandemRepeatOrAdjacentRepeat: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat
  selectedAncestryGroup: AncestryGroupId | ''
  selectedSex: Sex | ''
  selectedRepeatUnits: string[] | ''
  repeatUnitPairs: string[][]
  bin: {
    label: string
    xRange: number[]
    yRange: number[]
  }
}

const ShortTandemRepeatGenotypeDistributionBinDetails = ({
  shortTandemRepeatOrAdjacentRepeat,
  selectedAncestryGroup,
  selectedSex,
  selectedRepeatUnits,
  repeatUnitPairs,
  bin,
}: Props) => {
  const genotypeDistribution = getSelectedGenotypeDistribution(shortTandemRepeatOrAdjacentRepeat, {
    selectedAncestryGroup,
    selectedRepeatUnits,
    selectedSex,
  })

  const isInBin = (d: any) =>
    bin.xRange[0] <= d[0] && d[0] <= bin.xRange[1] && bin.yRange[0] <= d[1] && d[1] <= bin.yRange[1]

  return (
    <>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <List>
        {/* @ts-expect-error TS(7031) FIXME: Binding element 'x' implicitly has an 'any' type. */}
        {genotypeDistribution.filter(isInBin).map(([x, y, n]) => (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          <ListItem key={`${x}/${y}`}>
            {x} repeats / {y} repeats: {n} individuals
          </ListItem>
        ))}
      </List>
      {!selectedRepeatUnits && (
        <>
          <h3>Repeat Units</h3>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <List>
            {repeatUnitPairs
              .map((repeatUnits) => ({
                repeatUnits,
                distribution: getSelectedGenotypeDistribution(shortTandemRepeatOrAdjacentRepeat, {
                  selectedAncestryGroup,
                  selectedSex,
                  selectedRepeatUnits: repeatUnits,
                }),
              }))
              .flatMap(({ repeatUnits, distribution }: any) => [
                {
                  repeatUnits,
                  distribution: distribution.filter((d: any) => d[0] >= d[1]).filter(isInBin),
                },
                {
                  repeatUnits: [...repeatUnits].reverse(),
                  distribution: distribution
                    .filter((d: any) => d[0] < d[1])
                    .map((d: any) => [d[1], d[0], d[2]])
                    .filter(isInBin),
                },
              ])
              .filter(({ distribution }: any) => distribution.length > 0)
              .map(({ repeatUnits, distribution }: any) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                <ListItem key={repeatUnits.join('/')}>
                  {repeatUnits.join(' / ')}
                  {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <List>
                    {/* @ts-expect-error TS(7031) FIXME: Binding element 'x' implicitly has an 'any' type. */}
                    {distribution.map(([x, y, n]) => (
                      // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                      <ListItem key={`${x}/${y}`}>
                        {x} repeats / {y} repeats: {n} individuals
                      </ListItem>
                    ))}
                  </List>
                </ListItem>
              ))}
          </List>
        </>
      )}
    </>
  )
}

export default ShortTandemRepeatGenotypeDistributionBinDetails
