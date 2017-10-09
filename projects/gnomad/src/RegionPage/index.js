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

import RegionHoc from '@broad/gene-page/src/containers/RegionHoc'
import VariantTableConnected from '@broad/gene-page/src/containers/VariantTableConnected'

import RegionInfo from './RegionInfo'
import Settings from '../Settings'
import RegionViewer from './RegionViewer'

import tableConfig from '../tableConfig'
import { fetchRegion } from './fetch'

const RegionPageWrapper = styled.div`
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

const RegionPage = ({
  regionData,
  isFetching,
}) => {
  if (isFetching || !regionData) {
    return <div>Loading...!</div>
  }
  return (
    <RegionPageWrapper>
      <Summary>
        <RegionInfo />
      </Summary>
      <RegionViewer coverageStyle={'new'} />
      <Settings />
      <MainSection>
        <Route
          exact
          path="/region/:regionId"
          render={() => {
            return (
              <VariantTable
                tableConfig={tableConfig}
                height={400}
              />
            )
          }}
        />
      </MainSection>
    </RegionPageWrapper>
  )
}

RegionPage.propTypes = {
  regionData: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}
RegionPage.defaultProps = {
  regionData: null,
}

export default withRouter(RegionHoc(RegionPage, fetchRegion))
