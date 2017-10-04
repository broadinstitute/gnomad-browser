/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import VariantTable from '@broad/table'

import { actions as activeActions } from '@broad/gene-page/src/resources/active'

import {
  visibleVariants,
  tablePosition,
  searchText,
  searchFilteredVariants,
  actions as tableActions
} from '@broad/gene-page/src/resources/table'

import { tableConfig } from './tableConfig'

import css from './styles.css'
const GnomadVariantTable = ({
  visibleVariants,
  setVariantSort,
  setHoveredVariant,
  setCurrentTableIndex,
  setCurrentTableScrollData,
  tablePosition,
  searchText,
}) => {
  const tConfig = tableConfig(setVariantSort)

  const scrollBarWidth = 40
  const paddingWidth = tConfig.fields.length * 40
  const cellContentWidth = tConfig.fields.reduce((acc, field) =>
    acc + field.width, 0)
  const calculatedWidth = scrollBarWidth + paddingWidth + cellContentWidth
  return (
    <div className={css.tableContainer}>
      <VariantTable
        css={css}
        title={''}
        height={600}
        width={calculatedWidth}
        tableConfig={tConfig}
        tableData={visibleVariants}
        remoteRowCount={visibleVariants.size}
        loadMoreRows={() => {}}
        overscan={20}
        loadLookAhead={0}
        onRowClick={setHoveredVariant}
        scrollToRow={tablePosition}
        scrollCallback={setCurrentTableIndex}
        onScroll={setCurrentTableScrollData}
        searchText={searchText}
      />
    </div>
  )
}
GnomadVariantTable.propTypes = {
  visibleVariants: PropTypes.any.isRequired,
  setVariantSort: PropTypes.func.isRequired,
  setHoveredVariant: PropTypes.func.isRequired,
  setCurrentTableIndex: PropTypes.func.isRequired,
  setCurrentTableScrollData: PropTypes.func.isRequired,
  tablePosition: PropTypes.number.isRequired,
  searchText: PropTypes.string.isRequired,
  // setVisibleInTable: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => {
  return {
    // visibleVariants: visibleVariants(state),
    visibleVariants: searchFilteredVariants(state),
    tablePosition: tablePosition(state),
    searchText: searchText(state),
    currentNavigatorPosition: state.active.currentNavigatorPosition,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setVariantSort: sortKey => dispatch(tableActions.setVariantSort(sortKey)),
    setHoveredVariant: variantId => dispatch(activeActions.setHoveredVariant(variantId)),
    setCurrentTableIndex: index => dispatch(activeActions.setCurrentTableIndex(index)),
    setCurrentTableScrollData: scrollData => dispatch(activeActions.setCurrentTableScrollData(scrollData)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(GnomadVariantTable)
