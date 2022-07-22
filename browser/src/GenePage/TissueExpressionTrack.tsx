import { max, mean } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import React, { useRef, useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { RegionsPlot } from '@gnomad/track-regions'
import { Badge, Button, Modal, SearchInput, Select, TooltipAnchor } from '@gnomad/ui'

import { GTEX_TISSUE_COLORS, GTEX_TISSUE_NAMES } from '../gtex'
import InfoButton from '../help/InfoButton'

import TranscriptsTissueExpression from './TranscriptsTissueExpression'

const getPlotRegions = (expressionRegions: any, getValueForRegion: any) => {
  const roundedRegions = expressionRegions.map((region: any) => ({
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

type PextRegionsPlotProps = {
  color: string
  regions: {
    start: number
    stop: number
    value: number
  }[]
  scalePosition: (...args: any[]) => any
  width: number
}

const PextRegionsPlot = ({ color, regions, scalePosition, width }: PextRegionsPlotProps) => {
  return (
    <svg width={width} height={TRACK_HEIGHT}>
      {regions.map((region) => {
        const x1 = scalePosition(region.start)
        const x2 = scalePosition(region.stop)
        const height = heightScale(region.value)

        return (
          <TooltipAnchor
            key={`${region.start}-${region.stop}`}
            // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; key: string; tooltip: s... Remove this comment to see the full error message
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

type OwnIndividualTissueTrackProps = {
  exons: {
    start: number
    stop: number
  }[]
  expressionRegions: {
    start: number
    stop: number
    mean?: number
    tissues: {
      [key: string]: number
    }
  }[]
  maxTranscriptExpressionInTissue: number
  maxMeanTranscriptExpressionInAnyTissue: number
  meanTranscriptExpressionInTissue: number
  tissue: string
  transcriptWithMaxExpressionInTissue?: {
    transcript_id: string
    transcript_version: string
  }
}

// @ts-expect-error TS(2456) FIXME: Type alias 'IndividualTissueTrackProps' circularly... Remove this comment to see the full error message
type IndividualTissueTrackProps = OwnIndividualTissueTrackProps &
  typeof IndividualTissueTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'IndividualTissueTrack' implicitly has type 'any' ... Remove this comment to see the full error message
const IndividualTissueTrack = ({
  exons,
  expressionRegions,
  maxTranscriptExpressionInTissue,
  maxMeanTranscriptExpressionInAnyTissue,
  meanTranscriptExpressionInTissue,
  tissue,
  transcriptWithMaxExpressionInTissue,
}: IndividualTissueTrackProps) => {
  const isExpressed = expressionRegions.some((region: any) => region.tissues[tissue] !== 0)
  return (
    <Track
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      renderLeftPanel={() => <TissueName>{GTEX_TISSUE_NAMES[tissue]}</TissueName>}
      renderRightPanel={({ width }: any) =>
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
              // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message
              tooltip={
                isExpressed
                  ? `Mean transcript expression in this tissue = ${meanTranscriptExpressionInTissue.toFixed(
                      2
                    )} TPM\nMax transcript expression in this tissue = ${maxTranscriptExpressionInTissue.toFixed(
                      2
                    )} (${transcriptWithMaxExpressionInTissue.transcript_id}.${
                      transcriptWithMaxExpressionInTissue.transcript_version
                    })`
                  : // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    `Gene is not expressed in ${GTEX_TISSUE_NAMES[tissue]}`
              }
            >
              <rect x={12} y={2} width={25} height={27} fill="none" pointerEvents="visible" />
            </TooltipAnchor>
            <circle
              cx={25}
              cy={15}
              r={Math.sqrt(
                meanTranscriptExpressionInTissue === 0
                  ? 0
                  : 0.25 +
                      63.75 *
                        (maxMeanTranscriptExpressionInAnyTissue === 0
                          ? 0
                          : meanTranscriptExpressionInTissue /
                            maxMeanTranscriptExpressionInAnyTissue)
              )}
              fill="#333"
              pointerEvents="none"
            />
          </svg>
        )
      }
    >
      {({ scalePosition, width }: any) => {
        if (!isExpressed) {
          return <NotExpressedMessage>Gene is not expressed in this tissue</NotExpressedMessage>
        }

        return (
          <PlotWrapper key={tissue}>
            <PextRegionsPlot
              // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
              color={GTEX_TISSUE_COLORS[tissue]}
              regions={getPlotRegions(expressionRegions, (r: any) => r.tissues[tissue])}
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

IndividualTissueTrack.defaultProps = {
  transcriptWithMaxExpressionInTissue: null,
}

const FLAG_DESCRIPTIONS = {
  low_max_pext:
    'For this gene, RSEM assigns higher expression to non-coding transcripts than protein coding transcripts. This likely represents an artifact in the isoform expression quantification and results in a low pext value for all bases in the gene.',
}

const tissuePredicate = (tissueFilterText: any) => {
  const filterWords = tissueFilterText
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .split(/\s+/)
    .filter(Boolean)

  return (tissue: any) => {
    const tissueWords = tissue
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .filter(Boolean)

    return filterWords.every((filterWord: any) =>
      tissueWords.some((tissueWord: any) => tissueWord.includes(filterWord))
    )
  }
}

const ControlsWrapper = styled.div`
  margin: 1em 0 0.5em -115px;
`

const RightPanel = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0.375em;
  margin-top: 1.25em;
`

type OwnTissueExpressionTrackProps = {
  exons: {
    start: number
    stop: number
  }[]
  expressionRegions: {
    start: number
    stop: number
    mean?: number
    tissues: {
      [key: string]: number
    }
  }[]
  flags: string[]
  transcripts: {
    transcript_id: string
    transcript_version: string
    exons: {
      feature_type: string
      start: number
      stop: number
    }[]
  }[]
  preferredTranscriptId?: string
  preferredTranscriptDescription?: string | React.ReactNode
}

// @ts-expect-error TS(2456) FIXME: Type alias 'TissueExpressionTrackProps' circularly... Remove this comment to see the full error message
type TissueExpressionTrackProps = OwnTissueExpressionTrackProps &
  typeof TissueExpressionTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'TissueExpressionTrack' implicitly has type 'any' ... Remove this comment to see the full error message
const TissueExpressionTrack = ({
  exons,
  expressionRegions,
  flags,
  transcripts,
  preferredTranscriptId,
  preferredTranscriptDescription,
}: TissueExpressionTrackProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showTranscriptTissueExpressionModal, setShowTranscriptTissueExpressionModal] = useState(
    false
  )
  const [tissueFilterText, setTissueFilterText] = useState('')
  const mainTrack = useRef()

  const [sortTissuesBy, setSortTissuesBy] = useState('alphabetical')

  const expressionByTissue = Object.keys(GTEX_TISSUE_NAMES).reduce((acc, tissueId) => {
    let maxTranscriptExpressionInTissue = 0
    let transcriptWithMaxExpressionInTissue = null
    transcripts.forEach((transcript: any) => {
      const expressionInTissue = transcript.gtex_tissue_expression[tissueId]
      if (expressionInTissue > maxTranscriptExpressionInTissue) {
        maxTranscriptExpressionInTissue = expressionInTissue
        transcriptWithMaxExpressionInTissue = transcript
      }
    })

    const meanTranscriptExpressionInTissue = mean(
      transcripts.map((transcript: any) => transcript.gtex_tissue_expression[tissueId])
    )

    return {
      ...acc,
      [tissueId]: {
        maxTranscriptExpressionInTissue,
        meanTranscriptExpressionInTissue,
        transcriptWithMaxExpressionInTissue,
      },
    }
  }, {})

  const maxMeanTranscriptExpressionInAnyTissue = max(
    Object.values(expressionByTissue).map((v: any) => v.meanTranscriptExpressionInTissue)
  )

  let tissues
  if (sortTissuesBy === 'mean-expression') {
    tissues = Object.entries(GTEX_TISSUE_NAMES)
      .sort((t1: any, t2: any) => {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        const t1Expression = expressionByTissue[t1[0]].meanTranscriptExpressionInTissue
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        const t2Expression = expressionByTissue[t2[0]].meanTranscriptExpressionInTissue
        if (t1Expression === t2Expression) {
          return t1[1].localeCompare(t2[1])
        }
        return t2Expression - t1Expression
      })
      .map((t: any) => t[0])
  } else {
    tissues = Object.entries(GTEX_TISSUE_NAMES)
      .sort((t1: any, t2: any) => t1[1].localeCompare(t2[1]))
      .map((t: any) => t[0])
  }

  const isExpressed = expressionRegions.some((region: any) => region.mean !== 0)

  return (
    <>
      <Wrapper>
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
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
                {/* @ts-expect-error TS(2322) FIXME: Type '{ topic: string; style: { display: string; }... Remove this comment to see the full error message */}
                <InfoButton topic="pext" style={{ display: 'inline' }} />
              </TissueName>
            )}
            renderRightPanel={({ width }: any) =>
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
            {({ scalePosition, width }: any) => {
              if (!isExpressed) {
                return (
                  <NotExpressedMessage>Gene is not expressed in GTEx tissues</NotExpressedMessage>
                )
              }

              return (
                <PlotWrapper>
                  <PextRegionsPlot
                    color="#428bca"
                    regions={getPlotRegions(expressionRegions, (r: any) => r.mean)}
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
        {flags.map((flag: any) => (
          <InnerWrapper key={flag}>
            {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
            <Badge level="warning">Warning</Badge> {FLAG_DESCRIPTIONS[flag]}
          </InnerWrapper>
        ))}
        {isExpanded && (
          <>
            <Track
              renderRightPanel={({ width }: any) => {
                return (
                  width > 30 && (
                    <RightPanel>
                      <InfoButton topic="pext-track-transcript-tissue-expression" />
                    </RightPanel>
                  )
                )
              }}
            >
              {() => {
                return (
                  <ControlsWrapper>
                    <label htmlFor="tissue-expression-track-sort-tissues-by">
                      Sort tissues by:{' '}
                      {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
                      <Select
                        id="tissue-expression-track-sort-tissues-by"
                        value={sortTissuesBy}
                        onChange={(e: any) => setSortTissuesBy(e.target.value)}
                      >
                        <option value="alphabetical">Alphabetical</option>
                        <option value="mean-expression">
                          Mean transcript expression in tissue
                        </option>
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
                        // @ts-expect-error TS(2322) FIXME: Type '{ id: string; placeholder: string; value: st... Remove this comment to see the full error message
                        id="tissue-expression-track-filter"
                        placeholder="tissue"
                        value={tissueFilterText}
                        onChange={setTissueFilterText}
                      />
                    </label>
                  </ControlsWrapper>
                )
              }}
            </Track>
            {(tissueFilterText ? tissues.filter(tissuePredicate(tissueFilterText)) : tissues).map(
              (tissue: any) => (
                <IndividualTissueTrack
                  key={tissue}
                  exons={exons}
                  expressionRegions={expressionRegions}
                  maxTranscriptExpressionInTissue={
                    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    expressionByTissue[tissue].maxTranscriptExpressionInTissue
                  }
                  maxMeanTranscriptExpressionInAnyTissue={maxMeanTranscriptExpressionInAnyTissue}
                  meanTranscriptExpressionInTissue={
                    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    expressionByTissue[tissue].meanTranscriptExpressionInTissue
                  }
                  transcriptWithMaxExpressionInTissue={
                    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                    expressionByTissue[tissue].transcriptWithMaxExpressionInTissue
                  }
                  tissue={tissue}
                />
              )
            )}
            <span>
              <Button
                onClick={() => {
                  setIsExpanded(false)
                  setTimeout(() => {
                    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
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
          // @ts-expect-error TS(2820) FIXME: Type '"xlarge"' is not assignable to type '"small"... Remove this comment to see the full error message
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

TissueExpressionTrack.defaultProps = {
  preferredTranscriptId: null,
  preferredTranscriptDescription: null,
}

export default TissueExpressionTrack
