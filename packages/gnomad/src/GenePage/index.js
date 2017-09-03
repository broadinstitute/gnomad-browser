/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React, { PropTypes } from 'react'

import GenePageHOC from 'lens-redux-gene-page/lib/containers/GenePage'
import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import GeneRegion from './RegionViewer'
import Table from './Table'
import { fetchGene } from './fetch'

import css from './styles.css'

const AppGenePage = ({
  gene,
  isFetching,
  visibleVariants,
}) => {
  if (isFetching || !gene) {
    return <div>Loading...!</div>
  }
  return (
    <div className={css.genePage}>
      <div className={css.summary}>
        <GeneInfo
          gene={gene}
          variantCount={visibleVariants.length}
        />
      </div>
      <GeneRegion/>
      <GeneSettings />
      <Table />
    </div>
  )
}

AppGenePage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
  visibleVariants: PropTypes.array.isRequired,
}

export default GenePageHOC(AppGenePage, fetchGene)
