import { max } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { useRef, useState } from 'react'
import styled from 'styled-components'

import { Track } from '@gnomad/region-viewer'
import { RegionsPlot } from '@gnomad/track-regions'
import { Badge, Button, Modal, SearchInput, Select, TooltipAnchor } from '@gnomad/ui'

import { GTEX_TISSUE_COLORS, GTEX_TISSUE_NAMES } from '../gtex'
import InfoButton from '../help/InfoButton'

import TranscriptsTissueExpression from './TranscriptsTissueExpression'

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

  &:hover {
    background: #e2e2e2;
  }
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

const IndividualTissueTrack = ({
  exons,
  expressionRegions,
  maxExpressionInTissue,
  maxExpressionInAnyTissue,
  tissue,
  transcriptWithMaxExpressionInTissue,
}) => {
  const isExpressed = expressionRegions.some(region => region.tissues[tissue] !== 0)
  return (
    <Track
      renderLeftPanel={() => <TissueName>{GTEX_TISSUE_NAMES[tissue]}</TissueName>}
      renderRightPanel={({ width }) =>
        width > 36 && (
          <svg width={width} height={31}>
            <line x1={0} y1={6} x2={0} y2={25} stroke="#333" />
            <g transform="translate(0, 6)">
              <line x1={0} y1={0} x2={3} y2={0} stroke="#333" />
              <text x={5} y={0} dy="0.45em" fill="#000" fontSize={10} textAnchor="start">
                1
              </text>
            </g>
            <g transform="translate(0, 24)">
              <line x1={0} y1={0} x2={3} y2={0} stroke="#333" />
              <text x={5} y={0} dy="0.1em" fill="#000" fontSize={10} textAnchor="start">
                0
              </text>
            </g>
            <TooltipAnchor
              tooltip={
                isExpressed
                  ? `Max transcript expression in ${
                      GTEX_TISSUE_NAMES[tissue]
                    } = ${maxExpressionInTissue.toFixed(2)} TPM (${
                      transcriptWithMaxExpressionInTissue.transcript_id
                    }.${transcriptWithMaxExpressionInTissue.transcript_version})`
                  : `Gene is not expressed in ${GTEX_TISSUE_NAMES[tissue]}`
              }
            >
              <rect x={12} y={2} width={25} height={27} fill="none" pointerEvents="visible" />
            </TooltipAnchor>
            <circle
              cx={25}
              cy={15}
              r={Math.sqrt(
                64 *
                  (maxExpressionInAnyTissue === 0
                    ? 0
                    : maxExpressionInTissue / maxExpressionInAnyTissue)
              )}
              fill="#333"
              pointerEvents="none"
            />
          </svg>
        )
      }
    >
      {({ scalePosition, width }) => {
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
}

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
  maxExpressionInTissue: PropTypes.number.isRequired,
  maxExpressionInAnyTissue: PropTypes.number.isRequired,
  tissue: PropTypes.string.isRequired,
  transcriptWithMaxExpressionInTissue: PropTypes.shape({
    transcript_id: PropTypes.string.isRequired,
    transcript_version: PropTypes.string.isRequired,
  }),
}

IndividualTissueTrack.defaultProps = {
  transcriptWithMaxExpressionInTissue: null,
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

const ControlsWrapper = styled.div`
  margin: 1em 0;
`

const TissueExpressionTrack = ({
  exons,
  expressionRegions,
  flags,
  transcripts,
  preferredTranscriptId,
  preferredTranscriptDescription,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showTranscriptTissueExpressionModal, setShowTranscriptTissueExpressionModal] = useState(
    false
  )
  const [tissueFilterText, setTissueFilterText] = useState('')
  const mainTrack = useRef()

  const [sortTissuesBy, setSortTissuesBy] = useState('alphabetical')

  const maxExpressionByTissue = Object.keys(GTEX_TISSUE_NAMES).reduce((acc, tissueId) => {
    let maxExpressionInTissue = 0
    let transcriptWithMaxExpressionInTissue = null
    transcripts.forEach(transcript => {
      const expressionInTissue = transcript.gtex_tissue_expression[tissueId]
      if (expressionInTissue > maxExpressionInTissue) {
        maxExpressionInTissue = expressionInTissue
        transcriptWithMaxExpressionInTissue = transcript
      }
    })

    return {
      ...acc,
      [tissueId]: {
        expression: maxExpressionInTissue,
        transcript: transcriptWithMaxExpressionInTissue,
      },
    }
  }, {})
  const maxExpressionInAnyTissue = max(Object.values(maxExpressionByTissue).map(v => v.expression))

  let tissues
  if (sortTissuesBy === 'max-expression') {
    tissues = Object.entries(GTEX_TISSUE_NAMES)
      .sort((t1, t2) => {
        const t1MaxExpression = maxExpressionByTissue[t1[0]].expression
        const t2MaxExpression = maxExpressionByTissue[t2[0]].expression
        if (t1MaxExpression === t2MaxExpression) {
          return t1[1].localeCompare(t2[1])
        }
        return t2MaxExpression - t1MaxExpression
      })
      .map(t => t[0])
  } else {
    tissues = Object.entries(GTEX_TISSUE_NAMES)
      .sort((t1, t2) => t1[1].localeCompare(t2[1]))
      .map(t => t[0])
  }

  const isExpressed = expressionRegions.some(region => region.mean !== 0)

  return (
    <>
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
            renderRightPanel={({ width }) =>
              width > 50 && (
                <svg width={width} height={31}>
                  <line x1={0} y1={6} x2={0} y2={25} stroke="#333" />
                  <g transform="translate(0, 6)">
                    <line x1={0} y1={0} x2={3} y2={0} stroke="#333" />
                    <text x={5} y={0} dy="0.45em" fill="#000" fontSize={10} textAnchor="start">
                      1
                    </text>
                  </g>
                  <g transform="translate(0, 24)">
                    <line x1={0} y1={0} x2={3} y2={0} stroke="#333" />
                    <text x={5} y={0} dy="0.1em" fill="#000" fontSize={10} textAnchor="start">
                      0
                    </text>
                  </g>
                </svg>
              )
            }
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
            <ControlsWrapper>
              <label htmlFor="tissue-expression-track-sort-tissues-by">
                Sort tissues by:{' '}
                <Select
                  id="tissue-expression-track-sort-tissues-by"
                  value={sortTissuesBy}
                  onChange={e => setSortTissuesBy(e.target.value)}
                >
                  <option value="alphabetical">Alphabetical</option>
                  <option value="max-expression">Max transcript expression in tissue</option>
                </Select>
              </label>
              <Button
                style={{ marginLeft: '1ch' }}
                onClick={() => {
                  setShowTranscriptTissueExpressionModal(true)
                }}
              >
                Show transcript tissue expression
              </Button>
              <label htmlFor="tissue-expression-track-filter" style={{ marginLeft: '1ch' }}>
                Filter tissues:{' '}
                <SearchInput
                  id="tissue-expression-track-filter"
                  placeholder="tissue"
                  value={tissueFilterText}
                  onChange={setTissueFilterText}
                />
              </label>
            </ControlsWrapper>
            {(tissueFilterText ? tissues.filter(tissuePredicate(tissueFilterText)) : tissues).map(
              tissue => (
                <IndividualTissueTrack
                  key={tissue}
                  exons={exons}
                  expressionRegions={expressionRegions}
                  maxExpressionInTissue={maxExpressionByTissue[tissue].expression}
                  maxExpressionInAnyTissue={maxExpressionInAnyTissue}
                  transcriptWithMaxExpressionInTissue={maxExpressionByTissue[tissue].transcript}
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
      {showTranscriptTissueExpressionModal && (
        <Modal
          size="xlarge"
          title="Transcript tissue expression"
          onRequestClose={() => {
            setShowTranscriptTissueExpressionModal(false)
          }}
        >
          <TranscriptsTissueExpression
            transcripts={transcripts}
            includeNonCodingTranscripts
            preferredTranscriptId={preferredTranscriptId}
            preferredTranscriptDescription={preferredTranscriptDescription}
            defaultSortTissuesBy={sortTissuesBy}
          />
        </Modal>
      )}
    </>
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
  transcripts: PropTypes.arrayOf(
    PropTypes.shape({
      transcript_id: PropTypes.string.isRequired,
      transcript_version: PropTypes.string.isRequired,
      exons: PropTypes.arrayOf(
        PropTypes.shape({
          feature_type: PropTypes.string.isRequired,
          start: PropTypes.number.isRequired,
          stop: PropTypes.number.isRequired,
        })
      ).isRequired,
    })
  ).isRequired,
  preferredTranscriptId: PropTypes.string,
  preferredTranscriptDescription: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
}

TissueExpressionTrack.defaultProps = {
  preferredTranscriptId: null,
  preferredTranscriptDescription: null,
}

export default TissueExpressionTrack
