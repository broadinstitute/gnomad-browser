import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { GenesPlot } from '@gnomad/track-genes'

import Query from '../Query'
import BaseStatusMessage from '../StatusMessage'

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

const query = `
  query GenesInRegion($chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
    region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
      genes {
        gene_id
        symbol
        start
        stop
        exons {
          feature_type
          start
          stop
        }
      }
    }
  }
`

const isCodingGene = gene => gene.exons.some(exon => exon.feature_type === 'CDS')

const GenesInRegionTrack = ({ genes, region, onClickGene }) => {
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
                onChange={e => {
                  setIncludeNonCodingGenes(e.target.checked)
                }}
              />
              Include non-coding genes
            </Label>
          </TopPanel>
        )
      }
    >
      {({ scalePosition, width }) => {
        if (genes.length === 0) {
          return <StatusMessage>No genes found in this region</StatusMessage>
        }

        return (
          <GenesPlot
            genes={includeNonCodingGenes ? genes : codingGenes}
            includeNonCodingGenes
            onGeneClick={onClickGene}
            scalePosition={scalePosition}
            width={width}
          />
        )
      }}
    </Track>
  )
}

GenesInRegionTrack.propTypes = {
  genes: PropTypes.arrayOf(
    PropTypes.shape({
      gene_id: PropTypes.string.isRequired,
      symbol: PropTypes.string.isRequired,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      exons: PropTypes.arrayOf(
        PropTypes.shape({
          feature_type: PropTypes.oneOf(['CDS', 'exon', 'UTR']).isRequired,
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
        })
      ).isRequired,
    })
  ).isRequired,
  region: PropTypes.shape({
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  onClickGene: PropTypes.func.isRequired,
}

const GenesInRegionTrackContainer = ({ region, ...otherProps }) => {
  return (
    <Query
      query={query}
      variables={{
        chrom: region.chrom,
        start: region.start,
        stop: region.stop,
        referenceGenome: region.reference_genome,
      }}
      loadingMessage="Loading genes"
      errorMessage="Unable to load genes"
      success={data => data.region && data.region.genes}
    >
      {({ data }) => {
        return <GenesInRegionTrack {...otherProps} genes={data.region.genes} region={region} />
      }}
    </Query>
  )
}

GenesInRegionTrackContainer.propTypes = {
  region: PropTypes.shape({
    reference_genome: PropTypes.oneOf(['GRCh37', 'GRCh38']).isRequired,
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
}

export default GenesInRegionTrackContainer
