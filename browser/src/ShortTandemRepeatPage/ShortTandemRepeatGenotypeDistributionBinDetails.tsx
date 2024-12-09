import React from 'react'

import { List, ListItem } from '@gnomad/ui'

import {
  ShortTandemRepeat,
  ShortTandemRepeatAdjacentRepeat,
  GenotypeDistributionItem,
} from './ShortTandemRepeatPage'

import { getSelectedGenotypeDistribution } from './shortTandemRepeatHelpers'

import { Sex } from './ShortTandemRepeatAlleleSizeDistributionPlot'

type Props = {
  shortTandemRepeatOrAdjacentRepeat: ShortTandemRepeat | ShortTandemRepeatAdjacentRepeat
  selectedPopulation: string | ''
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
  selectedPopulation,
  selectedSex,
  selectedRepeatUnits,
  repeatUnitPairs,
  bin,
}: Props) => {
  const genotypeDistribution = getSelectedGenotypeDistribution(shortTandemRepeatOrAdjacentRepeat, {
    selectedPopulation,
    selectedRepeatUnits,
    selectedSex,
  })

  const isInBin = (item: GenotypeDistributionItem) =>
    bin.xRange[0] <= item.long_allele_repunit_count &&
    item.long_allele_repunit_count <= bin.xRange[1] &&
    bin.yRange[0] <= item.short_allele_repunit_count &&
    item.short_allele_repunit_count <= bin.yRange[1]

  return (
    <>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <List>
        {genotypeDistribution
          .filter(isInBin)
          .map(({ long_allele_repunit_count, short_allele_repunit_count, frequency }) => (
            // @ts-expect-error TS(2769) FIXME: No overload matches this call.
            <ListItem key={`${long_allele_repunit_count}/${short_allele_repunit_count}`}>
              {long_allele_repunit_count} repeats / {short_allele_repunit_count} repeats:{' '}
              {frequency} individuals
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
                  selectedPopulation,
                  selectedSex,
                  selectedRepeatUnits: repeatUnits,
                }),
              }))
              .flatMap(({ repeatUnits, distribution }) => [
                {
                  repeatUnits,
                  distribution: distribution
                    .filter((d) => d.long_allele_repunit_count >= d.short_allele_repunit_count)
                    .filter(isInBin),
                },
                {
                  repeatUnits: [...repeatUnits].reverse(),
                  distribution: distribution
                    .filter((d) => d.long_allele_repunit_count < d.short_allele_repunit_count)
                    .map((d) => ({
                      ...d,
                      long_allele_repunit_count: d.short_allele_repunit_count,
                      short_allele_repunit_count: d.long_allele_repunit_count,
                    }))
                    .filter(isInBin),
                },
              ])
              .map(({ repeatUnits, distribution }) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                <ListItem key={repeatUnits.join('/')}>
                  {repeatUnits.join(' / ')}
                  {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <List>
                    {distribution.map(
                      ({ short_allele_repunit_count, long_allele_repunit_count, frequency }) => (
                        // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                        <ListItem
                          key={`${long_allele_repunit_count}/${short_allele_repunit_count}`}
                        >
                          {long_allele_repunit_count} repeats / {short_allele_repunit_count}{' '}
                          repeats: {frequency} individuals
                        </ListItem>
                      )
                    )}
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
