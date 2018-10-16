import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { actions as variantActions } from '@broad/redux-variants'
import { VariantTable } from '@broad/table'
import { ClassicExacButton, SectionHeading, TrackPage, TrackPageSection } from '@broad/ui'

import GnomadPageHeading from '../GnomadPageHeading'
import Settings from '../Settings'
import tableConfig from '../tableConfig'
import { ConstraintTableOrPlaceholder } from './Constraint'
import { exportFetch } from './exportFetch'
import { fetchGnomadGenePage } from './fetch'
import fetchVariantsByGene from './fetchVariantsByGene'
import GeneDataContainer from './GeneDataContainer'
import GeneInfo from './GeneInfo'
import GeneViewer from './RegionViewer'
import StatusMessage from '../StatusMessage'

const BottomButtonSection = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 20px;
`

const ExportVariantsButton = connect(
  null,
  dispatch => ({
    onClick: () => dispatch(variantActions.exportVariantsToCsv(exportFetch)),
  })
)(ClassicExacButton)

const GeneFullName = styled.span`
  font-size: 22px;
  font-weight: 400;
`

const GeneInfoColumnWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  @media (max-width: 1200px) {
    flex-direction: column;
    align-items: center;
  }
`

/* eslint-disable class-methods-use-this */
class GenePage extends Component {
  static propTypes = {
    datasetId: PropTypes.string.isRequired,
    geneIdOrName: PropTypes.string.isRequired,
    transcriptId: PropTypes.string,
  }

  static defaultProps = {
    transcriptId: undefined,
  }

  renderGene = ({ gene, isLoadingVariants }) => {
    const { gene_id: geneId, gene_name: geneSymbol, full_gene_name: fullGeneName } = gene
    return (
      <TrackPage>
        <TrackPageSection>
          <GnomadPageHeading selectedDataset={this.props.datasetId}>
            {geneSymbol} <GeneFullName>{fullGeneName}</GeneFullName>
          </GnomadPageHeading>
          <GeneInfoColumnWrapper>
            <GeneInfo />
            <div>
              <SectionHeading>
                Gene Constraint <QuestionMark display="inline" topic="gene-constraint" />
              </SectionHeading>
              <ConstraintTableOrPlaceholder />
            </div>
          </GeneInfoColumnWrapper>
        </TrackPageSection>
        <GeneViewer datasetId={this.props.datasetId} geneId={geneId} />
        {this.renderVariantTableSection({ isLoadingVariants })}
      </TrackPage>
    )
  }

  renderVariantTableSection({ isLoadingVariants }) {
    if (isLoadingVariants) {
      return (
        <TrackPageSection>
          <StatusMessage>Loading variants...</StatusMessage>
        </TrackPageSection>
      )
    }

    return (
      <TrackPageSection>
        <Settings />
        <VariantTable tableConfig={tableConfig} />
        <BottomButtonSection>
          <ExportVariantsButton>Export variants</ExportVariantsButton>
        </BottomButtonSection>
      </TrackPageSection>
    )
  }

  render() {
    return (
      <GeneDataContainer
        datasetId={this.props.datasetId}
        fetchGene={fetchGnomadGenePage}
        fetchVariants={fetchVariantsByGene}
        geneIdOrName={this.props.geneIdOrName}
        transcriptId={this.props.transcriptId}
      >
        {this.renderGene}
      </GeneDataContainer>
    )
  }
}

export default GenePage
