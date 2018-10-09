import PropTypes from 'prop-types'
import React from 'react'

import { RegionHoc } from '@broad/region'
import { VariantTable } from '@broad/table'
import { TrackPage, TrackPageSection } from '@broad/ui'

import GnomadPageHeading from '../GnomadPageHeading'
import Settings from '../Settings'
import tableConfig from '../tableConfig'
import { fetchRegion } from './fetch'
import RegionInfo from './RegionInfo'
import RegionViewer from './RegionViewer'

const tooManyVariantsError = /Individual variants can only be returned for regions with fewer than \d+ variants/

const RegionPage = ({ errors, region }) => {
  const showVariants = !(errors && errors.some(err => tooManyVariantsError.test(err.message)))
  return (
    <TrackPage>
      <TrackPageSection>
        <GnomadPageHeading>{`${region.chrom}-${region.start}-${region.stop}`}</GnomadPageHeading>
        <div>
          <RegionInfo showVariants={showVariants} />
        </div>
      </TrackPageSection>
      <RegionViewer coverageStyle={'new'} showVariants={showVariants} />
      {showVariants ? (
        <TrackPageSection>
          <Settings />
          <VariantTable tableConfig={tableConfig} />
        </TrackPageSection>
      ) : (
        <p>
          This region has too many variants to display. To view individual variants, select a
          smaller region.
        </p>
      )}
    </TrackPage>
  )
}

RegionPage.propTypes = {
  errors: PropTypes.arrayOf(
    PropTypes.shape({
      message: PropTypes.string.isRequired,
    })
  ),
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

RegionPage.defaultProps = {
  errors: null,
}

export default RegionHoc(RegionPage, fetchRegion, 'gnomadCombinedVariants')
