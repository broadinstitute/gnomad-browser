/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import Table from '@broad/table'

import {
  actions as activeActions,
  currentTableIndex,
  screenSize,
} from '../resources/active'

import {
  actions as variantActions,
  variantSearchText,
  finalFilteredVariants,
  finalFilteredVariantsCount,
} from '../resources/variants'

const VariantTable = ({
  variants,
  setVariantSort,
  setFocusedVariant,
  setHoveredVariant,
  setCurrentTableScrollData,
  tablePosition,
  searchText,
  title,
  height,
  tableConfig,
  history,
  screenSize,
}) => {
  const tConfig = tableConfig(setVariantSort)
  const scrollBarWidth = 40
  const paddingWidth = tConfig.fields.length * 40
  const cellContentWidth = tConfig.fields.reduce((acc, field) =>
    acc + field.width, 0)
  const calculatedWidth = scrollBarWidth + paddingWidth + cellContentWidth
  // const tableHeight = screenSize.height - 700
  return (
    <div>
      <Table
        title={title}
        height={800}
        tableConfig={tConfig}
        tableData={variants}
        remoteRowCount={variants.size}
        loadMoreRows={() => {}}
        overscan={5}
        loadLookAhead={0}
        onRowClick={setFocusedVariant(history)}
        onRowHover={setHoveredVariant}
        scrollToRow={tablePosition}
        onScroll={setCurrentTableScrollData}
        searchText={searchText}
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
    currentNavigatorPosition: state.active.currentNavigatorPosition,
    screenSize: screenSize(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setVariantSort: sortKey => dispatch(variantActions.setVariantSort(sortKey)),
    // setFocusedVariant: history => variantId =>
    //   dispatch(variantActions.setFocusedVariant(variantId, history)),
    setFocusedVariant: history => variantId => window.open(`http://gnomad.broadinstitute.org/variant/${variantId}`),
    setHoveredVariant: variantId => dispatch(variantActions.setHoveredVariant(variantId)),
    setCurrentTableScrollData: scrollData =>
      dispatch(activeActions.setCurrentTableScrollData(scrollData)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(VariantTable)
