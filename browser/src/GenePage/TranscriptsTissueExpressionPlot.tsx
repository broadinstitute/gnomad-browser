import { max, mean, median } from 'd3-array'
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale'
import React from 'react'
import { AxisBottom, AxisLeft } from '@vx/axis'

import { TooltipAnchor } from '@gnomad/ui'

import { GTEX_TISSUE_NAMES } from '../gtex'

const mergeOverlappingRegions = (regions: any) => {
  if (regions.length === 0) {
    return []
  }

  const mergedRegions = [{ ...regions[0] }]

  let previousRegion = mergedRegions[0]

  for (let i = 1; i < regions.length; i += 1) {
    const nextRegion = regions[i]

    if (nextRegion.start <= previousRegion.stop + 1) {
      if (nextRegion.stop > previousRegion.stop) {
        previousRegion.stop = nextRegion.stop
      }
    } else {
      previousRegion = { ...nextRegion }
      mergedRegions.push(previousRegion)
    }
  }

  return mergedRegions
}

const regionViewerScale = (domainRegions: any, range: any) => {
  const totalRegionSize = domainRegions.reduce(
    (acc: any, region: any) => acc + (region.stop - region.start + 1),
    0
  )

  const scale = (position: any) => {
    const distanceToPosition = domainRegions
      .filter((region: any) => region.start <= position)
      .reduce(
        (acc: any, region: any) =>
          region.start <= position && position <= region.stop
            ? acc + position - region.start
            : acc + (region.stop - region.start + 1),
        0
      )

    return range[0] + (range[1] - range[0]) * (distanceToPosition / totalRegionSize)
  }

  return scale
}

type TranscriptsPlotProps = {
  transcripts: {
    transcript_id: string
    exons: {
      feature_type: string
      start: number
      stop: number
    }[]
  }[]
  width: number
}

const TranscriptsPlot = ({ transcripts, width }: TranscriptsPlotProps) => {
  const composite = mergeOverlappingRegions(
    transcripts
      .flatMap((transcript: any) => transcript.exons)
      .filter((exon: any) => exon.feature_type !== 'UTR')
      .map((exon: any) => ({
        ...exon,
        start: Math.max(exon.start - 25, 0),
        stop: exon.stop + 25,
      }))
      .sort((r1: any, r2: any) => r1.start - r2.start)
  )

  const xScale = regionViewerScale(composite, [0, width])

  return (
    <g>
      {transcripts.map((transcript, i) => {
        return (
          <g
            key={transcript.transcript_id}
            transform={`translate(0, ${i * (18 * 1.2) + 18 * 0.1})`}
          >
            {transcript.exons
              .filter((exon) => exon.feature_type !== 'UTR')
              .map((exon) => {
                const x1 = xScale(exon.start)
                const x2 = xScale(exon.stop)
                return (
                  <rect
                    key={`${exon.start}-${exon.stop}`}
                    x={x1}
                    y={6}
                    width={x2 - x1}
                    height={6}
                    fill={exon.feature_type === 'CDS' ? '#424242' : '#bdbdbd'}
                  />
                )
              })}
          </g>
        )
      })}
    </g>
  )
}

const margin = {
  bottom: 150,
  left: 120,
  right: 10,
  top: 45,
}

type OwnTranscriptsTissueExpressionPlotProps = {
  tissues?: string[]
  transcripts: {
    transcript_id: string
    transcript_version: string
    gtex_tissue_expression: {
      [key: string]: number
    }
  }[]
  starredTranscriptId?: string
}

// @ts-expect-error TS(2456) FIXME: Type alias 'TranscriptsTissueExpressionPlotProps' ... Remove this comment to see the full error message
type TranscriptsTissueExpressionPlotProps = OwnTranscriptsTissueExpressionPlotProps &
  typeof TranscriptsTissueExpressionPlot.defaultProps

