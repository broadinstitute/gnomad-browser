import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

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

const GeneInfo = ({ gene }) => (
  <GeneInfoWrapper>
    <GeneAttributes>
      <GeneAttribute>
        <strong>Ensembl gene ID:</strong> {gene.gene_id}
      </GeneAttribute>
    </GeneAttributes>
    <GeneResultsWrapper>
      <h2>
        Gene Result <HelpPopup topic="geneResult" />
      </h2>
      {gene.results.length > 1 ? (
        <Tabs
          tabs={sortByGroup(gene.results).map(result => ({
            id: result.analysis_group,
            label: result.analysis_group,
            render: () => <GeneResultsTable geneResult={result} />,
          }))}
        />
      ) : (
        <GeneResultsTable geneResult={gene.results[0]} />
      )}
    </GeneResultsWrapper>
  </GeneInfoWrapper>
)

GeneInfo.propTypes = {
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    results: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
}

export default GeneInfo
