/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import {
  actions as tableActions,
  currentTableIndex,
  currentTableScrollData,
} from '@broad/table'

import {
  hoveredVariant,
  variantSortKey,
  finalFilteredVariants,
  types as variantActionTypes
} from '@broad/redux-variants'

import NavigatorTrack from './Navigator'

const Navigator = ({
  currentTableIndex,
  currentTableScrollData,
  hoveredVariant,
  onNavigatorClick,
  variants,
  variantSortKey,
  ownProps,
}) => {
  return (
    <NavigatorTrack
      title={''}
      height={60}
      onNavigatorClick={onNavigatorClick}
      scrollSync={currentTableIndex}
      currentTableScrollData={currentTableScrollData}
      variants={variants}
      hoveredVariant={hoveredVariant}
      variantSortKey={variantSortKey}
      {...ownProps}
    />
  )
}
Navigator.propTypes = {
  currentTableIndex: PropTypes.number.isRequired,
  currentTableScrollData: PropTypes.object.isRequired,
  hoveredVariant: PropTypes.string.isRequired,
  onNavigatorClick: PropTypes.func.isRequired,
  variants: PropTypes.any.isRequired,
  variantSortKey: PropTypes.string.isRequired,
  ownProps: PropTypes.object.isRequired,
}

const mapStateToProps = (state, ownProps) => ({
  currentTableIndex: currentTableIndex(state),
  currentTableScrollData: currentTableScrollData(state),
  hoveredVariant: hoveredVariant(state),
  variantSortKey: variantSortKey(state),
  // variants: visibleVariants(state),
  variants: finalFilteredVariants(state),
  ownProps,
})


const mapDispatchToProps = dispatch => ({
  onNavigatorClick: (tableIndex) => {
    dispatch({ type: variantActionTypes.ORDER_VARIANTS_BY_POSITION })
    dispatch(tableActions.setCurrentTableIndex(tableIndex))
  }
})

export default connect(mapStateToProps, mapDispatchToProps)(Navigator)
