import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { RegionHoc } from '@broad/region'
import { VariantTable } from '@broad/table'
import { GenePage, TableSection } from '@broad/ui'

import GnomadPageHeading from '../GnomadPageHeading'
import Settings from '../Settings'
import tableConfig from '../tableConfig'
import { fetchRegion } from './fetch'
import RegionInfo from './RegionInfo'
import RegionViewer from './RegionViewer'

/**
 * FIXME
 * This section previously had a 97% width left aligned div nested in a 90% width centered div.
 * This imitates the same layout with fewer elements. The horizontal alignment of various sections
 * needs to be made consistent.
 */
const RegionInfoSection = styled.div`
  width: 87%;
  padding-right: 3%;
  margin-bottom: 10px;
`

const RegionPage = ({ region }) => (
  <GenePage>
    <RegionInfoSection>
      <GnomadPageHeading>{`${region.chrom}-${region.start}-${region.stop}`}</GnomadPageHeading>
      <div>
        <RegionInfo />
      </div>
    </RegionInfoSection>
    <RegionViewer coverageStyle={'new'} />
    <TableSection>
      <Settings />
      <VariantTable tableConfig={tableConfig} />
    </TableSection>
  </GenePage>
)

RegionPage.propTypes = {
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

export default RegionHoc(RegionPage, fetchRegion, 'gnomadCombinedVariants')
