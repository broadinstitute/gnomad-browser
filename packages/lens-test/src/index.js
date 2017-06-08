import React, { PropTypes } from 'react'
import css from './styles.css'

const LensTest = ({ message }) => {
  return (
    <div className={css.lensTest}>
      {'Hey dude!!! Whas cooking '}{message}
    </div>
  )
}
LensTest.propTypes = {
  message: PropTypes.string.isRequired,
}
export default LensTest
