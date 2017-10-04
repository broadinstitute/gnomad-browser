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
import { withRouter, Route } from 'react-router-dom'
import { FetchHoc, VariantTableConnected } from '@broad/gene-page'

import GeneInfo from './ExomePage/GeneInfo'
import GeneSettings from './ExomePage/GeneSettings'
import RegionViewer from './ExomePage/RegionViewer'
// import Table from './ExomePage/Table'
import tableConfig from './ExomePage/tableConfig'
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

const MainSection = styled.div`
  margin-left: 110px;
`

const VariantTable = withRouter(VariantTableConnected)

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
      <MainSection>
        <Route
          exact
          path="/gene/:gene"
          render={() => {
            return (
              <VariantTable
                tableConfig={tableConfig}
                height={600}
              />
            )
          }}
        />
      </MainSection>
    </GenePage>
  )
}
MainPage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}

export default withRouter(FetchHoc(MainPage, fetchSchz))
