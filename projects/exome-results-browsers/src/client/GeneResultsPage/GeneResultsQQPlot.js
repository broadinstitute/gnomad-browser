import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'

import { QQPlot } from '@broad/qq-plot'

import browserConfig from '@browser/config'

const Wrapper = styled.div`
  overflow: hidden;
  width: 100%;
`

const pValueColumn = browserConfig.geneResults.pValueColumn || 'pval'

const GeneResultsQQPlot = withSize()(({ results, size: { width }, ...otherProps }) => {
  const dataPoints = results
    .filter(r => r[pValueColumn])
    .map(r => ({ ...r, pval: r[pValueColumn] }))

  return (
    <Wrapper>
      {!!width && (
        <QQPlot
          {...otherProps}
          height={500}
          width={width}
          dataPoints={dataPoints}
          pointLabel={d => d.gene_name || d.gene_id}
          thresholds={browserConfig.geneResults.significanceThresholds}
        />
      )}
    </Wrapper>
  )
})

export default GeneResultsQQPlot
