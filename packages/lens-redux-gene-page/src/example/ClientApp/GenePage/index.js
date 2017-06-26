import React, { PropTypes } from 'react'

import GenePageHOC from '../../../containers/GenePage'
import GeneInfo from '../GeneInfo'
import GeneSettings from '../GeneSettings'
import GeneRegion from '../RegionViewer'
import GnomadVariantTable from '../Table'

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
      <GeneSettings />
      <div className={css.summary}>
        <GeneInfo
          gene={gene}
          variantCount={visibleVariants.length}
        />
      </div>
      <GeneRegion/>
      <GnomadVariantTable />
    </div>
  )
}

AppGenePage.propTypes = {
  gene: PropTypes.object,
  isFetching: PropTypes.bool.isRequired,
  visibleVariants: PropTypes.array.isRequired,
}

export default GenePageHOC(AppGenePage)
