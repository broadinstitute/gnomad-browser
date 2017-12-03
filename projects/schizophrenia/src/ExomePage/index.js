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

import FetchHoc from '@broad/gene-page/src/containers/FetchHoc'
import VariantTableConnected from '@broad/gene-page/src/containers/VariantTableConnected'

import {
  GenePage,
  Summary,
  TableSection,
} from '@broad/ui'

import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import tableConfig from './tableConfig'
import { fetchSchz } from './fetch'

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
      <TableSection>
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
      </TableSection>
    </GenePage>
  )
}
MainPage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}

export default withRouter(FetchHoc(MainPage, fetchSchz))
