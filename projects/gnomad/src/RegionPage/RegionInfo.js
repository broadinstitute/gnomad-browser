/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { regionData } from '@broad/gene-page/src/resources/regions'
import { variantCount } from '@broad/gene-page/src/resources/variants'

import {
  GeneInfoWrapper,
  GeneNameWrapper,
  GeneSymbol,
  GeneDetails,
  GeneAttributes,
  GeneAttribute,
} from '@broad/gene-page/src/presentation/GeneInfoStyles'

const RegionInfo = ({ regionData, variantCount }) => {
  const {
    start,
    stop,
    chrom,
  } = regionData.toJS()
  return (
    <GeneInfoWrapper>
      <GeneNameWrapper>
        <GeneSymbol>{`${chrom}-${start}-${stop}`}</GeneSymbol>
      </GeneNameWrapper>
      <GeneDetails>
        <GeneAttributes>
          <GeneAttribute>
            <strong>Number of variants:</strong> {variantCount}
          </GeneAttribute>
        </GeneAttributes>
      </GeneDetails>
    </GeneInfoWrapper>
  )
}

RegionInfo.propTypes = {
  regionData: PropTypes.object.isRequired,
  variantCount: PropTypes.number.isRequired,
}

export default connect(
  state => ({
    regionData: regionData(state),
    variantCount: variantCount(state)
  })
)(RegionInfo)
