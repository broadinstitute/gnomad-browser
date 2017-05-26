import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { NavigatorTrack } from 'react-gnomad'
import * as actions from '../../../actions'
import css from './styles.css'

const Navigator = ({ currentNavigatorPosition, onNavigatorClick, ownProps }) => {
  return (
    <NavigatorTrack
      css={css}
      title={'Navigator'}
      height={50}
      onNavigatorClick={onNavigatorClick}
      scrollSync={currentNavigatorPosition}
      {...ownProps}
    />
  )
}
Navigator.propTypes = {
    currentNavigatorPosition: PropTypes.number.isRequired,
    onNavigatorClick: PropTypes.func.isRequired,
    ownProps: PropTypes.object.isRequired,
}

const mapStateToProps = (state, ownProps) => ({
  currentNavigatorPosition: state.selections.currentNavigatorPosition,
  ownProps,
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  onNavigatorClick: position =>  dispatch(actions.setNavigationPosition(position)),
})

export default connect(mapStateToProps, mapDispatchToProps)(Navigator)