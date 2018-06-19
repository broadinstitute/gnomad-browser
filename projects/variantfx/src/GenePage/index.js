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

import FetchHoc from './FetchHoc'
import { VariantTable } from '@broad/table'

import {
  GenePage,
  Summary,
  TableSection,
  SectionTitle,
  GeneInfoWrapper,
  GeneNameWrapper,
  GeneSymbol,
} from '@broad/ui'

import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import tableConfig from './tableConfig'
import fetchFunction from './fetch'


const SectionTitleIndent = SectionTitle.extend`
  margin-left: 70px;
  margin-right: 70px;
`

const Page = ({
  gene,
  isFetching,
  currentGeneDiseaseData,
}) => {
  if (isFetching || !gene) {
    return <div>Loading...!</div>
  }

  if (currentGeneDiseaseData.has('error')) {
    return (
      <GenePage>
        <Summary>
          <GeneInfoWrapper>
            <GeneNameWrapper>
              <GeneSymbol>
                Disease data not found for {gene.get('gene_name')}
              </GeneSymbol>
            </GeneNameWrapper>
          </GeneInfoWrapper>
        </Summary>
      </GenePage>
    )
  }

  return (
    <GenePage>
      <Summary>
        <GeneInfo />
      </Summary>
      <SectionTitleIndent>Positional distribution</SectionTitleIndent>
      <RegionViewer />
      <GeneSettings />
      <SectionTitleIndent>Variant table</SectionTitleIndent>
      <TableSection>
        <Route
          exact
          path="/gene/:gene"
          render={() => <VariantTable tableConfig={tableConfig} />}
        />
      </TableSection>
    </GenePage>
  )
}

Page.propTypes = {
  gene: PropTypes.object,  // eslint-disable-line
  isFetching: PropTypes.bool.isRequired,
  currentGeneDiseaseData: PropTypes.any.isRequired,
}

export default withRouter(FetchHoc(Page, fetchFunction))
