import React from 'react'

import data from '@resources/gwas-eg.json'

import { QQPlot } from '..'

const dataPoints = data.map(d => ({ ...d, pval: d.pvalue }))

const QQPlotExample = () => (
  <QQPlot dataPoints={dataPoints} height={500} width={900} pointLabel={d => d.snp} />
)

export default QQPlotExample
