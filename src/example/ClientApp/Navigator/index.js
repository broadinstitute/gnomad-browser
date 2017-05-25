import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { NavigatorTrack } from 'react-gnomad'
import * as actions from '../../../actions'
import css from './styles.css'

const Navigator = ({ currentNavigatorPosition, onNavigatorClick, ownProps }) => {
  return (
    <NavigatorTrack
      title={'Navigator'}
      height={20}
      onNavigatorClick={onNavigatorClick}
      {...ownProps}
    />
  )
}
Navigator.propTypes = {
    setNavigationPosition: PropTypes.func.isRequired,
}

const mapStateToProps = (state, ownProps) => ({
  position: state.selections.currentNavigatorPosition,
  ownProps,
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  onNavigatorClick: position =>  dispatch(actions.setNavigationPosition(position)),
})

export default connect(mapStateToProps, mapDispatchToProps)(Navigator)