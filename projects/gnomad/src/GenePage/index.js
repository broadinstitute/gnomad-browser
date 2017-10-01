/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import GenePageHOC from '@broad/gene-page/src/containers/GenePage'
import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import GeneRegion from './RegionViewer'
import Table from './Table'
import { fetchGene } from './fetch'

const GenePage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background-color: #FAFAFA;
  color: black;
  margin-left: 10px;
`

const Summary = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  padding-left: 60px;
  margin-bottom: 10px;
`

const AppGenePage = ({
  gene,
  isFetching,
}) => {
  if (isFetching || !gene) {
    return <div>Loading...!</div>
  }
  return (
    <GenePage>
      <Summary>
        <GeneInfo
          gene={gene}
        />
      </Summary>
      {/* <GeneRegion /> */}
      <GeneSettings />
      <Table />
    </GenePage>
  )
}

AppGenePage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}
AppGenePage.defaultProps = {
  gene: null,
}

export default GenePageHOC(AppGenePage, fetchGene)
