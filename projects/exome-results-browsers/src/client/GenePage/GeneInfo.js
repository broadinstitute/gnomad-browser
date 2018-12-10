import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData } from '@broad/redux-genes'
import { variantCount } from '@broad/redux-variants'
import { SectionHeading, Tabs } from '@broad/ui'

import { HelpPopup } from '../help'
import sortByGroup from '../sortByGroup'
import GeneResultsTable from './GeneResultsTable'

const GeneInfoWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;

  @media (max-width: 767px) {
    flex-direction: column;
  }
`

const GeneAttributes = styled.div`
  display: flex;
  flex-direction: column;
  align-items: space-between;
  margin-bottom: 1em;
  font-size: 14px;
`

const GeneAttribute = styled.div`
  margin-bottom: 2px;
`

const GeneResultsWrapper = styled.div`
  min-width: 325px;
`

const GeneInfo = ({ geneData, variantCount }) => {
  if (!geneData) {
    return <div />
  }
  const { gene_id: geneId, overallGeneResult, groupGeneResults } = geneData.toJS()

  return (
    <GeneInfoWrapper>
      <GeneAttributes>
        <GeneAttribute>
          <strong>Ensembl gene ID:</strong> {geneId}
        </GeneAttribute>
        <GeneAttribute>
          <strong>Number of variants:</strong> {variantCount}
        </GeneAttribute>
        <GeneAttribute>
          <strong>p-meta:</strong>{' '}
          {overallGeneResult.pval_meta ? overallGeneResult.pval_meta.toPrecision(3) : '—'}
        </GeneAttribute>
      </GeneAttributes>
      <GeneResultsWrapper>
        <SectionHeading>
          Gene Result <HelpPopup topic="geneResult" />
        </SectionHeading>
        {groupGeneResults.length > 0 ? (
          <Tabs
            tabs={[
              {
                id: overallGeneResult.analysis_group,
                label: overallGeneResult.analysis_group,
                render: () => <GeneResultsTable geneResult={overallGeneResult} />,
              },
              ...sortByGroup(groupGeneResults).map(result => ({
                id: result.analysis_group,
                label: result.analysis_group,
                render: () => <GeneResultsTable geneResult={result} />,
              })),
            ]}
          />
        ) : (
          <GeneResultsTable geneResult={overallGeneResult} />
        )}
      </GeneResultsWrapper>
    </GeneInfoWrapper>
  )
}

GeneInfo.propTypes = {
  geneData: PropTypes.object.isRequired,
  variantCount: PropTypes.number.isRequired,
}

export default connect(state => ({
  geneData: geneData(state),
  variantCount: variantCount(state),
}))(GeneInfo)
