import React from 'react'

import data from '@resources/gwas-eg.json'

import ManhattanPlot from '../index'


const plotData = data.map(d => ({ ...d, chromosome: `${d.chromosome}`, id: d.snp }))

const ManhattanPlotExample = () => {
  return (
    <div>
      <ManhattanPlot data={plotData} onClickPoint={console.log} />
    </div>
  )
}

export default ManhattanPlotExample