// @ts-expect-error TS(7022) FIXME: 'TranscriptsTissueExpressionPlot' implicitly has t... Remove this comment to see the full error message
const TranscriptsTissueExpressionPlot = ({
  tissues,
  transcripts,
  starredTranscriptId,
}: TranscriptsTissueExpressionPlotProps) => {
  const renderedTissues = ['Mean', 'Median', ...tissues]

  const transcriptsWithMeanAndMedianExpresion = transcripts.map((transcript: any) => {
    const expressionValues = Object.values(transcript.gtex_tissue_expression)
    return {
      ...transcript,
      gtex_tissue_expression: {
        ...transcript.gtex_tissue_expression,
        // @ts-expect-error TS(2345) FIXME: Argument of type 'unknown[]' is not assignable to ... Remove this comment to see the full error message
        Mean: mean(expressionValues),
        // @ts-expect-error TS(2345) FIXME: Argument of type 'unknown[]' is not assignable to ... Remove this comment to see the full error message
        Median: median(expressionValues),
      },
    }
  })

  const maxTissueExpression = max(
    transcripts.flatMap((transcript: any) => Object.values(transcript.gtex_tissue_expression))
  )

  // @ts-expect-error TS(2345) FIXME: Argument of type '(string | number | undefined)[]'... Remove this comment to see the full error message
  const opacityScale = scaleLinear().domain([0, maxTissueExpression]).range([0, 1])

  const transcriptsWidth = 150
  const cellSize = 18
  const padding = 0.2
  const gutterWidth = 9
  const plotWidth = 1 + renderedTissues.length * cellSize + gutterWidth
  const plotHeight = transcripts.length * cellSize * (1 + padding)

  const height = plotHeight + margin.top + margin.bottom
  const width = plotWidth + margin.left + margin.right + transcriptsWidth

  const baseXScale = scaleBand()
    .domain(renderedTissues)
    .range([1, plotWidth - gutterWidth])

  const xBandWidth = baseXScale.bandwidth()

  const xScale = scaleOrdinal()
    .domain(renderedTissues)
    .range([
      ...renderedTissues.slice(0, 2).map(baseXScale),
      // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      ...renderedTissues.slice(2).map((tissueId) => baseXScale(tissueId) + gutterWidth),
    ])

  const xAxisScale = scaleOrdinal()
    .domain(renderedTissues)
    .range(
      [
        ...renderedTissues.slice(0, 2).map(baseXScale),
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
        ...renderedTissues.slice(2).map((tissueId) => baseXScale(tissueId) + gutterWidth),
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
      ].map((x) => x + xBandWidth / 2)
    )

  const yScale = scaleBand()
    .domain(transcriptsWithMeanAndMedianExpresion.map((t: any) => t.transcript_id))
    .range([0, plotHeight])
    .padding(padding)

  const yBandWidth = yScale.bandwidth()

  const halfYPadding = (yScale.step() * yScale.paddingInner()) / 2

  const transcriptLabels = transcripts.reduce(
    // @ts-expect-error TS(7006) FIXME: Parameter 'acc' implicitly has an 'any' type.
    (acc, transcript) => ({
      ...acc,
      [transcript.transcript_id]: `${transcript.transcript_id}.${transcript.transcript_version}`,
    }),
    {}
  )
  if (starredTranscriptId) {
    transcriptLabels[starredTranscriptId] += '*'
  }

  return (
    <svg height={height} width={width}>
      <defs>
        <linearGradient id="expression-gradient">
          <stop offset="0%" stopColor="#3f007d00" />
          <stop offset="100%" stopColor="#3f007d" />
        </linearGradient>
      </defs>

      <g transform="translate(10, 10)">
        <text x={10} y={7} dx="-0.25em" dy="0.25em" fontSize={10} textAnchor="end">
          0
        </text>
        <rect x={10} y={0} height={14} width={60} fill="url(#expression-gradient)" />
        <text x={70} y={7} dx="0.25em" dy="0.25em" fontSize={10} textAnchor="start">
          {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
          {maxTissueExpression.toPrecision(4)}
        </text>
      </g>

      {transcripts.slice(1).map((transcript: any) => {
        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
        const y = margin.top + yScale(transcript.transcript_id) - halfYPadding

        return (
          <line
            key={transcript.transcript_id}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke="#ccc"
            strokeWidth={1}
          />
        )
      })}

      <AxisLeft
        left={margin.left}
        numTicks={transcripts.length}
        tickFormat={(transcriptId) => transcriptLabels[transcriptId]}
        tickLabelProps={() => ({
          dx: -112,
          dy: '0.25em',
          fill: '#000',
          fontSize: 10,
          textAnchor: 'start',
        })}
        top={margin.top}
        scale={yScale}
        stroke="#333"
      />
      <line
        x1={margin.left}
        y1={margin.top + plotHeight}
        x2={margin.left + plotWidth}
        y2={margin.top + plotHeight}
        stroke="#333"
        strokeWidth={1}
      />
      <AxisBottom
        left={margin.left}
        top={margin.top + plotHeight}
        // @ts-expect-error TS(2322) FIXME: Type 'ScaleOrdinal<string, unknown, never>' is not... Remove this comment to see the full error message
        scale={xAxisScale}
        stroke="#333"
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        tickFormat={(t) => GTEX_TISSUE_NAMES[t] || t}
        tickLabelProps={(value) => ({
          dx: '-0.25em',
          dy: '0.25em',
          fill: '#000',
          fontSize: 10,
          textAnchor: 'end',
          // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
          transform: `translate(0, 0), rotate(-40 ${xScale(value) + xBandWidth / 2}, 0)`,
        })}
        tickLength={3}
      />
      <g transform={`translate(${margin.left},${margin.top})`}>
        {transcriptsWithMeanAndMedianExpresion.map((transcript: any) => (
          <g
            key={transcript.transcript_id}
            transform={`translate(0, ${yScale(transcript.transcript_id)})`}
          >
            {renderedTissues.map((tissueId) => {
              let tooltipText
              if (tissueId === 'Mean' || tissueId === 'Median') {
                tooltipText = `${
                  transcript.transcript_id
                } ${tissueId} expression: ${transcript.gtex_tissue_expression[tissueId].toFixed(
                  2
                )} TPM`
              } else {
                tooltipText = `${transcript.transcript_id} expression in ${
                  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                  GTEX_TISSUE_NAMES[tissueId]
                } tissues: ${transcript.gtex_tissue_expression[tissueId].toFixed(2)} TPM`
              }

              return (
                <React.Fragment key={tissueId}>
                  <rect
                    // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
                    x={xScale(tissueId) + 1}
                    y={1}
                    width={xBandWidth - 2}
                    height={yBandWidth - 2}
                    rx={3}
                    fill="#3f007d"
                    opacity={opacityScale(transcript.gtex_tissue_expression[tissueId])}
                  />
                  {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; key: any; tooltip: stri... Remove this comment to see the full error message */}
                  <TooltipAnchor key={tissueId} tooltip={tooltipText}>
                    <rect
                      // @ts-expect-error TS(2322) FIXME: Type 'unknown' is not assignable to type 'string |... Remove this comment to see the full error message
                      x={xScale(tissueId)}
                      y={0}
                      width={xBandWidth}
                      height={yBandWidth}
                      fill="none"
                      pointerEvents="visible"
                    />
                  </TooltipAnchor>
                </React.Fragment>
              )
            })}
          </g>
        ))}
      </g>
      <text x={width - transcriptsWidth} y={margin.top - 10} dy="0.25em" fill="#000">
        Exons
      </text>
      <g transform={`translate(${width - transcriptsWidth}, ${margin.top})`}>
        <TranscriptsPlot transcripts={transcripts} width={transcriptsWidth} />
      </g>
    </svg>
  )
}

TranscriptsTissueExpressionPlot.defaultProps = {
  tissues: Object.entries(GTEX_TISSUE_NAMES)
    .sort((t1: any, t2: any) => t1[1].localeCompare(t2[1]))
    .map((t: any) => t[0]),
  starredTranscriptId: null,
}

export default TranscriptsTissueExpressionPlot
