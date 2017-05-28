import React, { PropTypes } from 'react'

import GenePageHOC from '../../../containers/GenePage'
import GeneInfo from '../GeneInfo'
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
  minimal_gnomad_variants,
  exonPadding,
  setExonPadding,
}) => {
  if (isFetching || !gene) {
    return <div>Loading...!</div>
  }
  return (
    <div className={css.genePage}>
      <GeneSettings
        currentGene={currentGene}
        setCurrentGene={setCurrentGene}
        setExonPadding={setExonPadding}
      />
      <div className={css.summary}>
        <GeneInfo
          gene={gene}
          variantCount={minimal_gnomad_variants.length}
        />
      </div>
      <GeneRegion
        gene={gene}
        minimal_gnomad_variants={minimal_gnomad_variants}
        exonPadding={exonPadding}
      />
      <GnomadVariantTable />
    </div>
  )
}

AppGenePage.propTypes = {
  currentGene: PropTypes.string.isRequired,
  gene: PropTypes.object,
}

export default GenePageHOC(AppGenePage)
