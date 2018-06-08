import React from 'react'
import ManhattanPlot from '../index'

import data from '@resources/gwas-eg.json'  // eslint-disable-line

const ManhattanPlotExample = () => {
  return (
    <div>
      <ManhattanPlot data={data} onClickPoint={console.log} />
    </div>
  )
}

export default ManhattanPlotExample

