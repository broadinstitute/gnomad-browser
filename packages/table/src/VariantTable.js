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

import { currentChromosome } from '@broad/redux-genes'

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
  // const calculatedWidth = scrollBarWidth + paddingWidth + cellContentWidth
  const tableWidth = (screenSize.width * 0.8) + scrollBarWidth
  const tConfig = tableConfig(setVariantSort, tableWidth, currentChromosome)
  const variants2 = variants // HACK
    .map((v) => {
      if (v.ac_denovo) {
        return v
          .set('ac_case', v.ac_denovo)
          .set('an_case', 46846) // HACK
      }
      return v
    })

  // const paddingWidth = tConfig.fields.length * 40
  // const cellContentWidth = tConfig.fields.reduce((acc, field) =>
    // acc + field.width, 0)
  // const tableHeight = screenSize.width - 700
  return (
    <div>
      <Table
        title={title}
        height={500}
        width={tableWidth}
        tableConfig={tConfig}
        tableData={variants2}
        remoteRowCount={variants.size}
        loadMoreRows={() => {}}
        overscan={5}
        loadLookAhead={0}
        onRowClick={setFocusedVariant(history)}
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
    currentChromosome: currentChromosome(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setVariantSort: sortKey => dispatch(variantActions.setVariantSort(sortKey)),

    setFocusedVariant: history => (variantId, dataset) => {
      console.log(dataset)
      if (dataset === 'exacVariants') {
        window.open(`http://exac.broadinstitute.org/variant/${variantId}`)
      } else if (dataset === 'schizophreniaRareVariants') {
        dispatch(variantActions.setFocusedVariant(variantId, history))
      } else {
        window.open(`http://gnomad.broadinstitute.org/variant/${variantId}`)
      }
    },
    setHoveredVariant: variantId => dispatch(variantActions.setHoveredVariant(variantId)),
    setCurrentTableScrollData: scrollData =>
      dispatch(tableActions.setCurrentTableScrollData(scrollData)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(VariantTable)
