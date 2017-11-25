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
import { VariantTable } from '@broad/table'

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
  margin-top: 40px;
  ${'' /* border: 5px solid yellow; */}
  width: 95%;
  flex-shrink: 0;
  @media (max-width: 900px) {
    padding-left: 0;
    align-items: center;
    margin-top: 80px;
}
`

const Summary = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 95%;
  padding-left: 60px;
  margin-bottom: 10px;
  ${'' /* border: 5px solid blue; */}

  @media (max-width: 900px) {
    padding-left: 0;
    align-items: center;
    justify-content: center;
  }
`

const TableSection = styled.div`
  margin-left: 70px;
  ${'' /* border: 1px solid green; */}
  margin-bottom: 100px;
  @media (max-width: 900px) {
    margin-left: 5px;
    align-items: center;
    margin-top: 10px;
  }
`
const VariantTableWithRouter = withRouter(VariantTable)

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
      <TableSection>
        <Route
          exact
          path="/region/:regionId"
          render={() => {
            return (
              <VariantTableWithRouter
                tableConfig={tableConfig}
                height={400}
              />
            )
          }}
        />
      </TableSection>
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

export default withRouter(RegionHoc(RegionPage, fetchRegion, 'gnomadCombinedVariants'))
