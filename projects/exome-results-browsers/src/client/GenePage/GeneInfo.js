import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData } from '@broad/redux-genes'
import { variantCount } from '@broad/redux-variants'

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

const GeneStats = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const GeneStatsRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 20px;
  border-bottom: 1px solid lightgrey;
  font-size: 14px;
`

const GeneStatsHeader = GeneStatsRow.extend`
  border-bottom: 1px solid black;
  font-weight: bold;
`

const GeneStatsCell = styled.div`
  width: 100px;
`

const GeneStatsTitleColumn = GeneStatsCell.extend`
  width: 100px;
`

const GeneInfo = ({ geneData, variantCount }) => {
  if (!geneData) {
    return <div />
  }
  const { gene_id: geneId, geneResult } = geneData.toJS()

  return (
    <GeneInfoWrapper>
      <GeneAttributes>
        <div>
          <strong>Number of variants:</strong> {variantCount}
        </div>
        <GeneAttribute>
          <strong>Ensembl ID:</strong> {geneId}
        </GeneAttribute>
        <GeneAttribute>
          <strong>p-meta:</strong>{' '}
          {geneResult.pval_meta ? geneResult.pval_meta.toPrecision(3) : '-'}
        </GeneAttribute>
      </GeneAttributes>
      <GeneStats>
        <GeneStatsHeader>
          <GeneStatsTitleColumn />
          <GeneStatsCell>LoF</GeneStatsCell>
          <GeneStatsCell>MPC</GeneStatsCell>
        </GeneStatsHeader>
        <GeneStatsRow>
          <GeneStatsTitleColumn>
            <strong>Cases</strong>
          </GeneStatsTitleColumn>
          <GeneStatsCell>{geneResult.case_lof || '-'}</GeneStatsCell>
          <GeneStatsCell>{geneResult.case_mpc || '-'}</GeneStatsCell>
        </GeneStatsRow>
        <GeneStatsRow>
          <GeneStatsTitleColumn>
            <strong>Controls</strong>
          </GeneStatsTitleColumn>
          <GeneStatsCell>{geneResult.ctrl_lof || '-'}</GeneStatsCell>
          <GeneStatsCell>{geneResult.ctrl_mpc || '-'}</GeneStatsCell>
        </GeneStatsRow>
        <GeneStatsRow>
          <GeneStatsTitleColumn>
            <strong>p-value</strong>
          </GeneStatsTitleColumn>
          <GeneStatsCell>
            {geneResult.pval_lof ? geneResult.pval_lof.toPrecision(3) : '-'}
          </GeneStatsCell>
          <GeneStatsCell>
            {geneResult.pval_mpc ? geneResult.pval_mpc.toPrecision(3) : '-'}
          </GeneStatsCell>
        </GeneStatsRow>
      </GeneStats>
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
