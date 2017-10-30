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

import FetchHoc from '@broad/gene-page/src/containers/FetchHoc'
import VariantTableConnected from '@broad/gene-page/src/containers/VariantTableConnected'

import {
  GenePage,
  Summary,
  TableSection,
} from '@broad/gene-page/src/presentation/UserInterface'

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
}) => {
  if (isFetching || !gene) {
    return <div>Loading...!</div>
  }

  const currentDisease = 'HCM'
  // const currentDisease = 'DCM'

  return (
    <GenePage>
      <Summary>
        <GeneInfo
          currentDisease={currentDisease}
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
              <div>
                <VariantTable
                  tableConfig={tableConfig}
                  height={600}
                />
                <VariantPage currentDisease={currentDisease} />
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
}

export default withRouter(FetchHoc(Page, fetchFunction))
