import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { RegionViewer } from '@broad/region-viewer'
import { GenesTrack } from '@broad/track-genes'

import DocumentTitle from '../DocumentTitle'
import GnomadPageHeading from '../GnomadPageHeading'
import { TrackPage, TrackPageSection } from '../TrackPage'
import CoverageTrack from './CoverageTrack'
import EditRegion from './EditRegion'
import RegionControls from './RegionControls'
import RegionInfo from './RegionInfo'
import VariantsInRegion from './VariantsInRegion'
import StructuralVariantsInRegion from './StructuralVariantsInRegion'

const RegionInfoColumnWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }

  /* Matches responsive styles in AttributeList */
  @media (max-width: 600px) {
    align-items: stretch;
  }
`

const RegionControlsWrapper = styled.div`
  @media (min-width: 1201px) {
    margin-top: 1em;
  }
`

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

  const smallScreen = screenSize.width < 900

  // Subtract 30px for padding on Page component
  const regionViewerWidth = screenSize.width - 30

  return (
    <TrackPage>
      <TrackPageSection>
        <DocumentTitle title={regionId} />
        <GnomadPageHeading
          extra={<EditRegion initialRegion={region} style={{ marginLeft: '1em' }} />}
          selectedDataset={datasetId}
        >
          {regionId}
        </GnomadPageHeading>
        <RegionInfoColumnWrapper>
          <RegionInfo region={region} />
          <RegionControlsWrapper>
            <RegionControls region={region} />
          </RegionControlsWrapper>
        </RegionInfoColumnWrapper>
      </TrackPageSection>
      <RegionViewer
        padding={0}
        regions={regionViewerRegions}
        rightPanelWidth={smallScreen ? 0 : 160}
        width={regionViewerWidth}
      >
        <CoverageTrack
          datasetId={datasetId}
          chrom={chrom}
          showExomeCoverage={datasetId !== 'gnomad_sv_r2'}
          start={start}
          stop={stop}
        />

        <GenesTrack
          genes={genes}
          onGeneClick={gene => {
            history.push(`/gene/${gene.gene_id}`)
          }}
        />

        {datasetId === 'gnomad_sv_r2' ? (
          <StructuralVariantsInRegion region={region} width={regionViewerWidth} />
        ) : (
          <VariantsInRegion datasetId={datasetId} region={region} width={regionViewerWidth} />
        )}
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

export default RegionPage
