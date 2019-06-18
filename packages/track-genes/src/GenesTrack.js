import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Track } from '@broad/region-viewer'

const TitlePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
`

const GeneName = styled.text`
  fill: #428bca;

  &:hover {
    fill: #be4248;
    cursor: pointer;
  }
`

const layoutRows = (genes, scalePosition) => {
  if (genes.length === 0) {
    return []
  }

  const rows = [[genes[0]]]

  for (let i = 1; i < genes.length; i += 1) {
    const gene = genes[i]

    let newRow = true
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const lastGeneInRow = rows[rowIndex][rows[rowIndex].length - 1]
      if (scalePosition(gene.start) - scalePosition(lastGeneInRow.stop) > 60) {
        rows[rowIndex].push(gene)
        newRow = false
        break
      }
    }

    if (newRow) {
      rows.push([gene])
    }
  }

  return rows
}

export const GenesTrack = ({ genes, onGeneClick, title }) => (
  <Track renderLeftPanel={() => <TitlePanel>{title}</TitlePanel>}>
    {({ scalePosition, width }) => {
      const rows = layoutRows(
        genes.filter(gene => gene.transcript.exons.some(exon => exon.feature_type === 'CDS')),
        scalePosition
      )
      const rowHeight = 50
      return (
        <svg height={rowHeight * rows.length} width={width}>
          {rows.map((track, trackNumber) =>
            track.map(gene => {
              const textYPosition = rowHeight * 0.66 + rowHeight * trackNumber
              const exonsYPosition = rowHeight * 0.16 + rowHeight * trackNumber
              const geneStart = scalePosition(gene.start)
              const geneStop = scalePosition(gene.stop)
              return (
                <g key={gene.gene_id}>
                  <GeneName
                    x={(geneStop + geneStart) / 2}
                    y={textYPosition}
                    onClick={() => onGeneClick(gene)}
                  >
                    {gene.gene_name}
                  </GeneName>
                  <line
                    x1={geneStart}
                    x2={geneStop}
                    y1={exonsYPosition}
                    y2={exonsYPosition}
                    stroke="#424242"
                    strokeWidth={1}
                  />
                  {gene.transcript.exons
                    .filter(exon => exon.feature_type === 'CDS')
                    .map(exon => {
                      const exonStart = scalePosition(exon.start)
                      const exonStop = scalePosition(exon.stop)
                      return (
                        <rect
                          key={`${gene.gene_id}-${exon.start}-${exon.stop}`}
                          x={exonStart}
                          y={rowHeight * trackNumber}
                          width={exonStop - exonStart}
                          height={rowHeight * 0.33}
                          fill="#424242"
                          stroke="#424242"
                        />
                      )
                    })}
                </g>
              )
            })
          )}
        </svg>
      )
    }}
  </Track>
)

GenesTrack.propTypes = {
  genes: PropTypes.arrayOf(PropTypes.object).isRequired,
  onGeneClick: PropTypes.func,
  title: PropTypes.string,
}

GenesTrack.defaultProps = {
  onGeneClick: () => {},
  title: 'Genes',
}
