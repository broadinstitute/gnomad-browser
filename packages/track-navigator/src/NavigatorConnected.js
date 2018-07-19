import { connect } from 'react-redux'

import {
  finalFilteredVariants,
  hoveredVariant,
  types as variantActionTypes,
} from '@broad/redux-variants'
import {
  actions as tableActions,
  currentTableIndex,
  currentTableScrollData,
} from '@broad/table'

import NavigatorTrack from './Navigator'


const mapStateToProps = state => ({
  currentTableScrollData: currentTableScrollData(state),
  hoveredVariant: hoveredVariant(state),
  scrollSync: currentTableIndex(state),
  variants: finalFilteredVariants(state),
})


const mapDispatchToProps = dispatch => ({
  onNavigatorClick: (tableIndex) => {
    dispatch({ type: variantActionTypes.ORDER_VARIANTS_BY_POSITION })
    dispatch(tableActions.setCurrentTableIndex(tableIndex))
  }
})


export default connect(mapStateToProps, mapDispatchToProps)(NavigatorTrack)
