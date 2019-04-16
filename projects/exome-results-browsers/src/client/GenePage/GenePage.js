import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { RegionViewer } from '@broad/region-viewer'
import { PageHeading, screenSize } from '@broad/ui'

import browserConfig from '@browser/config'

import StatusMessage from '../StatusMessage'
import { TrackPage, TrackPageSection } from '../TrackPage'
import GeneDataContainer from './GeneDataContainer'
import GeneInfo from './GeneInfo'
import TranscriptTrack from './TranscriptTrack'
import VariantsInGene from './VariantsInGene'

const GeneFullName = styled.span`
  font-size: 0.75em;
  font-weight: 400;
`

class GenePage extends Component {
  state = {
    selectedAnalysisGroup: browserConfig.analysisGroups.overallGroup,
  }

  render() {
    const { geneName, screenSize } = this.props
    const { selectedAnalysisGroup } = this.state

    const isSmallWindow = screenSize.width < 900

    // Subtract 30px for padding on Page component.
    const regionViewerWidth = screenSize.width - 30

    return (
      <GeneDataContainer analysisGroup={selectedAnalysisGroup} geneName={geneName}>
        {({ gene, isLoadingVariants }) => {
          const canonicalCodingExons = gene.transcript.exons.filter(
            exon => exon.feature_type === 'CDS'
          )

          return (
            <TrackPage>
              <TrackPageSection>
                <PageHeading>
                  {gene.gene_name} <GeneFullName>{gene.full_gene_name}</GeneFullName>
                </PageHeading>
                <GeneInfo gene={gene} />
              </TrackPageSection>
              <RegionViewer
                width={regionViewerWidth}
                padding={75}
                regions={canonicalCodingExons}
                leftPanelWidth={100}
                rightPanelWidth={isSmallWindow ? 0 : 100}
              >
                <TranscriptTrack exons={canonicalCodingExons} strand={gene.transcript.strand} />
                {isLoadingVariants ? (
                  <TrackPageSection>
                    <StatusMessage>Loading variants...</StatusMessage>
                  </TrackPageSection>
                ) : (
                  <VariantsInGene
                    gene={gene}
                    selectedAnalysisGroup={selectedAnalysisGroup}
                    onChangeAnalysisGroup={analysisGroup => {
                      this.setState({ selectedAnalysisGroup: analysisGroup })
                    }}
                  />
                )}
              </RegionViewer>
            </TrackPage>
          )
        }}
      </GeneDataContainer>
    )
  }
}

GenePage.propTypes = {
  geneName: PropTypes.string.isRequired,
}

const ConnectedGenePage = connect(state => ({
  screenSize: screenSize(state),
}))(GenePage)

export default ConnectedGenePage
