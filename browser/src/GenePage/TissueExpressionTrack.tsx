import { max, mean } from 'd3-array'
import { scaleLinear } from 'd3-scale'
import React, { useRef, useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { RegionsPlot } from '@gnomad/track-regions'
import { Badge, Button, Modal, SearchInput, Select, TooltipAnchor } from '@gnomad/ui'

import { ALL_GTEX_TISSUES, GtexTissueName, GtexTissues } from '../gtex'
import InfoButton from '../help/InfoButton'

import { logButtonClick } from '../analytics'

import TranscriptsTissueExpression, { GtexTissueExpression } from './TranscriptsTissueExpression'
import { GeneTranscript } from './GenePage'

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
  gtexTissues: Partial<GtexTissues>
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
type ExpressedTissue = {
  tissue: string
  value: number
}

type IndividualTissueTrackProps = {
  gtexTissues: Partial<GtexTissues>
  exons: {
    start: number
    stop: number
  }[]
  expressionRegions: {
    start: number
    stop: number
    mean?: number
    tissues: ExpressedTissue[]
  }[]
  maxTranscriptExpressionInTissue: number
  maxMeanTranscriptExpressionInAnyTissue: number
  meanTranscriptExpressionInTissue: number
  tissue: GtexTissueName
  transcriptWithMaxExpressionInTissue: {
    transcript_id: string
    transcript_version: string
  } | null
}

const IndividualTissueTrack = ({
  gtexTissues,
  exons,
  expressionRegions,
  maxTranscriptExpressionInTissue,
  maxMeanTranscriptExpressionInAnyTissue,
  meanTranscriptExpressionInTissue,
  tissue,
  transcriptWithMaxExpressionInTissue,
}: IndividualTissueTrackProps) => {
  const isExpressed = expressionRegions.some(
    (region: any) =>
      region.tissues.find((tissueObject: ExpressedTissue) => tissueObject.tissue === tissue)
        ?.value !== 0
  )

  return (
    <Track
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      renderLeftPanel={() => <TissueName>{gtexTissues[tissue].fullName}</TissueName>}
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
                    )} (${transcriptWithMaxExpressionInTissue!.transcript_id}.${
                      transcriptWithMaxExpressionInTissue!.transcript_version
                    })`
                  : `Gene is not expressed in ${gtexTissues[tissue]!.fullName}`
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
              gtexTissues={gtexTissues}
              color={gtexTissues[tissue]!.color}
              regions={getPlotRegions(
                expressionRegions,
                (r: any) =>
                  r.tissues.find((tissueObject: ExpressedTissue) => tissueObject.tissue === tissue)
                    ?.value || 0
              )}
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

// Omit gtex then re-include to remove the possible null, as this component only renders if gtex and pext are non null
export type TranscriptWithTissueExpression = Omit<GeneTranscript, 'gtex_tissue_expression'> & {
  gtex_tissue_expression: GtexTissueExpression
}

type TissueExpressionTrackProps = {
  exons: {
    start: number
    stop: number
  }[]
  expressionRegions: {
    start: number
    stop: number
    mean?: number
    tissues: {
      tissue: string
      value: number
    }[]
  }[]
  flags: string[]
  transcripts: TranscriptWithTissueExpression[]
  preferredTranscriptId?: string
  preferredTranscriptDescription?: string | React.ReactNode
}

export type GtexTissueDetail = {
  fullName: string
  color: string
  value: number
}

const TissueExpressionTrack = ({
  exons,
  expressionRegions,
  flags,
  transcripts,
  preferredTranscriptId,
  preferredTranscriptDescription,
}: TissueExpressionTrackProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showTranscriptTissueExpressionModal, setShowTranscriptTissueExpressionModal] =
    useState(false)
  const [tissueFilterText, setTissueFilterText] = useState('')
  const mainTrack = useRef()
  const [sortTissuesBy, setSortTissuesBy] = useState<'alphabetical' | 'mean-expression'>(
    'alphabetical'
  )

  const gtexTissues: Partial<Record<GtexTissueName, GtexTissueDetail>> = {}
  transcripts
    .find((transcript) => transcript.transcript_id === preferredTranscriptId)
    ?.gtex_tissue_expression.forEach((tissue) => {
      gtexTissues[tissue.tissue as GtexTissueName] = {
        fullName: ALL_GTEX_TISSUES[tissue.tissue as GtexTissueName].fullName || tissue.tissue,
        color: ALL_GTEX_TISSUES[tissue.tissue as GtexTissueName].color || '#888888',
        value: tissue.value,
      }
    })

  type ExpressionByTissueDetails = {
    maxTranscriptExpressionInTissue: number
    meanTranscriptExpressionInTissue: number
    transcriptWithMaxExpressionInTissue: {
      transcript_id: string
      transcript_version: string
    } | null
  }
  type ExpressionByTissue = Record<string, ExpressionByTissueDetails>

  const expressionByTissue: ExpressionByTissue = Object.keys(gtexTissues).reduce(
    (acc, tissueId) => {
      let maxTranscriptExpressionInTissue = 0
      let transcriptWithMaxExpressionInTissue = null

      transcripts.forEach((transcript) => {
        const expressionInTissue = transcript.gtex_tissue_expression.find(
          (tissue) => tissue.tissue === tissueId
        )

        if (expressionInTissue && expressionInTissue.value > maxTranscriptExpressionInTissue) {
          maxTranscriptExpressionInTissue = expressionInTissue.value
          transcriptWithMaxExpressionInTissue = {
            transcript_id: transcript.transcript_id,
            transcript_version: transcript.transcript_version,
          }
        }
      })

      const meanTranscriptExpressionInTissue = mean(
        transcripts
          .map(
            (transcript) =>
              transcript.gtex_tissue_expression.find((tissue) => tissue.tissue === tissueId)?.value
          )
          .filter((value): value is number => value !== undefined)
      )

      return {
        ...acc,
        [tissueId]: {
          maxTranscriptExpressionInTissue,
          meanTranscriptExpressionInTissue,
          transcriptWithMaxExpressionInTissue,
        },
      }
    },
    {}
  )

  const maxMeanTranscriptExpressionInAnyTissue = max(
    Object.values(expressionByTissue).map((v) => v.meanTranscriptExpressionInTissue)
  )!

  const tissues =
    sortTissuesBy === 'mean-expression'
      ? Object.entries(gtexTissues)
          .sort((t1, t2) => {
            const t1Expression = expressionByTissue[t1[0]].meanTranscriptExpressionInTissue
            const t2Expression = expressionByTissue[t2[0]].meanTranscriptExpressionInTissue
            if (t1Expression === t2Expression) {
              return ALL_GTEX_TISSUES[t1[0] as GtexTissueName].fullName.localeCompare(
                ALL_GTEX_TISSUES[t2[0] as GtexTissueName].fullName
              )
            }
            return t2Expression - t1Expression
          })
          .map((t: any) => t[0])
      : Object.entries(gtexTissues)
          .sort((t1, t2) =>
            ALL_GTEX_TISSUES[t1[0] as GtexTissueName].fullName.localeCompare(
              ALL_GTEX_TISSUES[t2[0] as GtexTissueName].fullName
            )
          )
          .map((t) => t[0])

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
                    if (!isExpanded) {
                      logButtonClick('User expanded v2 tissue expression track')
                    }
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
                    gtexTissues={gtexTissues}
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
              (tissue: any) => {
                return (
                  <IndividualTissueTrack
                    gtexTissues={gtexTissues}
                    key={`${tissue}`}
                    exons={exons}
                    expressionRegions={expressionRegions}
                    maxTranscriptExpressionInTissue={
                      expressionByTissue[tissue].maxTranscriptExpressionInTissue
                    }
                    maxMeanTranscriptExpressionInAnyTissue={maxMeanTranscriptExpressionInAnyTissue}
                    meanTranscriptExpressionInTissue={
                      expressionByTissue[tissue].meanTranscriptExpressionInTissue
                    }
                    transcriptWithMaxExpressionInTissue={
                      expressionByTissue[tissue].transcriptWithMaxExpressionInTissue
                    }
                    tissue={tissue}
                  />
                )
              }
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
            gtexTissues={gtexTissues}
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
