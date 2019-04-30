import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'

import { QQPlot } from '@broad/qq-plot'

const Wrapper = styled.div`
  overflow: hidden;
  width: 100%;
`

const GeneResultsQQPlot = withSize()(({ results, size: { width }, ...otherProps }) => {
  const dataPoints = results.filter(r => r.pval)
  return (
    <Wrapper>
      {!!width && (
        <QQPlot
          {...otherProps}
          height={500}
          width={width}
          dataPoints={dataPoints}
          pointLabel={d => d.gene_name || d.gene_id}
        />
      )}
    </Wrapper>
  )
})

export default GeneResultsQQPlot
