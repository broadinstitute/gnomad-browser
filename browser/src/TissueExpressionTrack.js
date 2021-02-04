import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { useRef, useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { RegionsPlot } from '@gnomad/track-regions'
import { Badge, Button, SearchInput, TooltipAnchor } from '@gnomad/ui'

import { GTEX_TISSUE_COLORS, GTEX_TISSUE_NAMES } from './gtex'
import InfoButton from './help/InfoButton'

const getPlotRegions = (expressionRegions, getValueForRegion) => {
  const roundedRegions = expressionRegions.map(region => ({
    start: region.start,
    stop: region.stop,
    value: Math.round(getValueForRegion(region) * 10) / 10,
  }))

  const plotRegions = []
  let currentRegion = roundedRegions[0]
  for (let i = 1; i < roundedRegions.length; i += 1) {
    const r = roundedRegions[i]
    if (r.start <= currentRegion.stop + 1 && r.value === currentRegion.value) {
      currentRegion.stop = r.stop
    } else {
      plotRegions.push(currentRegion)
      currentRegion = r
    }
  }
  plotRegions.push(currentRegion)

  return plotRegions
}

const RegionBackground = styled.rect`
  fill: none;
  stroke: none;
`

const Region = styled.rect``

const RegionHoverTarget = styled.g`
  pointer-events: visible;
  fill: none;

  &:hover {
    ${RegionBackground} {
      fill: rgba(0, 0, 0, 0.05);
    }

    ${Region} {
      fill: #000;
      stroke: #000;
    }
  }
`

const TRACK_HEIGHT = 20

const heightScale = scaleLinear().domain([0, 1]).range([0, TRACK_HEIGHT]).clamp(true)

const PextRegionsPlot = ({ color, regions, scalePosition, width }) => {
  return (
    <svg width={width} height={TRACK_HEIGHT}>
      {regions.map(region => {
        const x1 = scalePosition(region.start)
        const x2 = scalePosition(region.stop)
        const height = heightScale(region.value)

        return (
          <TooltipAnchor
            key={`${region.start}-${region.stop}`}
            tooltip={`${region.start.toLocaleString()}-${region.stop.toLocaleString()}: pext = ${region.value.toLocaleString()}`}
          >
            <RegionHoverTarget>
              <RegionBackground x={x1} y={0} width={x2 - x1} height={TRACK_HEIGHT} />
              <Region
                x={x1}
                y={TRACK_HEIGHT - height}
                width={x2 - x1}
                height={height}
                fill={color}
                stroke={color}
              />
            </RegionHoverTarget>
          </TooltipAnchor>
        )
      })}
    </svg>
  )
}

PextRegionsPlot.propTypes = {
  color: PropTypes.string.isRequired,
  regions: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      value: PropTypes.number.isRequired,
    })
  ).isRequired,
  scalePosition: PropTypes.func.isRequired,
  width: PropTypes.number.isRequired,
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
`

const InnerWrapper = styled.div`
  margin-bottom: 1em;
`

const TissueName = styled.div`
  display: flex;
  align-items: center;
  height: 31px;
  margin-right: 5px;
  font-size: 10px;
`

const PlotWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin: 5px 0;
`

const NotExpressedMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 21px;
  margin: 5px 0;
  color: gray;
  font-size: 10px;
