import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData } from '@broad/redux-genes'
import { variantCount } from '@broad/redux-variants'

import GeneResultsTable from './GeneResultsTable'

const GeneInfoWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`

const GeneAttributes = styled.div`
  display: flex;
  flex-direction: column;
  align-items: space-between;
  font-size: 14px;
`

const GeneAttribute = styled.div`
  margin-bottom: 2px;
`

const GeneInfo = ({ geneData, variantCount }) => {
  if (!geneData) {
    return <div />
  }
  const { gene_id: geneId, overallGeneResult } = geneData.toJS()

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
      <GeneResultsTable geneResult={overallGeneResult} />
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
