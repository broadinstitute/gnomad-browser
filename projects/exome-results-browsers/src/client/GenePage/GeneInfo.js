import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData } from '@broad/redux-genes'
import { variantCount } from '@broad/redux-variants'
import { Tabs } from '@broad/ui'

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
  margin-top: 1.25em;
  margin-bottom: 1em;
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
  const { gene_id: geneId, results } = geneData.toJS()

  return (
    <GeneInfoWrapper>
      <GeneAttributes>
        <GeneAttribute>
          <strong>Ensembl gene ID:</strong> {geneId}
        </GeneAttribute>
        <GeneAttribute>
          <strong>Number of variants:</strong> {variantCount}
        </GeneAttribute>
      </GeneAttributes>
      <GeneResultsWrapper>
        <h2>
          Gene Result <HelpPopup topic="geneResult" />
        </h2>
        {results.length > 1 ? (
          <Tabs
            tabs={sortByGroup(results).map(result => ({
              id: result.analysis_group,
              label: result.analysis_group,
              render: () => <GeneResultsTable geneResult={result} />,
            }))}
          />
        ) : (
          <GeneResultsTable geneResult={results[0]} />
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
