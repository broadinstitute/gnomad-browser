/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { actions as tableActions, currentTableIndex } from '@broad/table'
import { screenSize } from '@broad/ui'

import {
  actions as variantActions,
  variantSearchText,
  filteredIdList,
  finalFilteredVariants,
  finalFilteredVariantsCount,
} from '@broad/redux-variants'

import { currentChromosome as geneChromosome } from '@broad/redux-genes'
import { currentChromosome as regionChromosome } from '@broad/region'

import { Table } from './index'

const VariantTable = ({
  variants,
  setVariantSort,
  setFocusedVariant,
  setHoveredVariant,
  setCurrentTableScrollData,
  currentChromosome,
  tablePosition,
  searchText,
  title,
  height,
  tableConfig,
  history,
  screenSize,
  filteredIdList,
}) => {
  const scrollBarWidth = 40
  const tableWidth = (screenSize.width * 0.8) + scrollBarWidth
  const tConfig = tableConfig(setVariantSort, tableWidth, currentChromosome)

  return (
    <div>
      <Table
        title={title}
        height={500}
        width={tableWidth}
        tableConfig={tConfig}
        tableData={variants}
        remoteRowCount={variants.size}
        loadMoreRows={() => {}}
        overscan={5}
        loadLookAhead={0}
        onRowClick={setFocusedVariant}
        onRowHover={setHoveredVariant}
        scrollToRow={tablePosition}
        onScroll={setCurrentTableScrollData}
        searchText={searchText}
        filteredIdList={filteredIdList}
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
  searchText: PropTypes.string.isRequired,
  title: PropTypes.string,
  height: PropTypes.number,
  tableConfig: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  screenSize: PropTypes.object.isRequired,
  filteredIdList: PropTypes.any.isRequired,
  // setVisibleInTable: PropTypes.func.isRequired,
}

VariantTable.defaultProps = {
  title: '',
  height: 400,
}
const mapStateToProps = (state) => {
  return {
    variants: finalFilteredVariants(state),
    variantCount: finalFilteredVariantsCount(state),
    tablePosition: currentTableIndex(state),
    searchText: variantSearchText(state),
    currentNavigatorPosition: state.navigator.currentNavigatorPosition,
    screenSize: screenSize(state),
    filteredIdList: filteredIdList(state),
    currentChromosome: geneChromosome(state) || regionChromosome(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setVariantSort: sortKey => dispatch(variantActions.setVariantSort(sortKey)),

    setFocusedVariant: (variantId, dataset) => {
      if (dataset === 'exacVariants') {
        window.open(`http://exac.broadinstitute.org/variant/${variantId}`)
      } else if (dataset === 'schizophreniaRareVariants') {
        dispatch(variantActions.setFocusedVariant(variantId))
      } else {
        window.open(`http://gnomad-beta.broadinstitute.org/variant/${variantId}`)
      }
    },
    setHoveredVariant: variantId => dispatch(variantActions.setHoveredVariant(variantId)),
    setCurrentTableScrollData: scrollData =>
      dispatch(tableActions.setCurrentTableScrollData(scrollData)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(VariantTable)
