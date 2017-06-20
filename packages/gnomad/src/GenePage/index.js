import React, { PropTypes } from 'react'
import GenePageHOC from 'lens-redux-gene-page/lib/containers/GenePage'

import GeneInfo from './GeneInfo'
import GeneSettings from './GeneSettings'
import GeneRegion from './RegionViewer'
import GnomadVariantTable from './Table'

import css from './styles.css'

const AppGenePage = ({
  currentGene,
  setCurrentGene,
  gene,
  isFetching,
  visibleVariants,
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
          variantCount={visibleVariants.length}
        />
      </div>
      <GeneRegion
        gene={gene}
        visibleVariants={visibleVariants}
        exonPadding={exonPadding}
      />
      <GnomadVariantTable />
    </div>
  )
}

AppGenePage.propTypes = {
  currentGene: PropTypes.string.isRequired,
  gene: PropTypes.object,
  setCurrentGene: PropTypes.func.isRequired,
  isFetching: PropTypes.bool.isRequired,
  visibleVariants: PropTypes.array.isRequired,
  exonPadding: PropTypes.number.isRequired,
  setExonPadding: PropTypes.func.isRequired,
}

export default GenePageHOC(AppGenePage)
