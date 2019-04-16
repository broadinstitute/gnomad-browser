import { connect } from 'react-redux'

import {
  finalFilteredVariants,
  hoveredVariant,
  types as variantActionTypes,
} from '@broad/redux-variants'
import { actions as tableActions, currentTableScrollWindow } from '@broad/table'
import { NavigatorTrack } from '@broad/track-navigator'

const getTableIndexByPosition = (position, variants) => {
  if (variants.size === 0 || position < variants.get(0).pos) {
    return 0
  }
  const index = variants.findIndex(
    (variant, i) =>
      variants.get(i + 1) && position >= variant.pos && position <= variants.get(i + 1).pos
  )
  return index === -1 ? variants.size - 1 : index
}

const mapStateToProps = state => {
  const tableScrollWindow = currentTableScrollWindow(state)
  return {
    hoveredVariant: hoveredVariant(state),
    variants: finalFilteredVariants(state).toJS(),
    visibleVariantWindow: [tableScrollWindow.startIndex, tableScrollWindow.stopIndex],
  }
}

const mapDispatchToProps = dispatch => ({
  onNavigatorClick: position => {
    dispatch({ type: variantActionTypes.ORDER_VARIANTS_BY_POSITION })
    dispatch((thunkDispatch, getState) => {
      const variants = finalFilteredVariants(getState())
      const tableIndex = getTableIndexByPosition(position, variants)
      thunkDispatch(tableActions.setCurrentTableIndex(tableIndex))
    })
  },
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NavigatorTrack)
