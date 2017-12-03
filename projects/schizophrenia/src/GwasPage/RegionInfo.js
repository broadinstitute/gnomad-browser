/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { regionData } from '@broad/gene-page/src/resources/regions'
import { variantCount } from '@broad/redux-variants'

import {
  GeneInfoWrapper,
  GeneNameWrapper,
  GeneSymbol,
  GeneDetails,
  GeneAttributes,
  GeneAttributeKeys,
  GeneAttributeKey,
  GeneAttributeValues,
  GeneAttributeValue,
} from '@broad/ui'

const lof = '#DD2C00'
const missense = 'orange'
const synonymous = '#2E7D32'
const other = '#424242'
const consequencePresentation = {
  missense_variant: { name: 'missense', color: missense },
  synonymous_variant: { name: 'synonymous', color: synonymous },
  upstream_gene_variant: { name: 'upstream gene', color: other },
  downstream_gene_variant: { name: 'downstream gene', color: other },
  intron_variant: { name: 'intron', color: other },
  '3_prime_UTR_variant': { name: "3' UTR", color: other },
  splice_region_variant: { name: 'splice region', color: lof },
  frameshift_variant: { name: 'frameshift', color: lof },
  stop_gained: { name: 'stop gained', color: lof },
  inframe_deletion: { name: 'inframe deletion', color: lof },
}

const GeneAttributesConsequenceCounts = GeneAttributes.extend`
  max-height: 100px;
  flex-wrap: wrap;
  border: 1px solid #000;
`

const getConsequenceColor = (consequence) => {
  if (consequence in consequencePresentation) {
    return consequencePresentation[consequence].color
  }
  return other
}
const getConsequenceName = (consequence) => {
  if (consequence in consequencePresentation) {
    return consequencePresentation[consequence].name
  }
  return consequence
}

const RegionInfo = ({ regionData, variantCount }) => {
  const {
    start,
    stop,
    chrom,
  } = regionData.toJS()
  const getTotalVariants = (totalConsequenceCounts) => {
    return totalConsequenceCounts.reduce((acc, { consequence, count }) => {
      return count + acc
    }, 0)
  }
  // const total = getTotalVariants(total_consequence_counts)
  return (
    <GeneInfoWrapper>
      <GeneNameWrapper>
        <GeneSymbol>{`${chrom}-${start}-${stop}`}</GeneSymbol>
      </GeneNameWrapper>
      <GeneDetails>
        <GeneAttributes>
          <GeneAttributeKeys>
            <GeneAttributeKey>
              Region size:
            </GeneAttributeKey>
            <GeneAttributeKey>
              Total variants:
            </GeneAttributeKey>

          </GeneAttributeKeys>
          <GeneAttributeValues>
            <GeneAttributeValue>
              {(stop - start).toLocaleString()} BP
            </GeneAttributeValue>

          </GeneAttributeValues>
        </GeneAttributes>
        {/* <GeneAttributesConsequenceCounts>
          <GeneAttributeKeys>
            {total_consequence_counts.map(({ consequence, count }) => (
              <GeneAttributeKey key={`${consequence}-key`}>
                <strong style={{ color: getConsequenceColor(consequence) }}>{getConsequenceName(consequence)}</strong>
              </GeneAttributeKey>
            ))}
          </GeneAttributeKeys>
          <GeneAttributeValues>
            {total_consequence_counts.map(({ consequence, count }) => (
              <GeneAttributeValue key={`${consequence}-value`}>
                {count.toLocaleString()}
              </GeneAttributeValue>
            ))}
          </GeneAttributeValues>
        </GeneAttributesConsequenceCounts> */}
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
