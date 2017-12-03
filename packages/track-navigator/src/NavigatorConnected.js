/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'

import {
  currentTableIndex,
  currentTableScrollData,
} from '@broad/table'

import {
  hoveredVariant,
  variantSortKey,
  finalFilteredVariants,
  // actions as variantActions,
} from '@broad/redux-variants'

import {
  NavigatorTrack,
  actions as navigatorActions,
  currentNavigatorPosition,
} from './index'

const Navigator = ({
  currentTableIndex,
  currentTableScrollData,
  hoveredVariant,
  onNavigatorClick,
  currentNavigatorPosition,
  variants,
  variantSortKey,
  ownProps,
}) => {
  return (
    <NavigatorTrack
      title={''}
      height={60}
      onNavigatorClick={onNavigatorClick}
      currentNavigatorPosition={currentNavigatorPosition}
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
  currentNavigatorPosition: PropTypes.number.isRequired,
  hoveredVariant: PropTypes.string.isRequired,
  onNavigatorClick: PropTypes.func.isRequired,
  variants: PropTypes.any.isRequired,
  variantSortKey: PropTypes.string.isRequired,
  ownProps: PropTypes.object.isRequired,
}

const mapStateToProps = (state, ownProps) => ({
  currentTableIndex: currentTableIndex(state),
  currentTableScrollData: currentTableScrollData(state),
  currentNavigatorPosition: currentNavigatorPosition(state),
  hoveredVariant: hoveredVariant(state),
  variantSortKey: variantSortKey(state),
  // variants: visibleVariants(state),
  variants: finalFilteredVariants(state),
  ownProps,
})


const mapDispatchToProps = dispatch => ({
  onNavigatorClick: (tableIndex, position) =>
    dispatch(navigatorActions.onNavigatorClick(tableIndex, position))
})

export default connect(mapStateToProps, mapDispatchToProps)(Navigator)
