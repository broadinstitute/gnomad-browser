import React from 'react'

import data from '@resources/gwas-eg.json'  // eslint-disable-line

import ManhattanPlot from '../index'


const plotData = data.map(d => ({ ...d, chromosome: `${d.chromosome}` }))

const ManhattanPlotExample = () => {
  return (
    <div>
      <ManhattanPlot data={plotData} onClickPoint={console.log} />
    </div>
  )
}

export default ManhattanPlotExample

