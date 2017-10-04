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
import { FetchHoc } from '@broad/gene-page'

import GeneInfo from './ExomePage/GeneInfo'
import GeneSettings from './ExomePage/GeneSettings'
import RegionViewer from './ExomePage/RegionViewer'
import Table from './ExomePage/Table'
import { fetchSchz } from './fetch'

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

const MainPage = ({
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
      <GeneSettings />
      <Table />
    </GenePage>
  )
}
MainPage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}

export default FetchHoc(MainPage, fetchSchz)
