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
  setCurrentTableScrollWindow,
  setVariantSort,
  setFocusedVariant,
  setHoveredVariant,
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
        onScroll={({ scrollTop }) => {
          // row height = 25px
          const startIndex = Math.max(0, Math.min(variants.size - 1, Math.floor(scrollTop / 25)))
          const offset = startIndex * 25
          const stopIndex =
            startIndex +
            Math.max(0, Math.min(variants.size - 1, Math.floor((499 + scrollTop - offset) / 25)))
          setCurrentTableScrollWindow({
            startIndex,
            stopIndex,
          })
        }}
        searchText={searchQuery}
      />
    </div>
  )
}
VariantTable.propTypes = {
  variants: PropTypes.any.isRequired,
  setCurrentTableScrollWindow: PropTypes.func.isRequired,
  setVariantSort: PropTypes.func.isRequired,
  setHoveredVariant: PropTypes.func.isRequired,
  setFocusedVariant: PropTypes.func.isRequired,
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
    currentChromosome: geneChromosome(state),
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
        const variantPageUrl = `/variant/${variantId}${ownProps.history.location.search}`
        window.open(variantPageUrl)
      }
    },
    setHoveredVariant: variantId => dispatch(variantActions.setHoveredVariant(variantId)),
    setCurrentTableScrollWindow: scrollWindow =>
      dispatch(tableActions.setCurrentTableScrollWindow(scrollWindow)),
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
