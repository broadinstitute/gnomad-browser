import React, { PropTypes } from 'react'
import { fetchAllByGeneName } from 'lens-utils-fetch'
import { TrafficBar } from 'lens-plot-traffic'

import css from './styles.css'

const LensTest = ({ message }) => {
  fetchAllByGeneName('PCSK9').then(data => console.log(data))
  // console.log(fetchAllByGeneName)
  return (
    <div className={css.lensTest}>
      {'Hey dude!! Whas cooking????!!! '}{message}
      <TrafficBar />
    </div>
  )
}
LensTest.propTypes = {
  message: PropTypes.string.isRequired,
}
export default LensTest
