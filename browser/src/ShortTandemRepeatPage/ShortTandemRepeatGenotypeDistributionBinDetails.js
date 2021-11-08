import PropTypes from 'prop-types'
import React from 'react'

import { List, ListItem } from '@gnomad/ui'

import {
  ShortTandemRepeatPropType,
  ShortTandemRepeatAdjacentRepeatPropType,
} from './ShortTandemRepeatPropTypes'
import { getSelectedGenotypeDistribution } from './shortTandemRepeatHelpers'

const ShortTandemRepeatGenotypeDistributionBinDetails = ({
  shortTandemRepeatOrAdjacentRepeat,
  selectedPopulationId,
  selectedRepeatUnits,
  bin,
}) => {
  const genotypeDistribution = getSelectedGenotypeDistribution(shortTandemRepeatOrAdjacentRepeat, {
    selectedPopulationId,
    selectedRepeatUnits,
  })

  const isInBin = d =>
    bin.xRange[0] <= d[0] && d[0] <= bin.xRange[1] && bin.yRange[0] <= d[1] && d[1] <= bin.yRange[1]

  return (
    <>
      <List>
        {genotypeDistribution.filter(isInBin).map(([x, y, n]) => (
          <ListItem key={`${x}/${y}`}>
            {x} repeats / {y} repeats: {n} individuals
          </ListItem>
        ))}
      </List>
      {!selectedRepeatUnits && (
        <>
          <h3>Repeat Units</h3>
          <List>
            {shortTandemRepeatOrAdjacentRepeat.genotype_distribution.repeat_units
              .map(repeatUnitsDistribution => repeatUnitsDistribution.repeat_units)
              .map(repeatUnits => ({
                repeatUnits,
                distribution: getSelectedGenotypeDistribution(shortTandemRepeatOrAdjacentRepeat, {
                  selectedPopulationId,
                  selectedRepeatUnits: repeatUnits.join(' / '),
                }),
              }))
              .flatMap(({ repeatUnits, distribution }) => [
                {
                  repeatUnits,
                  distribution: distribution.filter(d => d[0] >= d[1]).filter(isInBin),
                },
                {
                  repeatUnits: [...repeatUnits].reverse(),
                  distribution: distribution
                    .filter(d => d[0] < d[1])
                    .map(d => [d[1], d[0], d[2]])
                    .filter(isInBin),
                },
              ])
              .filter(({ distribution }) => distribution.length > 0)
              .map(({ repeatUnits, distribution }) => (
                <ListItem key={repeatUnits.join('/')}>
                  {repeatUnits.join(' / ')}
                  <List>
                    {distribution.map(([x, y, n]) => (
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

ShortTandemRepeatGenotypeDistributionBinDetails.propTypes = {
  shortTandemRepeatOrAdjacentRepeat: PropTypes.oneOfType([
    ShortTandemRepeatPropType,
    ShortTandemRepeatAdjacentRepeatPropType,
  ]).isRequired,
  selectedPopulationId: PropTypes.string.isRequired,
  selectedRepeatUnits: PropTypes.string.isRequired,
  bin: PropTypes.shape({
    label: PropTypes.string.isRequired,
    xRange: PropTypes.arrayOf(PropTypes.number).isRequired,
    yRange: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
}

export default ShortTandemRepeatGenotypeDistributionBinDetails