`

/* eslint-disable-next-line react/prop-types */
const renderProportionAxis = ({ width }) =>
  width > 20 && (
    <svg width={width} height={31}>
      <line x1={0} y1={6} x2={0} y2={25} stroke="#333" />
      <g transform="translate(0, 6)">
        <line x1={0} y1={0} x2={3} y2={0} stroke="#333" />
        <text x={5} y={0} dy="0.3em" fill="#000" fontSize={10} textAnchor="start">
          1
        </text>
      </g>
      <g transform="translate(0, 24)">
        <line x1={0} y1={0} x2={3} y2={0} stroke="#333" />
        <text x={5} y={0} dy="0.2em" fill="#000" fontSize={10} textAnchor="start">
          0
        </text>
      </g>
    </svg>
  )

const IndividualTissueTrack = ({ exons, expressionRegions, tissue }) => (
  <Track
    renderLeftPanel={() => <TissueName>{GTEX_TISSUE_NAMES[tissue]}</TissueName>}
    renderRightPanel={renderProportionAxis}
  >
    {({ scalePosition, width }) => {
      const isExpressed = expressionRegions.some(region => region.tissues[tissue] !== 0)

      if (!isExpressed) {
        return <NotExpressedMessage>Gene is not expressed in this tissue</NotExpressedMessage>
      }

      return (
        <PlotWrapper key={tissue}>
          <PextRegionsPlot
            color={GTEX_TISSUE_COLORS[tissue]}
            regions={getPlotRegions(expressionRegions, r => r.tissues[tissue])}
            scalePosition={scalePosition}
            width={width}
          />
          <RegionsPlot
            axisColor="rgba(0,0,0,0)"
            height={1}
            regions={exons}
            scalePosition={scalePosition}
            width={width}
          />
        </PlotWrapper>
      )
    }}
  </Track>
)

IndividualTissueTrack.propTypes = {
  exons: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  expressionRegions: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      mean: PropTypes.number,
      tissues: PropTypes.objectOf(PropTypes.number).isRequired,
    })
  ).isRequired,
  tissue: PropTypes.string.isRequired,
}

const FLAG_DESCRIPTIONS = {
  low_max_pext:
    'For this gene, RSEM assigns higher expression to non-coding transcripts than protein coding transcripts. This likely represents an artifact in the isoform expression quantification and results in a low pext value for all bases in the gene.',
}

const tissuePredicate = tissueFilterText => {
  const filterWords = tissueFilterText
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter(Boolean)

  return tissue => {
    const tissueWords = tissue
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(Boolean)

    return filterWords.every(filterWord =>
      tissueWords.some(tissueWord => tissueWord.includes(filterWord))
    )
  }
}

const TissueExpressionTrack = ({ exons, expressionRegions, flags }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [tissueFilterText, setTissueFilterText] = useState('')
  const mainTrack = useRef()

  const tissues = Object.keys(GTEX_TISSUE_NAMES).sort((t1, t2) =>
    GTEX_TISSUE_NAMES[t1].localeCompare(GTEX_TISSUE_NAMES[t2])
  )

  const isExpressed = expressionRegions.some(region => region.mean !== 0)

  return (
    <Wrapper>
      <InnerWrapper ref={mainTrack}>
        <Track
          renderLeftPanel={() => (
            <TissueName
              style={{ fontSize: '12px', justifyContent: 'space-between', marginRight: 0 }}
            >
              <Button
                disabled={!isExpressed}
                style={{
                  height: 'auto',
                  width: '70px',
                  paddingLeft: '0.25em',
                  paddingRight: '0.25em',
                }}
                onClick={() => {
                  setIsExpanded(!isExpanded)
                }}
              >
                {isExpanded ? 'Hide' : 'Show'} tissues
              </Button>
              <span style={{ marginRight: '0.25em', textAlign: 'right' }}>Mean pext</span>
              <InfoButton topic="pext" style={{ display: 'inline' }} />
            </TissueName>
          )}
          renderRightPanel={renderProportionAxis}
        >
          {({ scalePosition, width }) => {
            if (!isExpressed) {
              return (
                <NotExpressedMessage>Gene is not expressed in GTEx tissues</NotExpressedMessage>
              )
            }

            return (
              <PlotWrapper>
                <PextRegionsPlot
                  color="#428bca"
                  regions={getPlotRegions(expressionRegions, r => r.mean)}
                  scalePosition={scalePosition}
                  width={width}
                />
                <RegionsPlot
                  axisColor="rgba(0,0,0,0)"
                  height={1}
                  regions={exons}
                  scalePosition={scalePosition}
                  width={width}
                />
              </PlotWrapper>
            )
          }}
        </Track>
      </InnerWrapper>
      {flags.map(flag => (
        <InnerWrapper key={flag}>
          <Badge level="warning">Warning</Badge> {FLAG_DESCRIPTIONS[flag]}
        </InnerWrapper>
      ))}
      {isExpanded && (
        <>
          <div style={{ margin: '1em 0' }}>
            <label htmlFor="tissue-expression-track-filter">
              Filter tissues:{' '}
              <SearchInput
                id="tissue-expression-track-filter"
                placeholder="tissue"
                value={tissueFilterText}
                onChange={setTissueFilterText}
              />
            </label>
          </div>
          {(tissueFilterText ? tissues.filter(tissuePredicate(tissueFilterText)) : tissues).map(
            tissue => (
              <IndividualTissueTrack
                key={tissue}
                exons={exons}
                expressionRegions={expressionRegions}
                tissue={tissue}
              />
            )
          )}
          <span>
            <Button
              onClick={() => {
                setIsExpanded(false)
                setTimeout(() => {
                  mainTrack.current.scrollIntoView()
                }, 0)
              }}
            >
              Hide tissues
            </Button>
          </span>
        </>
      )}
    </Wrapper>
  )
}

TissueExpressionTrack.propTypes = {
  exons: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  expressionRegions: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      mean: PropTypes.number,
      tissues: PropTypes.objectOf(PropTypes.number).isRequired,
    })
  ).isRequired,
  flags: PropTypes.arrayOf(PropTypes.string).isRequired,
}

export default TissueExpressionTrack
