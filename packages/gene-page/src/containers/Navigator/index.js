/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import NavigatorTrack from '@broad/track-navigator'

import {
  currentTableIndex,
  currentNavigatorPosition,
  currentTableScrollData,
  actions as activeActions,
} from '../../resources/active'

import {
  currentVariant,
  variantSortKey,
  finalFilteredVariants,
} from '../../resources/variants'

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
      title={''}
      height={55}
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
  variants: finalFilteredVariants(state),
  ownProps,
})


const mapDispatchToProps = dispatch => ({
  onNavigatorClick: (tableIndex, position) =>
    dispatch(activeActions.onNavigatorClick(tableIndex, position))
})

export default connect(mapStateToProps, mapDispatchToProps)(Navigator)

// old styles
// @import "./config.css";
//
// :root {
//   --backgroundColor: #FAFAFA;
//   --primaryColor: #375D81;
//   --secondaryColor: #91AA9D;
//   --exonColor: #375D81;
//   --paddingColor: #183152;
//   --rowHoverColor: #E8EAF6;
//   --rowBackGroundColor: #FAFAFA;
// }
// /*
// :root {
//   --backgroundColor: #1E1E20;
//   --primaryColor: #D9CB9E;
//   --secondaryColor: #DC3522;
//   --exonColor: #475453;
//   --paddingColor: #5A5E5C;
//   --rowHoverColor: #183152;
//   --rowBackGroundColor: #1E1E20;
// }*/
//
//
// .track {
//   display: flex;
//   align-items: center;
//   /*border: 1px solid blue;*/
// }
//
// .loadingAxisName {
//   display: flex;
//   flex-direction: column;
//   justify-content: center;
//   font-size: 11px;
//   /*border: 1px solid green;*/
// }
//
// .cursorPosition { }
//
// .areaClick {
//   /*border: 1px solid yellow;*/
// }
//
// .navigatorContainerRect {
//   fill: var(--backgroundColor);
//   /*stroke: red;*/
// }
//
// .cursorPositionRect {
//   fill: #FAFAFA;
//   stroke: black;
//   stroke-width: 1px;
//   cursor: pointer;
// }
//
// .tablePositionRect {
//   fill: var(--rowHoverColor);
//   stroke: black;
//   stroke-width: 1px;
//
// }
//
// .xTickText {
//   text-anchor: middle;
//   font-size: 10px;
// }
