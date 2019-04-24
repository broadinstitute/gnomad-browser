import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Tabs } from '@broad/ui'

import browserConfig from '@browser/config'
import GeneResult from '@browser/GeneResult'

import { HelpPopup } from '../help'
import sortByGroup from '../sortByGroup'
import { ExacConstraintTable, GnomadConstraintTable } from './Constraint'

const TablesWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  margin-bottom: 3em;
`

const GeneAttributes = styled.div`
  margin-bottom: 1em;
`

const GeneInfo = ({ gene }) => (
  <div>
    <GeneAttributes>
      <strong>Ensembl gene ID:</strong> {gene.gene_id}
    </GeneAttributes>
    <TablesWrapper>
      <div>
        <h2>
          Gene Result <HelpPopup topic="geneResult" />
        </h2>
        {gene.results.length > 1 ? (
          <Tabs
            tabs={sortByGroup(gene.results).map(result => ({
              id: result.analysis_group,
              label:
                browserConfig.analysisGroups.labels[result.analysis_group] || result.analysis_group,
              render: () => <GeneResult geneResult={result} />,
            }))}
          />
        ) : (
          <GeneResult geneResult={gene.results[0]} />
        )}
      </div>
      <div style={{ minWidth: '415px' }}>
        <h2>Gene Constraint</h2>
        <Tabs
          tabs={[
            {
              id: 'gnomad',
              label: 'gnomAD',
              render: () => (
                <GnomadConstraintTable constraint={gene.transcript.gnomad_constraint} />
              ),
            },
            {
              id: 'exac',
              label: 'ExAC',
              render: () => <ExacConstraintTable constraint={gene.transcript.exac_constraint} />,
            },
          ]}
        />
      </div>
    </TablesWrapper>
  </div>
)

GeneInfo.propTypes = {
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
    results: PropTypes.arrayOf(PropTypes.object).isRequired,
    transcript: PropTypes.shape({
      exac_constraint: PropTypes.objectOf(PropTypes.number),
      gnomad_constraint: PropTypes.objectOf(PropTypes.number),
    }),
  }).isRequired,
}

export default GeneInfo
