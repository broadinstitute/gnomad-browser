/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React from 'react'
import PropTypes from 'prop-types'
import { withRouter, Route } from 'react-router-dom'

import { GenePageHoc } from '@broad/redux-genes'
import { VariantTable } from '@broad/table'

import {
  Loading,
  GenePage,
  Summary,
} from '@broad/ui'

import VariantDetails from '../VariantDetails'
import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import tableConfig from './tableConfig'
import { fetchSchz } from './fetch'


const MainPage = ({
  gene,
  isFetching,
  geneNotFound,
}) => {
  if (isFetching) {
    return <Loading><h1>Loading</h1></Loading>
  }
  if (geneNotFound) {
    return <Loading><h1>Gene not found.</h1></Loading>
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
      <Route
        exact
        path="/gene/:gene"
        render={() => <VariantTable tableConfig={tableConfig} />}
      />
      <VariantDetails />
    </GenePage>
  )
}
MainPage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}

export default withRouter(GenePageHoc(MainPage, fetchSchz))
