/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

const GeneInfoContainer = styled.div`
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

const GeneInfo = ({ gene, variantCount }) => {
  const {
    gene_name,
    gene_id,
    full_gene_name,
    omim_accession,
    schzGeneResults,
  } = gene.toJS()
  return (
    <GeneInfoContainer>
      <GeneName>
        <Symbol>{gene_name}</Symbol>
        <FullName>{full_gene_name}</FullName>
      </GeneName>
      <GeneDetails>
        <GeneAttributes>
          {/* <div><strong>Number of variants:</strong> {variantCount}</div> */}
          <GeneAttribute>
            <strong>Ensembl ID:</strong> {gene_id}
          </GeneAttribute>
          <GeneAttribute>
            <strong>pCaco:</strong> {schzGeneResults.pCaco.toPrecision(3)}
          </GeneAttribute>
          <GeneAttribute>
            <strong>pMeta:</strong> {schzGeneResults.pMeta.toPrecision(3)}
          </GeneAttribute>
        </GeneAttributes>
        <GeneStats>
          <GeneStatsHeader>
            <GeneStatsTitleColumn />
            <GeneStatsCell>LoF count</GeneStatsCell>
            <GeneStatsCell>Missense count</GeneStatsCell>
          </GeneStatsHeader>
          <GeneStatsRow>
            <GeneStatsTitleColumn><strong>Cases</strong></GeneStatsTitleColumn>
            <GeneStatsCell>{schzGeneResults.caseLof}</GeneStatsCell>
            <GeneStatsCell>{schzGeneResults.caseMis}</GeneStatsCell>
          </GeneStatsRow>
          <GeneStatsRow>
            <GeneStatsTitleColumn><strong>Controls</strong></GeneStatsTitleColumn>
            <GeneStatsCell>{schzGeneResults.ctrlLof}</GeneStatsCell>
            <GeneStatsCell>{schzGeneResults.ctrlMis}</GeneStatsCell>
          </GeneStatsRow>
        </GeneStats>

      </GeneDetails>
    </GeneInfoContainer>
  )
}
GeneInfo.propTypes = {
  gene: PropTypes.object.isRequired,
  variantCount: PropTypes.number.isRequired,
}
export default GeneInfo
