/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'

import { currentChromosome as geneChromosome } from '@broad/redux-genes'
import {
  actions as variantActions,
  variantSearchQuery,
  finalFilteredVariants,
} from '@broad/redux-variants'
import { currentChromosome as regionChromosome } from '@broad/region'

import Table from './Table'
import { actions as tableActions, currentTableIndex } from './tableRedux'

const NoVariants = styled.div`
  display: flex;
  align-items: center;
  height: ${props => props.height}px;
  justify-content: center;
  font-weight: bold;
  font-size: 20px;
  border: 1px dashed gray;
  margin-top: 20px;
`


const VariantTable = ({
  variants,
  setVariantSort,
  setFocusedVariant,
  setHoveredVariant,
  setCurrentTableScrollData,
  currentChromosome,
  tablePosition,
  searchQuery,
  title,
  tableConfig,
  size,
}) => {
  if (variants.size === 0) {
    return <NoVariants height={500}>No variants found</NoVariants>
  }

  const tConfig = tableConfig(setVariantSort, size.width, currentChromosome)

  return (
    <div>
      <Table
        title={title}
        height={500}
        tableConfig={tConfig}
        tableData={variants}
        remoteRowCount={variants.size}
        loadMoreRows={() => {}}
        overscan={5}
        onRowClick={setFocusedVariant}
        onRowHover={setHoveredVariant}
        scrollToRow={tablePosition}
        onScroll={setCurrentTableScrollData}
        searchText={searchQuery}
      />
    </div>
  )
}
VariantTable.propTypes = {
  variants: PropTypes.any.isRequired,
  setVariantSort: PropTypes.func.isRequired,
  setHoveredVariant: PropTypes.func.isRequired,
  setFocusedVariant: PropTypes.func.isRequired,
  setCurrentTableScrollData: PropTypes.func.isRequired,
  tablePosition: PropTypes.number.isRequired,
  searchQuery: PropTypes.string.isRequired,
  title: PropTypes.string,
  tableConfig: PropTypes.func.isRequired,
  size: PropTypes.shape({
    width: PropTypes.number.isRequired,
  }),
}

VariantTable.defaultProps = {
  size: undefined,
  title: '',
}
const mapStateToProps = (state) => {
  return {
    variants: finalFilteredVariants(state),
    tablePosition: currentTableIndex(state),
    searchQuery: variantSearchQuery(state),
    currentChromosome: geneChromosome(state) || regionChromosome(state),
  }
}
const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    setVariantSort: sortKey => dispatch(variantActions.setVariantSort(sortKey)),

    setFocusedVariant: (variantId, dataset) => {
      if (dataset === 'exacVariants') {
        window.open(`http://exac.broadinstitute.org/variant/${variantId}`)
      } else if (dataset === 'variants' || dataset === 'schizophreniaRareVariants') {
        // Hack to show modal in exome results browsers
        dispatch(variantActions.setFocusedVariant(variantId))
      } else {
        const nextLocation = Object.assign({}, ownProps.history.location, {
          pathname: `/variant/${variantId}`,
        })
        ownProps.history.push(nextLocation)
        // window.open(`http://gnomad-beta.broadinstitute.org/variant/${variantId}`)
      }
    },
    setHoveredVariant: variantId => dispatch(variantActions.setHoveredVariant(variantId)),
    setCurrentTableScrollData: scrollData =>
      dispatch(tableActions.setCurrentTableScrollData(scrollData)),
  }
}

export default withSize()(
  withRouter(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(VariantTable)
  )
)
