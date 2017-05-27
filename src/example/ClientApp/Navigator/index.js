import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { NavigatorTrack } from 'react-gnomad'
import { getGene } from '../../../reducers'
import * as actions from '../../../actions'
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
  // const activeVariants =
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
  onNavigatorClick: PropTypes.func.isRequired,
  variants: PropTypes.array.isRequired,
  ownProps: PropTypes.object.isRequired,
}

const mapStateToProps = (state, ownProps) => ({
  currentTableIndex: state.selections.currentTableIndex,
  currentNavigatorPosition: state.selections.currentNavigatorPosition,
  currentVariant: state.selections.currentVariant,
  variantSort: state.table.variantSort,
  variants: getGene(state, state.selections.currentGene).minimal_gnomad_variants,
  ownProps,
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  onNavigatorClick: (tableIndex, position) =>
    dispatch(actions.onNavigatorClick(tableIndex, position)),
})

export default connect(mapStateToProps, mapDispatchToProps)(Navigator)
