import React, { useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { GenesPlot } from '@gnomad/track-genes'

import Link from '../Link'
import BaseStatusMessage from '../StatusMessage'

const GeneLink = styled(Link)`
  text {
    fill: #1173bb;
    text-decoration: none;
  }

  &:visited,
  &:active {
    text {
      fill: #1173bb;
    }
  }

  &:focus,
  &:hover {
    text {
      text-decoration: underline;
    }
  }
`

const TopPanel = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
  margin-top: 1em;
  margin-bottom: 1em;
`

const Label = styled.label`
  user-select: none;
  display: flex;
  flex-direction: row;
  align-items: center;
`

const CheckboxInput = styled.input.attrs({ type: 'checkbox' })`
  margin-right: 0.5em;
`

const TitlePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
`

const StatusMessage = styled(BaseStatusMessage)`
  padding: 0;
  margin: 0 auto 1em;
`

const isCodingGene = (gene: any) => gene.exons.some((exon: any) => exon.feature_type === 'CDS')

type GenesInRegionTrackProps = {
  genes: {
    gene_id: string
    symbol: string
    start: number
    stop: number
    exons: {
      feature_type: 'CDS' | 'exon' | 'UTR'
      start: number
      stop: number
    }[]
  }[]
  region: {
    reference_genome: 'GRCh37' | 'GRCh38'
    chrom: string
    start: number
    stop: number
  }
}

const GenesInRegionTrack = ({ genes, region }: GenesInRegionTrackProps) => {
  const codingGenes = genes.filter(isCodingGene)

  const hasCodingGenes = codingGenes.length > 0
  const hasNonCodingGenes = genes.length > 0 && genes.length > codingGenes.length

  // If no genes are present or all genes are coding, default to true and disable checkbox to indicate that no more genes are available.
  // If all genes are non-coding, default to true and disable checkbox.
  const [includeNonCodingGenes, setIncludeNonCodingGenes] = useState(
    genes.length === 0 || !hasCodingGenes || !hasNonCodingGenes || region.chrom === 'M'
  )

  return (
    <Track
      renderLeftPanel={() => (
        <TitlePanel>
          {hasNonCodingGenes && !includeNonCodingGenes ? 'Coding genes' : 'Genes'}
        </TitlePanel>
      )}
      renderTopPanel={() =>
        genes.length > 0 && (
          <TopPanel>
            <Label htmlFor="genes-track-include-non-coding-genes">
              <CheckboxInput
                checked={includeNonCodingGenes}
                disabled={genes.length === 0 || !(hasCodingGenes && hasNonCodingGenes)}
                id="genes-track-include-non-coding-genes"
                onChange={(e: any) => {
                  setIncludeNonCodingGenes(e.target.checked)
                }}
              />
              Include non-coding genes
            </Label>
          </TopPanel>
        )
      }
    >
      {({ scalePosition, width }: any) => {
        if (genes.length === 0) {
          return <StatusMessage>No genes found in this region</StatusMessage>
        }

        return (
          <GenesPlot
            genes={includeNonCodingGenes ? genes : codingGenes}
            includeNonCodingGenes
            renderGeneLabel={(gene: any) => (
              <GeneLink to={`/gene/${gene.gene_id}`}>
                <text textAnchor="middle">{gene.symbol}</text>
              </GeneLink>
            )}
            scalePosition={scalePosition}
            width={width}
          />
        )
      }}
    </Track>
  )
}

export default GenesInRegionTrack
