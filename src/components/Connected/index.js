import React, { PropTypes } from 'react'
import { connect } from 'react-redux'

import { updateMessage } from '../../actions'

import css from './styles.css'

const ConnectedComponent = ({ message, onUpdateButtonClick }) => {
  return (
    <div className={css.component}>
      {message}
      <button onClick={() => onUpdateButtonClick('Yassss')}>click me</button>
    </div>
  )
}
ConnectedComponent.propTypes = {
  message: PropTypes.string.isRequired,
  onUpdateButtonClick: PropTypes.func.isRequired,
}

const mapStateToProps = (state) => {
  const { message } = state
  console.log(message)
  return {
    message,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    onUpdateButtonClick: message => dispatch(updateMessage(message)),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ConnectedComponent)
