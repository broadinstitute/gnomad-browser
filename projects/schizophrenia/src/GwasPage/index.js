/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React, { PropTypes } from 'react'

import GenePageHOC from '@broad/gene-page/src/containers/GenePage'
import Manhattan from '@broad/manhattan'
import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import RegionViewer from './RegionViewer'
import Table from './Table'
import { fetchSchzGenePage } from './fetch'

import css from './styles.css'

import MANHATTAN_DATA from '@resources/gwas-eg.json'  // eslint-disable-line

const GwasPage = ({
  gene,
  isFetching,
}) => {
  if (isFetching || !gene) {
    return <div>Loading...!</div>
  }
  return (
    <div className={css.genePage}>
      <h1 className={css.title}>Schizophrenia genome-wide</h1>
      <h2 className={css.manhattan}>Top {MANHATTAN_DATA.length} hits</h2>
      <Manhattan data={MANHATTAN_DATA} width={1050} height={300}/>
      <div className={css.summary}>
        <GeneInfo
          gene={gene}
        />
      </div>
      <RegionViewer />
      <Table />
      <GeneSettings />
    </div>
  )
}

GwasPage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
}

export default GenePageHOC(GwasPage, fetchSchzGenePage)
