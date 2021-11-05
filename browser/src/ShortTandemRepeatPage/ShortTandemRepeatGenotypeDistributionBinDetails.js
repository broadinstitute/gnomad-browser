import PropTypes from 'prop-types'
import React from 'react'

import { List, ListItem } from '@gnomad/ui'

const ShortTandemRepeatGenotypeDistributionBinDetails = ({ genotypeDistribution, bin }) => {
  return (
    <List>
      {genotypeDistribution
        .filter(
          d =>
            bin.xRange[0] <= d[0] &&
            d[0] <= bin.xRange[1] &&
            bin.yRange[0] <= d[1] &&
            d[1] <= bin.yRange[1]
        )
        .map(([x, y, n]) => (
          <ListItem key={`${x}/${y}`}>
            {x} repeats / {y} repeats: {n} individuals
          </ListItem>
        ))}
    </List>
  )
}

ShortTandemRepeatGenotypeDistributionBinDetails.propTypes = {
  genotypeDistribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  bin: PropTypes.shape({
    label: PropTypes.string.isRequired,
    xRange: PropTypes.arrayOf(PropTypes.number).isRequired,
    yRange: PropTypes.arrayOf(PropTypes.number).isRequired,
  }).isRequired,
}

export default ShortTandemRepeatGenotypeDistributionBinDetails
