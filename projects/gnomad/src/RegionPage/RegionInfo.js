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

const GeneDetailsModified = GeneDetails.extend`
  width: 100%;
  ${'' /* border: 1px solid red; */}

`
const GeneAttributesModified = GeneAttributes.extend`
  flex-direction: row;
  flex-wrap: wrap ;
  width: 100%;
  ${'' /* border: 1px solid blue; */}
`
const GeneAttributeModified = GeneAttribute.extend`
  width: 25%;
  margin-right: 50px;
  ${'' /* border: 1px solid yellow; */}
`

const lof = '#DD2C00'
const missense = 'orange'
const synonymous = '#2E7D32'
const other = '#424242'
const consequencePresentation = {
  missense_variant: { name: 'missense', color: missense },
  synonymous_variant: { name: 'synonymous', color: lof },
  upstream_gene_variant: { name: 'upstream gene', color: other },
  downstream_gene_variant: { name: 'downstream gene', color: other },
  intron_variant: { name: 'intron', color: other },
  '3_prime_UTR_variant': { name: "3' UTR", color: other },
  splice_region_variant: { name: 'splice region', color: lof },
  frameshift_variant: { name: 'frameshift', color: lof },
  stop_gained: { name: 'stop gained', color: lof },
  inframe_deletion: { name: 'inframe deletion', color: lof },
}

const getConsequenceColor = (consequence) => {
  if (consequence in consequencePresentation) {
    return consequencePresentation[consequence].color
  }
  return other
}
const getConsequenceName = (consequence) => {
  if (consequence in consequencePresentation) {
    console.log(consequence)
    return consequencePresentation[consequence].name
  }
  return consequence
}

const RegionInfo = ({ regionData, variantCount }) => {
  const {
    start,
    stop,
    chrom,
    gnomad_consequence_buckets: { total_consequence_counts }
  } = regionData.toJS()
  const getTotalVariants = (totalConsequenceCounts) => {
    return totalConsequenceCounts.reduce((acc, { consequence, count }) => {
      return count + acc
    }, 0)
  }
  const total = getTotalVariants(total_consequence_counts)
  console.log(total)
  return (
    <GeneInfoWrapper>
      <GeneNameWrapper>
        <GeneSymbol>{`${chrom}-${start}-${stop}`}</GeneSymbol>
      </GeneNameWrapper>
      <GeneDetailsModified>
        <GeneAttributesModified>
          <GeneAttributeModified>
            <strong>Region size:</strong> {(stop - start).toLocaleString()} BP
          </GeneAttributeModified>
          <GeneAttributeModified>
            <strong>Total variants:</strong> {total.toLocaleString()}
          </GeneAttributeModified>
          {total_consequence_counts.map(({ consequence, count }) => (
            <GeneAttributeModified key={consequence}>
              <strong style={{ color: getConsequenceColor(consequence) }}>{getConsequenceName(consequence)}:</strong> {count.toLocaleString()}
            </GeneAttributeModified>
          ))}
        </GeneAttributesModified>
      </GeneDetailsModified>
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
