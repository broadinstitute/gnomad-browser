/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { geneData } from '@broad/redux-genes'
import { variantCount } from '@broad/redux-variants'

const GeneInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 1000px;
`

const GeneName = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 10px;
`

const Symbol = styled.h1`
  margin-right: 10px;
`

const FullName = styled.h2`
  font-size: 18px;
`

const GeneDetails = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  ${'' /* padding-right: 400px; */}
  width: 1050px;
`

const GeneAttributes = styled.div`
  display: flex;
  font-size: 14px;
  flex-direction: column;
  align-items: space-between;
  ${'' /* margin-right: 40px; */}
  ${'' /* width: 40%; */}
`

const GeneAttribute = styled.div`
  margin-bottom: 2px;
`

const GeneStats = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;

  ${'' /* width: 60%; */}
`

const GeneStatsRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 20px;
  font-size: 14px;
  border-bottom: 1px solid lightgrey;
`

const GeneStatsHeader = GeneStatsRow.extend`
  font-weight: bold;
  border-bottom: 1px solid black;
`

const GeneStatsCell = styled.div`
  width: 100px;
`

const GeneStatsTitleColumn = GeneStatsCell.extend`
  width: 100px;
`

const GeneInfo = ({ geneData, variantCount }) => {
  if (!geneData) {
    return <div></div>
  }
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
    schzGeneResult,
  } = geneData.toJS()
  return (
    <GeneInfoWrapper>
      <GeneName>
        <Symbol>{gene_name}</Symbol>
        <FullName>{full_gene_name}</FullName>
      </GeneName>
      <GeneDetails>
        <GeneAttributes>
          <div><strong>Number of variants:</strong> {variantCount}</div>
          <GeneAttribute>
            <strong>Ensembl ID:</strong> {gene_id}
          </GeneAttribute>
          <GeneAttribute>
            <strong>p-meta:</strong> {schzGeneResult.pval_meta.toPrecision(3)}
          </GeneAttribute>
        </GeneAttributes>
        <GeneStats>
          <GeneStatsHeader>
            <GeneStatsTitleColumn />
            <GeneStatsCell>LoF</GeneStatsCell>
            <GeneStatsCell>MPC</GeneStatsCell>
          </GeneStatsHeader>
          <GeneStatsRow>
            <GeneStatsTitleColumn><strong>Cases</strong></GeneStatsTitleColumn>
            <GeneStatsCell>{schzGeneResult.case_lof}</GeneStatsCell>
            <GeneStatsCell>{schzGeneResult.case_mpc ? schzGeneResult.case_mpc : 'N/A'}</GeneStatsCell>
          </GeneStatsRow>
          <GeneStatsRow>
            <GeneStatsTitleColumn><strong>Controls</strong></GeneStatsTitleColumn>
            <GeneStatsCell>{schzGeneResult.ctrl_lof}</GeneStatsCell>
            <GeneStatsCell>{schzGeneResult.ctrl_mpc ? schzGeneResult.ctrl_mpc: 'N/A'}</GeneStatsCell>
          </GeneStatsRow>
          <GeneStatsRow>
            <GeneStatsTitleColumn><strong>p-value</strong></GeneStatsTitleColumn>
            <GeneStatsCell>{schzGeneResult.pval_lof.toPrecision(3)}</GeneStatsCell>
            <GeneStatsCell>{schzGeneResult.pval_mpc ? schzGeneResult.pval_mpc.toPrecision(3) : 'N/A'}</GeneStatsCell>
          </GeneStatsRow>
        </GeneStats>

      </GeneDetails>
    </GeneInfoWrapper>
  )
}

GeneInfo.propTypes = {
  geneData: PropTypes.object.isRequired,
  variantCount: PropTypes.number.isRequired,
}

export default connect(
  state => ({
    geneData: geneData(state),
    variantCount: variantCount(state)
  })
)(GeneInfo)
