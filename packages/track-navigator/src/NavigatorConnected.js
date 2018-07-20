import { connect } from 'react-redux'

import {
  finalFilteredVariants,
  hoveredVariant,
  types as variantActionTypes,
} from '@broad/redux-variants'
import {
  actions as tableActions,
  currentTableScrollData,
} from '@broad/table'

import NavigatorTrack from './Navigator'


const mapStateToProps = (state) => {
  const variants = finalFilteredVariants(state)

  const { scrollHeight, scrollTop } = currentTableScrollData(state)
  const tableIndex = Math.floor((scrollTop / scrollHeight) * variants.size)
  const visibleVariantWindow = [tableIndex, tableIndex + 20]

  return {
    currentTableScrollData: currentTableScrollData(state),
    hoveredVariant: hoveredVariant(state),
    variants: finalFilteredVariants(state),
    visibleVariantWindow,
  }
}


const mapDispatchToProps = dispatch => ({
  onNavigatorClick: (tableIndex) => {
    dispatch({ type: variantActionTypes.ORDER_VARIANTS_BY_POSITION })
    dispatch(tableActions.setCurrentTableIndex(tableIndex))
  }
})


export default connect(mapStateToProps, mapDispatchToProps)(NavigatorTrack)
