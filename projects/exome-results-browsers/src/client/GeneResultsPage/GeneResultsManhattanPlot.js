import PropTypes from 'prop-types'
import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'

import { ManhattanPlot } from '@broad/manhattan'

import browserConfig from '@browser/config'

const Wrapper = styled.div`
  overflow: hidden;
  width: 100%;
`

const GeneResultsManhattanPlot = withSize()(({ results, size: { width }, ...otherProps }) => {
  const dataPoints = results.filter(r => r.chrom && r.pos && r.pval)
  return (
    <Wrapper>
      {!!width && (
        <ManhattanPlot
          {...otherProps}
          height={500}
          width={width}
          dataPoints={dataPoints}
          pointLabel={d => `${d.gene_name || d.gene_id} (p = ${d.pval.toExponential(3)})`}
          thresholdLabel={`${
            browserConfig.geneResults.significanceThresholdLabel
          } (p = ${browserConfig.geneResults.significanceThresholdValue.toExponential(2)})`}
          thresholdValue={browserConfig.geneResults.significanceThresholdValue}
        />
      )}
    </Wrapper>
  )
})

GeneResultsManhattanPlot.displayName = 'GeneResultsManhattanPlot'

GeneResultsManhattanPlot.propTypes = {
  results: PropTypes.arrayOf(PropTypes.object).isRequired,
  size: PropTypes.shape({
    width: PropTypes.number.isRequired,
  }),
}

export default GeneResultsManhattanPlot
