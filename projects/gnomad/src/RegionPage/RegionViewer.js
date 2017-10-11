/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import styled from 'styled-components'

import RegionViewerComponent from '@broad/region'
import TranscriptTrack from '@broad/track-transcript'
import CoverageTrack from '@broad/track-coverage'
import VariantTrack from '@broad/track-variant'
import StackedBarTrack from '@broad/track-stacked-bar'
import { exonPadding } from '@broad/gene-page/src/resources/active'
import { regionData } from '@broad/gene-page/src/resources/regions'
import NavigatorConnected from '@broad/gene-page/src/containers/NavigatorConnected'

import {
  coverageConfigClassic,
  coverageConfigNew,
  markerExacClassic,
  attributeConfig,
} from '@broad/gene-page/src/presentation/RegionViewerStyles'

import {
  finalFilteredVariants,
} from '@broad/gene-page/src/resources/variants'

const RegionViewer = ({
  regionData,
  allVariants,
  exonPadding,
  coverageStyle,
}) => {
  const {
    chrom,
    start,
    stop,
    exome_coverage,
    genome_coverage,
    genes,
    gnomad_consequence_buckets: { buckets },

  } = regionData.toJS()

  const variantsReversed = allVariants.reverse()

  const allTrack = (
    <VariantTrack
      key={'All-variants'}
      title={`variants (${allVariants.size})`}
      height={60}
      color={'#75757'}
      markerConfig={markerExacClassic}
      variants={variantsReversed}
    />
  )

  const coverageConfig = coverageStyle === 'classic' ?
    coverageConfigClassic(exome_coverage, genome_coverage) :
    coverageConfigNew(exome_coverage, genome_coverage)

  const featuresToDisplay = ['default']

  const regions = [{
    chrom,
    start,
    stop,
    feature_type: 'default',
    strand: '+',
  }]

  const genesToMap = genes.map(gene => ({
    name: gene.gene_name,
    start: gene.start,
    stop: gene.stop,
    exonIntervals: gene.transcript.exons.filter(exon => exon.feature_type === 'CDS').map(exon => ({ start: exon.start, stop: exon.stop })),
  }))

  const GenesTrack = ({ genesToMap, positionOffset, xScale, leftPanelWidth, width }) => {
    const GENE_TRACK_HEIGHT = 10
    const GENE_TRACK_PADDING = 3
    // const height = genesToMap.length * GENE_TRACK_HEIGHT

    const GeneTrackWrapper = styled.div`
      display: flex;
      flex-direction: row;
      ${'' /* height: ${height}px; */}
      width: 100%;
    `

    const GeneTrackLeft = styled.div`
      height: 100%;
      width: ${leftPanelWidth}px;
    `

    const GeneTrackData = styled.div`
      height: 100%;
    `

    const GeneTrackTitle = styled.div`
      height: ${GENE_TRACK_HEIGHT + 3}px;
    `
    const GeneTrackTitleText = styled.div`
      margin: 0 0 0 0;
      padding: 0 0 0 0;
    `

    const GeneTrackPlot = styled.div`

    `

    return (
      <GeneTrackWrapper>
        <GeneTrackLeft>
          {genesToMap.map(gene => (
            <GeneTrackTitle key={`${gene.name}-title`}>
              <GeneTrackTitleText>{gene.name}</GeneTrackTitleText>
            </GeneTrackTitle>
          ))}
        </GeneTrackLeft>
        <GeneTrackData>
          {genesToMap.map(gene => (
            <GeneTrackPlot key={`${gene.name}-data`}>
              <svg height={GENE_TRACK_HEIGHT} width={width}>
                <line
                  x1={xScale(gene.start)}
                  x2={xScale(gene.stop)}
                  y1={GENE_TRACK_HEIGHT / 2}
                  y2={GENE_TRACK_HEIGHT / 2}
                  stroke={'black'}
                  strokeWidth={1}
                />
                {gene.exonIntervals.map(exon => (
                  <rect
                    x={xScale(exon.start)}
                    y={0}
                    width={xScale(exon.stop) - xScale(exon.start)}
                    height={GENE_TRACK_HEIGHT}
                    fill={'black'}
                    stroke={'black'}
                    key={`${exon.start}-${gene.name}`}
                  />
                ))}
              </svg>
            </GeneTrackPlot>
          ))}
        </GeneTrackData>

      </GeneTrackWrapper>
    )
  }

  return (
    <div>
      <RegionViewerComponent
        width={1000}
        padding={0}
        regions={regions}
        regionAttributes={attributeConfig}
        featuresToDisplay={featuresToDisplay}
      >
        <CoverageTrack
          title={'Coverage'}
          height={200}
          dataConfig={coverageConfig}
          yTickNumber={11}
          yMax={110}
        />
        <GenesTrack genesToMap={genesToMap} />
        {/* {allTrack} */}
        <StackedBarTrack height={150} data={buckets} />
        <NavigatorConnected />
      </RegionViewerComponent>
    </div>
  )
}
RegionViewer.propTypes = {
  regionData: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  exonPadding: PropTypes.number.isRequired,
  coverageStyle: PropTypes.string,
}
RegionViewer.defaultProps = {
  coverageStyle: null,
}

export default connect(
  state => ({
    regionData: regionData(state),
    exonPadding: exonPadding(state),
    allVariants: finalFilteredVariants(state),
  }),
)(RegionViewer)
