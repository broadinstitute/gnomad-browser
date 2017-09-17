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
// import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import Table from './Table'
import { fetchSchzExomes } from './fetch'

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

const GwasPage = ({
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
      <RegionViewer />
      <Table />
      {/* <GeneSettings /> */}
    </GenePage>
  )
}

GwasPage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}

export default GenePageHOC(GwasPage, fetchSchzExomes)
