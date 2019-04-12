import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { PageHeading } from '@broad/ui'

import browserConfig from '@browser/config'

import StatusMessage from '../StatusMessage'
import { TrackPage, TrackPageSection } from '../TrackPage'
import VariantDetails from '../VariantDetails/VariantDetails'
import GeneDataContainer from './GeneDataContainer'
import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import VariantTable from './VariantTable'

const GeneFullName = styled.span`
  font-size: 0.75em;
  font-weight: 400;
`

class GenePage extends Component {
  state = {
    selectedAnalysisGroup: browserConfig.analysisGroups.overallGroup,
  }

  render() {
    const { geneName: geneNameParam } = this.props
    const { selectedAnalysisGroup } = this.state

    return (
      <GeneDataContainer analysisGroup={selectedAnalysisGroup} geneName={geneNameParam}>
        {({ gene, isLoadingVariants }) => {
          const { gene_name: geneName, full_gene_name: fullGeneName } = gene
          return (
            <TrackPage>
              <TrackPageSection>
                <PageHeading>
                  {geneName} <GeneFullName>{fullGeneName}</GeneFullName>
                </PageHeading>
                <GeneInfo />
              </TrackPageSection>
              <RegionViewer />
              {isLoadingVariants ? (
                <TrackPageSection>
                  <StatusMessage>Loading variants...</StatusMessage>
                </TrackPageSection>
              ) : (
                <TrackPageSection>
                  <GeneSettings
                    geneId={gene.gene_id}
                    selectedAnalysisGroup={selectedAnalysisGroup}
                    onChangeAnalysisGroup={analysisGroup => {
                      this.setState({ selectedAnalysisGroup: analysisGroup })
                    }}
                  />
                  <VariantTable />
                </TrackPageSection>
              )}
              <VariantDetails />
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

export default GenePage
