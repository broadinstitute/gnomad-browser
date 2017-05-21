import React, { PropTypes } from 'react'

import GenePageHOC from '../../../containers/GenePage'

import GeneSettings from '../GeneSettings'
import GeneRegion from '../RegionViewer'
import GnomadVariantTable from '../Table'

import {
  groupExonsByTranscript,
} from 'react-gnomad'

import css from './styles.css'

const AppGenePage = ({
  currentGene,
  setCurrentGene,
  gene,
  isFetching,
  variants,
  hasVariants,
}) => {
  if (isFetching || !gene) {
    return <div>Loading...!</div>
  }
  console.log(variants)
  return (
    <div className={css.genePage}>
      <GeneSettings
        currentGene={currentGene}
        setCurrentGene={setCurrentGene}
      />
      <h1>{currentGene}</h1>
      {gene.gene_id}
      <GeneRegion
        gene={gene}
      />
    {hasVariants &&
      <GnomadVariantTable variants={variants} />}
    </div>
  )
}

AppGenePage.propTypes = {
  currentGene: PropTypes.string.isRequired,
  gene: PropTypes.object,
}

export default GenePageHOC(AppGenePage)
