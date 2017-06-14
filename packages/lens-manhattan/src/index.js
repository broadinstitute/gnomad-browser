import React, { PropTypes } from 'react'
import css from './styles.css'

/**
 *
 */

const ManhattanPlot = ({ data }) => {
  console.log(data)
  return (
    <div className={css.component}>
      
    </div>
  )
}
ManhattanPlot.propTypes = {
  data: PropTypes.object.isRequired,
}
export default ManhattanPlot
