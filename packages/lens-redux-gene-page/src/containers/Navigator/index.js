/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import NavigatorTrack from 'lens-track-navigator'

import {
  currentVariant,
  currentTableIndex,
  currentNavigatorPosition,
  currentTableScrollData,
  actions as activeActions,
} from '../../resources/active'

import { visibleVariants, variantSortKey, searchFilteredVariants } from '../../resources/table'

import css from './styles.css'

const Navigator = ({
  currentTableIndex,
  currentTableScrollData,
  currentVariant,
  onNavigatorClick,
  currentNavigatorPosition,
  variants,
  variantSortKey,
  ownProps,
}) => {
  return (
    <NavigatorTrack
      css={css}
      title={'Navigator'}
      height={50}
      onNavigatorClick={onNavigatorClick}
      currentNavigatorPosition={currentNavigatorPosition}
      scrollSync={currentTableIndex}
      currentTableScrollData={currentTableScrollData}
      variants={variants}
      currentVariant={currentVariant}
      variantSortKey={variantSortKey}
      {...ownProps}
    />
  )
}
Navigator.propTypes = {
  currentTableIndex: PropTypes.number.isRequired,
  currentTableScrollData: PropTypes.object.isRequired,
  currentNavigatorPosition: PropTypes.number.isRequired,
  currentVariant: PropTypes.string.isRequired,
  onNavigatorClick: PropTypes.func.isRequired,
  variants: PropTypes.any.isRequired,
  variantSortKey: PropTypes.string.isRequired,
  ownProps: PropTypes.object.isRequired,
}

const mapStateToProps = (state, ownProps) => ({
  currentTableIndex: currentTableIndex(state),
  currentTableScrollData: currentTableScrollData(state),
  currentNavigatorPosition: currentNavigatorPosition(state),
  currentVariant: currentVariant(state),
  variantSortKey: variantSortKey(state),
  // variants: visibleVariants(state),
  variants: searchFilteredVariants(state),
  ownProps,
})


const mapDispatchToProps = dispatch => ({
  onNavigatorClick: (tableIndex, position) =>
    dispatch(activeActions.onNavigatorClick(tableIndex, position))
})

export default connect(mapStateToProps, mapDispatchToProps)(Navigator)
