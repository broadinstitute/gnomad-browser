import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'

import RegionViewer from '@broad/region'
import NavigatorConnected from '@broad/gene-page/src/containers/NavigatorConnected'
import TranscriptConnected from '@broad/gene-page/src/containers/TranscriptConnected'
import CoverageTrack from '@broad/track-coverage'
import VariantTrack from '@broad/track-variant'
// import StackedBarTrack from '@broad/track-stacked-bar'
import { exonPadding, actions as activeActions } from '@broad/gene-page/src/resources/active'
import { geneData, regionalConstraint } from '@broad/gene-page/src/resources/genes'

import {
  finalFilteredVariants,
  selectedVariantDataset,
} from '@broad/gene-page/src/resources/variants'

import {
  coverageConfigClassic,
  coverageConfigNew,
  markerExacClassic,
  attributeConfig,
} from '@broad/gene-page/src/presentation/RegionViewerStyles'

const GeneRegion = ({
  gene,
  allVariants,
  selectedVariantDataset,
  exonPadding,
  regionalConstraint,
}) => {
  const geneJS = gene.toJS()
  const canonicalExons = geneJS.transcript.exons
  const { transcript, strand } = geneJS
  const { exome_coverage, genome_coverage } = transcript
  console.log('exome coverage length', exome_coverage.length, exome_coverage)
  console.log('genome coverage length', genome_coverage.length, genome_coverage)
  const variantsReversed = allVariants.reverse()

  const showVariants = true

  const coverageConfig = selectedVariantDataset === 'exacVariants' ?
    coverageConfigClassic(exome_coverage, genome_coverage) :
    coverageConfigNew(exome_coverage, genome_coverage)


  const RegionalConstraintTrackWrapper = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 100%;
  `

  const RegionalConstraintLeft = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: ${props => props.leftPanelWidth}px;
  `

  const RegionalConstraintText = styled.p`
  height: 100%;
  `

  const RegionalConstraintData = styled.div`
    height: 100%;
  `

  const RegionalConstraintRegion = styled.rect`

  `

  const RegionalConstraintTrack = ({
    regionalConstraintData,
    leftPanelWidth,
    xScale,
    positionOffset,
    width,
    height,
    strand,
  }) => {
    const padding = 2
    return (
      <RegionalConstraintTrackWrapper>
        <RegionalConstraintLeft leftPanelWidth={leftPanelWidth} >
          <RegionalConstraintText>Regional constraint</RegionalConstraintText>
        </RegionalConstraintLeft>
        <RegionalConstraintData>
          <svg height={height} width={width}>
            {/* <rect
              x={0}
              y={0}
              width={width / 2}
              height={height}
              fill={'yellow'}
              stroke={'black'}
            /> */}
            {regionalConstraintData.map((region, i) => {
              const regionStart = strand === '+' ? region.genomic_start : region.genomic_end
              const regionStop = strand === '+' ? region.genomic_end : region.genomic_start
              const regionStartPos = positionOffset(regionStart).offsetPosition
              const regionStopPos = positionOffset(regionStop).offsetPosition
              return (
                <g key={`${i}-region`}>
                  <RegionalConstraintRegion
                    x={xScale(regionStartPos)}
                    y={padding}
                    width={xScale(regionStopPos) - xScale(regionStartPos)}
                    height={height - padding}
                    fill={'rgb(255, 88, 63)'}
                    // fill={'transparent'}
                    strokeWidth={1}
                    stroke={'black'}
                    opacity={0.2}
                  />
                  <text
                    x={(xScale(regionStopPos) + xScale(regionStartPos)) / 2}
                    y={height / 2 + 6}
                    textAnchor={'middle'}
                  >
                    {/* {region.region_name} */}
                  </text>
                </g>
              )
            })}
          </svg>
        </RegionalConstraintData>
      </RegionalConstraintTrackWrapper>

    )
  }
  return (
    <div>
      <RegionViewer
        width={1000}
        padding={exonPadding}
        regions={canonicalExons}
        regionAttributes={attributeConfig}
        // broadcast={setRegionViewerAttributes}
      >
        <CoverageTrack
          title={'Coverage'}
          height={200}
          dataConfig={coverageConfig}
          yTickNumber={11}
          yMax={110}
        />
        <TranscriptConnected height={12} />
        <RegionalConstraintTrack height={17} regionalConstraintData={regionalConstraint} strand={strand} />
        {showVariants &&
          <VariantTrack
            key={'All-variants'}
            title={`variants (${allVariants.size})`}
            height={60}
            color={'#75757'}
            markerConfig={markerExacClassic}
            variants={variantsReversed}
          />}
        <NavigatorConnected />
      </RegionViewer>
    </div>
  )
}
GeneRegion.propTypes = {
  gene: PropTypes.object.isRequired,
  allVariants: PropTypes.any.isRequired,
  exonPadding: PropTypes.number.isRequired,
  setRegionViewerAttributes: PropTypes.func.isRequired,
  selectedVariantDataset: PropTypes.string.isRequired,
  regionalConstraint: PropTypes.array.isRequired,
}
export default connect(
  state => ({
    gene: geneData(state),
    exonPadding: exonPadding(state),
    // allVariants: allVariantsInCurrentDatasetAsList(state),
    allVariants: finalFilteredVariants(state),
    selectedVariantDataset: selectedVariantDataset(state),
    regionalConstraint: regionalConstraint(state),
  }),
  dispatch => ({
    setRegionViewerAttributes: regionViewerAttributes =>
      dispatch(activeActions.setRegionViewerAttributes(regionViewerAttributes))
  })
)(GeneRegion)
