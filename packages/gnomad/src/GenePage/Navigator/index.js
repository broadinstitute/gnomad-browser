import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import NavigatorTrack from 'lens-track-navigator'

import {
  getVisibleVariants,
} from 'lens-redux-gene-page/lib/selectors'

import * as actions from 'lens-redux-gene-page/lib/actions'

import css from './styles.css'

const Navigator = ({
  currentTableIndex,
  currentVariant,
  onNavigatorClick,
  currentNavigatorPosition,
  variants,
  variantSort,
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
      variants={variants}
      currentVariant={currentVariant}
      variantSort={variantSort}
      {...ownProps}
    />
  )
}
Navigator.propTypes = {
  currentTableIndex: PropTypes.number.isRequired,
  currentNavigatorPosition: PropTypes.number.isRequired,
  currentVariant: PropTypes.string.isRequired,
  variantSort: PropTypes.object.isRequired,
  onNavigatorClick: PropTypes.func.isRequired,
  variants: PropTypes.array.isRequired,
  ownProps: PropTypes.object.isRequired,
}

const mapStateToProps = (state, ownProps) => ({
  currentTableIndex: state.selections.currentTableIndex,
  currentNavigatorPosition: state.selections.currentNavigatorPosition,
  currentVariant: state.selections.currentVariant,
  variantSort: state.table.variantSort,
  variants: getVisibleVariants(state),
  ownProps,
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  onNavigatorClick: (tableIndex, position) =>
    dispatch(actions.onNavigatorClick(tableIndex, position)),
})

export default connect(mapStateToProps, mapDispatchToProps)(Navigator)
