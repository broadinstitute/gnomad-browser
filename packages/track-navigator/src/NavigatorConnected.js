import { connect } from 'react-redux'

import {
  finalFilteredVariants,
  hoveredVariant,
  types as variantActionTypes,
} from '@broad/redux-variants'
import { actions as tableActions, currentTableScrollWindow } from '@broad/table'

import NavigatorTrack from './Navigator'


const mapStateToProps = (state) => {
  const tableScrollWindow = currentTableScrollWindow(state)
  return {
    hoveredVariant: hoveredVariant(state),
    variants: finalFilteredVariants(state),
    visibleVariantWindow: [tableScrollWindow.startIndex, tableScrollWindow.stopIndex],
  }
}


const mapDispatchToProps = dispatch => ({
  onNavigatorClick: (tableIndex) => {
    dispatch({ type: variantActionTypes.ORDER_VARIANTS_BY_POSITION })
    dispatch(tableActions.setCurrentTableIndex(tableIndex))
  }
})


export default connect(mapStateToProps, mapDispatchToProps)(NavigatorTrack)
