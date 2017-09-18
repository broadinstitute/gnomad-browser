import React, { PropTypes } from 'react'
import ManhattanPlot from '../index'

import data from '/Users/msolomon/gnomadjs/resources/gwas-eg.json'

const ManhattanPlotExample = () => {
  return (
    <div>
      <ManhattanPlot data={data} />
    </div>
  )
}

export default ManhattanPlotExample
