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
  GenePage,
  Summary,
  TableSection,
} from '@broad/ui'

import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import tableConfig from './tableConfig'
import { fetchSchz } from './fetch'

const VariantTableWithRouter = withRouter(VariantTable)

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
              <VariantTableWithRouter
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

export default withRouter(GenePageHoc(MainPage, fetchSchz))
