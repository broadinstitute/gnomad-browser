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

import { RegionHoc } from '@broad/region'
import { VariantTable } from '@broad/table'

import {
  GenePage,
  Summary,
  TableSection,
} from '@broad/ui'

import RegionInfo from './RegionInfo'
import RegionSettings from './RegionSettings'
import RegionViewer from './RegionViewer'
import tableConfig from './tableConfig'
import { fetchRegion } from './fetch'

const VariantTableWithRouter = withRouter(VariantTable)

const RegionPage = ({
  regionData,
  isFetching,
}) => {
  if (isFetching || !regionData) {
    return <div>Loading...!</div>
  }
  return (
    <GenePage>
      <Summary>
        <RegionInfo />
      </Summary>
      <RegionViewer />
      <RegionSettings />
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
    </GenePage>
  )
}
RegionPage.propTypes = {
  regionData: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}
RegionPage.defaultProps = {
  regionData: null,
}

export default withRouter(RegionHoc(RegionPage, fetchRegion, 'schizophreniaGwasVariants'))
