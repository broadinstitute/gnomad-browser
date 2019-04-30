import React from 'react'

import data from '@resources/gwas-eg.json'

import { ManhattanPlot } from '../ManhattanPlot'

const dataPoints = data.map(d => ({
  chrom: `${d.chromosome}`,
  pos: d.pos,
  pval: d.pvalue,
}))

const ManhattanPlotExample = () => (
  <ManhattanPlot dataPoints={dataPoints} height={500} width={900} pointLabel={d => d.snp} />
)

export default ManhattanPlotExample
