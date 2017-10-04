/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import VariantTable from '@broad/table'

import { tablePosition, actions as activeActions } from '@broad/gene-page/src/resources/active'

import {
  variantSearchText,
  finalFilteredVariants,
  actions as variantActions,
} from '@broad/gene-page/src/resources/variants'

import tableConfig from '../tableConfig'

const GnomadVariantTable = ({
  variants,
  setVariantSort,
  setFocusedVariant,
  setHoveredVariant,
  setCurrentTableIndex,
  setCurrentTableScrollData,
  tablePosition,
  searchText,
  history,
}) => {
  const tConfig = tableConfig(setVariantSort)
  const scrollBarWidth = 40
  const paddingWidth = tConfig.fields.length * 40
  const cellContentWidth = tConfig.fields.reduce((acc, field) =>
    acc + field.width, 0)
  const calculatedWidth = scrollBarWidth + paddingWidth + cellContentWidth

  return (
    <div>
      <VariantTable
        title={''}
        height={600}
        width={calculatedWidth}
        tableConfig={tConfig}
        tableData={variants}
        remoteRowCount={variants.size}
        loadMoreRows={() => {}}
        overscan={20}
        loadLookAhead={0}
        onRowClick={setFocusedVariant(history)}
        onRowHover={setHoveredVariant}
        scrollToRow={tablePosition}
        scrollCallback={setCurrentTableIndex}
        onScroll={setCurrentTableScrollData}
        searchText={searchText}
      />
    </div>
  )
}
GnomadVariantTable.propTypes = {
  variants: PropTypes.any.isRequired,
  setVariantSort: PropTypes.func.isRequired,
  setHoveredVariant: PropTypes.func.isRequired,
  setFocusedVariant: PropTypes.func.isRequired,
  setCurrentTableIndex: PropTypes.func.isRequired,
  setCurrentTableScrollData: PropTypes.func.isRequired,
  tablePosition: PropTypes.number.isRequired,
  searchText: PropTypes.string.isRequired,
  history: PropTypes.object.isRequired,
  // setVisibleInTable: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => {
  return {
    variants: finalFilteredVariants(state),
    tablePosition: tablePosition(state),
    searchText: variantSearchText(state),
    currentNavigatorPosition: state.active.currentNavigatorPosition,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    setVariantSort: sortKey => dispatch(variantActions.setVariantSort(sortKey)),
    setFocusedVariant: history => variantId =>
      dispatch(variantActions.setFocusedVariant(variantId, history)),
    setHoveredVariant: variantId => dispatch(variantActions.setHoveredVariant(variantId)),
    setCurrentTableIndex: index => dispatch(activeActions.setCurrentTableIndex(index)),
    setCurrentTableScrollData: scrollData =>
      dispatch(activeActions.setCurrentTableScrollData(scrollData)),
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(GnomadVariantTable))
