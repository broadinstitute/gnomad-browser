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

import FetchHoc from './FetchHoc'
import VariantTableConnected from '@broad/gene-page/src/containers/VariantTableConnected'

import {
  GenePage,
  Summary,
  TableSection,
} from '@broad/gene-page/src/presentation/UserInterface'

import {
  currentGeneDiseaseData,
} from '../redux'

import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import VariantPage from './Variant'
import tableConfig from './tableConfig'
import fetchFunction from './fetch'

const VariantTable = withRouter(VariantTableConnected)

const Page = ({
  gene,
  isFetching,
  currentGeneDiseaseData,
}) => {
  console.log(currentGeneDiseaseData)
  if (isFetching || !gene) {
    return <div>Loading...!</div>
  }

  if (currentGeneDiseaseData.has('error')) {
    return <div>Gene/disease data not found.</div>
  }

  return (
    <GenePage>
      <Summary>
        <GeneInfo />
      </Summary>
      <RegionViewer />
      <GeneSettings />
      <TableSection>
        <Route
          exact
          path="/gene/:gene"
          render={() => {
            return (
              <div>
                <VariantTable
                  tableConfig={tableConfig}
                  height={600}
                />
                <VariantPage />
              </div>
            )
          }}
        />
      </TableSection>
    </GenePage>
  )
}

Page.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
  currentGeneDiseaseData: PropTypes.any.isRequired,
}

export default withRouter(FetchHoc(Page, fetchFunction))
