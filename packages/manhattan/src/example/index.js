import React, { PropTypes } from 'react'
import ManhattanPlot from '../index'

import data from '@resources/gwas-eg.json'  // eslint-disable-line

const ManhattanPlotExample = () => {
  return (
    <div>
      <ManhattanPlot data={data} />
    </div>
  )
}

export default ManhattanPlotExample

