import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import { RegionViewer } from '@broad/region-viewer'
import { GenesTrack } from '@broad/track-genes'
import { screenSize, TrackPage, TrackPageSection } from '@broad/ui'

import GnomadPageHeading from '../GnomadPageHeading'
import CoverageTrack from './CoverageTrack'
import { fetchRegion } from './fetch'
import RegionDataContainer from './RegionDataContainer'
import RegionInfo from './RegionInfo'
import VariantsInRegion from './VariantsInRegion'

// eslint-disable-next-line no-shadow
const RegionPage = ({ datasetId, history, region, regionId, screenSize }) => {
  const { chrom, start, stop, genes } = region

  const regionViewerRegions = [
    {
      feature_type: 'region',
      chrom,
      start,
      stop,
    },
  ]

  // Margins have to be kept in sync with styles in ui/Page.js
  const smallScreen = screenSize.width < 900
  const regionViewerWidth = smallScreen ? screenSize.width - 130 : screenSize.width - 290
  return (
    <TrackPage>
      <TrackPageSection>
        <GnomadPageHeading selectedDataset={datasetId}>{regionId}</GnomadPageHeading>
        <div>
          <RegionInfo region={region} />
        </div>
      </TrackPageSection>
      <RegionViewer
        padding={0}
        regions={regionViewerRegions}
        rightPanelWidth={smallScreen ? 0 : 160}
        width={regionViewerWidth}
      >
        <CoverageTrack datasetId={datasetId} chrom={chrom} start={start} stop={stop} />

        <GenesTrack
          genes={genes}
          onGeneClick={gene => {
            history.push(`/gene/${gene.gene_id}`)
          }}
        />

        <VariantsInRegion datasetId={datasetId} region={region} width={regionViewerWidth} />
      </RegionViewer>
    </TrackPage>
  )
}

RegionPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }).isRequired,
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  regionId: PropTypes.string.isRequired,
  screenSize: PropTypes.shape({ width: PropTypes.number.isRequired }).isRequired,
}

const SizedRegionPage = connect(state => ({ screenSize: screenSize(state) }))(RegionPage)
const RegionPageWithRouter = withRouter(SizedRegionPage)

const ConnectedRegionPage = ({ datasetId, regionId }) => (
  <RegionDataContainer fetchRegion={fetchRegion} regionId={regionId}>
    {({ region }) => (
      <RegionPageWithRouter datasetId={datasetId} region={region} regionId={regionId} />
    )}
  </RegionDataContainer>
)

ConnectedRegionPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  regionId: PropTypes.string.isRequired,
}

export default ConnectedRegionPage
