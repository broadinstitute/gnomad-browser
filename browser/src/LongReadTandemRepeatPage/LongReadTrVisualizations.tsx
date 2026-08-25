import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { FixedSizeList } from 'react-window'
import styled from 'styled-components'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import Link from '../Link'
import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import ControlSection from '../VariantPage/ControlSection'
import ShortTandemRepeatColorBySelect from '../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect'
import ShortTandemRepeatPopulationOptions from '../ShortTandemRepeatPage/ShortTandemRepeatPopulationOptions'
import ShortTandemRepeatScaleSelect from '../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect'
import {
  ColorBy,
  ScaleType,
} from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import { Sex, logScaleAllowed } from '../ShortTandemRepeatPage/ShortTandemRepeatPage'
import { longReadAncestryGroupDisplayName } from '../LongReadVariantPage/longReadAncestryGroups'
import ExactTrAltMotifStructure from '../VariantPage/ExactTrAltMotifStructure'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import { PATH_COLORS, SUPERPOPULATION_COLORS } from '../Haplotypes/colors'
import { decomposeExactTrAlt } from '../Haplotypes/trAlleleStructureData'
import {
  AlleleBin,
  AlleleNavigation,
  GenotypeCell,
  GenotypePair,
  LongReadTrAllele,
  LongReadTrLocus,
  LongReadTrSelectedAllele,
  PurityPoint,
  WholeRecordAlleleLandscapeData,
  WholeRecordGenotypeLandscapeData,
} from './types'

const Panel = styled.section`
  margin-top: 2.4em;
`

const PlotGrid = styled.div<{ $columns: 2 | 3 }>`
  display: grid;
  grid-template-columns: repeat(${(props) => props.$columns}, minmax(0, 1fr));
  align-items: start;
  gap: 1.25em;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 100%);
  }
`

const PlotCard = styled.div`
  min-width: 0;
  padding: 1em;
  border: 1px solid #d8dee2;
  border-radius: 4px;
  background: #fbfcfd;

  h3 {
    margin-top: 0;
  }
`

const GenotypePairDetail = styled.div`
  grid-column: 1 / -1;
  min-width: 0;
  padding: 0.7em 1em;
  border: 1px solid #d8dee2;
  border-radius: 4px;
  background: #fbfcfd;

  summary {
    cursor: pointer;
  }
`

const ControlGroupLabel = styled.strong`
  align-self: center;
  white-space: nowrap;
`

const signed = (value: number) => {
  if (value > 0) return `+${value}`
  if (value < 0) return `−${Math.abs(value)}`
  return '0'
}
const UNAVAILABLE_REASON_COPY: Record<string, string> = {
  ALLELE_INDEX_SEQUENCE_BYTE_BOUND_EXCEEDED: 'the allele sequences are too large to preview safely',
  BOUND_EXCEEDED: 'the result is too large to display safely',
  EXACT_ALT_LIMIT_EXCEEDED:
    'the locus has more alternate alleles than this view can display safely',
  NO_METADATA: 'the source does not include the required metadata',
  NOT_AVAILABLE: 'the source does not provide these data',
  SELECTED_ALLELE_DETAIL_BYTE_BOUND_EXCEEDED:
    'the selected allele sequence is too large to display safely',
}

const unavailableReason = (reason: string | null | undefined) =>
  (reason && UNAVAILABLE_REASON_COPY[reason]) || 'the required source data are unavailable'

const TotalAlleleLengthHelp = () => (
  <HaplotypeHelpButton title="About total allele length change">
    <p style={{ marginTop: 0 }}>
      Total allele length change is the length of the complete source ALT sequence minus the length
      of the complete source REF sequence, in base pairs. It spans every repeat component and
      interruption in the source record.
    </p>
    <p style={{ marginBottom: 0 }}>
      It is not a component repeat count or a clinical classification. Different exact alleles can
      have the same total length change.
    </p>
  </HaplotypeHelpButton>
)

const SelectionLink = ({
  alleleId,
  children,
  navigation,
  selected = false,
  ...linkProps
}: {
  alleleId: string
  children: React.ReactNode
  navigation: AlleleNavigation
  selected?: boolean
  className?: string
  style?: React.CSSProperties
  title?: string
  'aria-label'?: string
  'data-called-alleles'?: number
  'data-point-diameter'?: number
}) => (
  <Link
    {...linkProps}
    to={navigation.hrefForAllele(alleleId)}
    preserveSelectedDataset={false}
    aria-current={selected ? 'true' : undefined}
    onMouseDown={(event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      event.preventDefault()
      const list = event.currentTarget.closest<HTMLElement>('.lr-tr-exact-index-scroll')
      if (list) {
        list.dataset.activationScrollTop = String(list.scrollTop)
        list.dataset.activationWindowX = String(window.scrollX)
        list.dataset.activationWindowY = String(window.scrollY)
      }
      event.currentTarget.focus({ preventScroll: true })
    }}
    onClick={(event: React.MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      event.preventDefault()
      navigation.onSelectAllele(alleleId)
    }}
  >
    {children}
  </Link>
)

const knownMotifColors: Record<string, string> = {
  CAG: '#d53d3d',
  CAA: '#2f83bd',
  CCG: '#e9781c',
  CCT: '#268553',
  GCC: '#7953aa',
}
const fallbackMotifColors = ['#1769aa', '#5f6b72', '#8b5a2b', '#7a6f21', '#4b7082']

export const motifColor = (motif: string, orderedMotifs?: readonly string[]) => {
  const motifIndex = orderedMotifs?.indexOf(motif) ?? -1
  if (motifIndex >= 0) return PATH_COLORS[motifIndex % PATH_COLORS.length]
  if (knownMotifColors[motif]) return knownMotifColors[motif]
  const hash = Array.from(motif).reduce((value, character) => value + character.charCodeAt(0), 0)
  return fallbackMotifColors[hash % fallbackMotifColors.length]
}

const UNKNOWN_STACK_COLOR = '#8C8C8C'
const SEX_STACK_COLORS: Record<string, string> = {
  XX: '#F7C3CC',
  XY: '#6AA6CE',
  unknown: UNKNOWN_STACK_COLOR,
}

export const stackColorFor = (colorBy: ColorBy | null, category: string) => {
  if (colorBy === 'sex') return SEX_STACK_COLORS[category] || UNKNOWN_STACK_COLOR
  if (colorBy === 'population') {
    const superpopulation = category.toLowerCase() === 'nfe' ? 'EUR' : category.toUpperCase()
    return SUPERPOPULATION_COLORS[superpopulation] || UNKNOWN_STACK_COLOR
  }
  return UNKNOWN_STACK_COLOR
}

export const componentLanes = (components: LongReadTrLocus['components']) => {
  const laneEnds: number[] = []
  return components.map((component) => {
    let lane = laneEnds.findIndex((end) => component.start0 >= end)
    if (lane < 0) lane = laneEnds.length
    laneEnds[lane] = component.end0
    return lane
  })
}

export const LongReadTrComponentTrack = ({
  locus,
  highlightedComponentIndex = null,
}: {
  locus: LongReadTrLocus
  highlightedComponentIndex?: number | null
}) => {
  const { components, region } = locus
  const hasAuthorizedHighlight =
    highlightedComponentIndex != null &&
    highlightedComponentIndex >= 0 &&
    highlightedComponentIndex < components.length
  const lanes = componentLanes(components)
  const laneCount = Math.max(1, ...lanes.map((lane) => lane + 1))
  const width = 1000
  const left = 80
  const plotWidth = 880
  const x = (position: number) =>
    left + ((position - region.start0) / Math.max(1, region.end0 - region.start0)) * plotWidth

  return (
    <Panel aria-labelledby="lr-tr-components-heading">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <h2 id="lr-tr-components-heading" style={{ marginRight: 0 }}>
          Reference repeat components
        </h2>
        <HaplotypeHelpButton title="About reference repeat components">
          <p style={{ marginTop: 0 }}>
            These are the ordered reference intervals in the source tandem-repeat definition.
            Coordinates are one-based, inclusive genomic intervals.
          </p>
          <p>
            Overlapping intervals use separate lanes rather than being merged. Repeated motifs
            remain separate because their interval and order are scientifically meaningful.
          </p>
          <p>
            An outlined component marks the one exact coordinate-and-motif match to a pathogenic
            motif in the short-read catalog. It does not classify the long-read component as
            pathogenic.
          </p>
          <p style={{ marginBottom: 0 }}>
            This reference track does not infer an alternate sequence or repeat count and is not a
            clinical interpretation.
          </p>
        </HaplotypeHelpButton>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${85 + laneCount * 54}`}
          style={{ display: 'block', minWidth: 700, width: '100%' }}
          role="img"
          aria-label={`${
            components.length
          } ordered reference repeat components in ${laneCount} coordinate lanes${
            hasAuthorizedHighlight
              ? `; component ${
                  (highlightedComponentIndex as number) + 1
                } is outlined as a catalog pathogenic motif with an exact reference-component match`
              : ''
          }`}
        >
          <line
            x1={left}
            y1={30 + laneCount * 54}
            x2={left + plotWidth}
            y2={30 + laneCount * 54}
            stroke="#778188"
          />
          {components.map((component, index) => {
            const componentWidth = Math.max(2, x(component.end0) - x(component.start0))
            const y = 12 + lanes[index] * 54
            const label = `Component ${index + 1}, ${component.motif}, chr${component.chrom}:${(
              component.start0 + 1
            ).toLocaleString()}–${component.end0.toLocaleString()}, ${
              component.end0 - component.start0
            } bp`
            const compactLabel = componentWidth < 44
            const highlighted = hasAuthorizedHighlight && index === highlightedComponentIndex
            const accessibleLabel = highlighted
              ? `${label}; catalog pathogenic motif; exact reference-component match; not a pathogenic long-read component`
              : label
            return (
              // Source component order is identity-bearing, including exact duplicate components.
              // eslint-disable-next-line react/no-array-index-key
              <g key={`${component.start0}-${component.end0}-${component.motif}-${index}`}>
                <rect
                  x={x(component.start0)}
                  y={y}
                  width={componentWidth}
                  height={28}
                  rx={3}
                  fill={motifColor(component.motif, locus.motifs)}
                  data-component-motif={component.motif}
                  data-motif-color={motifColor(component.motif, locus.motifs)}
                  stroke={highlighted ? '#111' : undefined}
                  strokeWidth={highlighted ? 4 : undefined}
                  strokeDasharray={highlighted ? '7 3' : undefined}
                  data-catalog-pathogenic-match={highlighted ? 'true' : undefined}
                >
                  <title>{accessibleLabel}</title>
                </rect>
                <text
                  x={x(component.start0) + componentWidth / 2}
                  y={y + 19}
                  fill="#fff"
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {compactLabel ? index + 1 : component.motif}
                </text>
                {!compactLabel && (
                  <text
                    x={x(component.start0) + componentWidth / 2}
                    y={y + 43}
                    fill="#4f5960"
                    fontSize={10}
                    textAnchor="middle"
                  >
                    {component.end0 - component.start0} bp
                  </text>
                )}
              </g>
            )
          })}
          <text x={left} y={60 + laneCount * 54} fill="#4f5960" fontSize={11}>
            chr{region.chrom}:{(region.start0 + 1).toLocaleString()}
          </text>
          <text
            x={left + plotWidth}
            y={60 + laneCount * 54}
            fill="#4f5960"
            fontSize={11}
            textAnchor="end"
          >
            chr{region.chrom}:{region.end0.toLocaleString()}
          </text>
        </svg>
      </div>
      <details>
        <summary>Source component coordinates ({components.length})</summary>
        <ol aria-label="Ordered source component details">
          {components.map((component, index) => (
            // Source component order is identity-bearing, including exact duplicate components.
            // eslint-disable-next-line react/no-array-index-key
            <li key={`${component.start0}-${component.end0}-${index}`}>
              <strong>{component.motif}</strong> — chr{component.chrom}:
              {(component.start0 + 1).toLocaleString()}–{component.end0.toLocaleString()} (
              {component.end0 - component.start0} bp; lane {lanes[index] + 1})
              {hasAuthorizedHighlight && index === highlightedComponentIndex
                ? ' — catalog pathogenic motif; exact reference-component match'
                : ''}
            </li>
          ))}
        </ol>
      </details>
    </Panel>
  )
}

const HistogramChart = styled.div`
  display: grid;
  grid-template-columns: 48px calc(100% - 56px);
  gap: 8px;
  margin: 1.8em 0 1.2em;
`

const HistogramYScale = styled.div<{ $height: number }>`
  position: relative;
  height: ${(props) => props.$height}px;
  border-right: 1px solid #89939a;
`

const HistogramScroller = styled.div`
  overflow-x: auto;
  min-width: 0;
`

const HistogramScrollContent = styled.div`
  min-width: 100%;
`

const Histogram = styled.div<{ $height: number; $gap: number }>`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  box-sizing: border-box;
  gap: ${(props) => props.$gap}px;
  height: ${(props) => props.$height}px;
  padding-top: 18px;
`

const AxisTick = styled.span`
  position: absolute;
  right: 5px;
  transform: translateY(50%);
  color: #566168;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const AxisTitle = styled.span`
  position: absolute;
  top: 50%;
  left: -23px;
  width: 170px;
  transform: translate(-50%, -50%) rotate(-90deg);
  color: #566168;
  font-size: 10px;
  text-align: center;
`

const BarButton = styled.button<{
  $height: number
  $selected: boolean
  $hasValue: boolean
  $width: number
}>`
  position: relative;
  flex: 0 0 ${(props) => props.$width}px;
  min-width: 12px;
  max-width: 48px;
  height: ${(props) => props.$height}%;
  min-height: ${(props) => (props.$hasValue ? '3px' : '1px')};
  padding: 0;
  border: ${(props) => {
    if (props.$selected) return '3px solid #222'
    return props.$hasValue ? `1px solid ${LONG_READ_PRIMARY_PLOT_COLOR}` : '0'
  }};
  border-bottom: ${(props) => {
    if (props.$selected) return '3px solid #222'
    return props.$hasValue ? `1px solid ${LONG_READ_PRIMARY_PLOT_COLOR}` : '1px solid #89939a'
  }};
  border-radius: 2px 2px 0 0;
  background: ${(props) => {
    if (!props.$hasValue) return 'transparent'
    return props.$selected ? '#e9781c' : LONG_READ_PRIMARY_PLOT_COLOR
  }};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid #111;
    outline-offset: 2px;
  }
`

const BarExactCount = styled.span`
  position: absolute;
  top: -1.5em;
  left: 50%;
  transform: translateX(-50%);
  color: #525d64;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const HistogramXAxis = styled.div<{ $height: number; $width: number }>`
  position: relative;
  box-sizing: border-box;
  width: ${(props) => props.$width}px;
  height: ${(props) => props.$height}px;
  border-top: 1px solid #566168;
  margin: 0 auto;
  color: #3f484d;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
`

const HistogramXTick = styled.span<{ $lane: number; $left: number }>`
  position: absolute;
  top: ${(props) => 7 + props.$lane * 15}px;
  left: ${(props) => props.$left}px;
  transform: translateX(-50%);
  white-space: nowrap;

  &::before {
    content: '';
    position: absolute;
    top: ${(props) => -7 - props.$lane * 15}px;
    left: 50%;
    width: 1px;
    height: ${(props) => 5 + props.$lane * 15}px;
    background: #566168;
  }
`

const BarSegments = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column-reverse;
  overflow: hidden;

  span {
    display: block;
    width: 100%;
  }
`

const SelectAlleleControl = styled(SelectionLink)`
  display: inline-block;
  padding: 0.3em 0.7em;
  border: 1px solid #9aa8b2;
  border-radius: 3px;
  background: #fff;
  color: #111;
  text-decoration: none;

  &[aria-current='true'] {
    border-color: #a65310;
    background: #fff3e8;
    box-shadow: inset 0 0 0 1px #a65310;
  }

  &:hover {
    border-color: #397daf;
  }

  &:focus-visible {
    outline: 3px solid #111;
    outline-offset: 2px;
  }
`

const ScrollTable = styled.div`
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.55em 0.7em;
    border-bottom: 1px solid #ddd;
    text-align: left;
    white-space: nowrap;
  }

  th[scope='col'] {
    background: #f7f9fa;
  }

  tr[aria-selected='true'] {
    background: #fff3e8;
    outline: 2px solid #a65310;
    outline-offset: -2px;
  }
`

const binCount = (bin: AlleleBin, ancestry: PopulationId | null, sex: Sex | null): number => {
  if (!ancestry && !sex) return bin.called_alleles
  return bin.stacks
    .filter((stack) => stack.ancestry_group === (ancestry || null) && stack.sex === (sex || null))
    .reduce((sum, stack) => sum + stack.called_alleles, 0)
}

export const reconciledFilterOptions = (
  alleleLandscape: WholeRecordAlleleLandscapeData,
  genotypeLandscape?: WholeRecordGenotypeLandscapeData
) => {
  const genotypeAvailable = genotypeLandscape?.status === 'AVAILABLE'
  const alleleAncestries = alleleLandscape.ancestry_groups || []
  const alleleSexes = alleleLandscape.sexes || []
  const genotypeAncestries = genotypeAvailable ? genotypeLandscape.ancestry_groups || [] : []
  const genotypeSexes = genotypeAvailable ? genotypeLandscape.sexes || [] : []
  const shared = (alleleValues: string[], genotypeValues: string[]) =>
    genotypeAvailable
      ? alleleValues.filter((value) => genotypeValues.includes(value))
      : alleleValues

  return {
    ancestries: shared(alleleAncestries, genotypeAncestries) as PopulationId[],
    sexes: shared(alleleSexes, genotypeSexes) as Sex[],
  }
}

const scaleCap = (scale: ScaleType) =>
  ((
    {
      'linear-truncated-50': 50,
      'linear-truncated-200': 200,
      'linear-truncated-1000': 1000,
    } as Record<string, number>
  )[scale])

const scaleValue = (count: number, scale: ScaleType) => {
  if (scale === 'log') return Math.log10(count + 1)
  return Math.min(count, scaleCap(scale) || count)
}

export const histogramHeightPercent = (count: number, maxCount: number, scale: ScaleType) => {
  const domainMax = scale === 'log' ? scaleValue(maxCount, scale) : scaleCap(scale) || maxCount
  if (count <= 0 || domainMax <= 0) return 0
  return (scaleValue(count, scale) / domainMax) * 100
}

const histogramTicks = (maxCount: number, scale: ScaleType) => {
  if (scale === 'log') {
    const ticks = [0]
    for (let value = 1; value <= maxCount; value *= 10) ticks.push(value)
    if (maxCount > 0 && ticks[ticks.length - 1] !== maxCount) ticks.push(maxCount)
    return ticks
  }
  const domainMax = scaleCap(scale) || Math.max(1, maxCount)
  return [...new Set([0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(domainMax * part)))]
}

type HistogramDeltaTick = {
  delta: number
  lane: number
  left: number
}

const deltaTickWidth = (delta: number) => Math.max(20, signed(delta).length * 7 + 6)

export const histogramDeltaAxisTicks = (
  deltas: number[],
  barWidth: number,
  gap: number,
  selectedDelta: number | null
): HistogramDeltaTick[] => {
  if (!deltas.length) return []

  const centerForIndex = (index: number) => index * (barWidth + gap) + barWidth / 2
  const required = new Map<number, number>()
  required.set(deltas[0], centerForIndex(0))
  required.set(deltas[deltas.length - 1], centerForIndex(deltas.length - 1))

  const zeroIndex = deltas.indexOf(0)
  if (zeroIndex >= 0) {
    required.set(0, centerForIndex(zeroIndex))
  } else if (Math.min(...deltas) < 0 && Math.max(...deltas) > 0) {
    const lowerIndex = deltas.reduce(
      (best, delta, index) => (delta < 0 && (best < 0 || delta > deltas[best]) ? index : best),
      -1
    )
    const upperIndex = deltas.reduce(
      (best, delta, index) => (delta > 0 && (best < 0 || delta < deltas[best]) ? index : best),
      -1
    )
    if (lowerIndex >= 0 && upperIndex >= 0) {
      const lower = deltas[lowerIndex]
      const upper = deltas[upperIndex]
      const fraction = Math.abs(lower) / (upper - lower)
      required.set(
        0,
        centerForIndex(lowerIndex) +
          fraction * (centerForIndex(upperIndex) - centerForIndex(lowerIndex))
      )
    }
  }

  if (selectedDelta != null) {
    const selectedIndex = deltas.indexOf(selectedDelta)
    if (selectedIndex >= 0) required.set(selectedDelta, centerForIndex(selectedIndex))
  }

  const chosen = [...required].map(([delta, left]) => ({ delta, left }))
  const collides = (delta: number, left: number) =>
    chosen.some(
      (tick) =>
        Math.abs(tick.left - left) < (deltaTickWidth(tick.delta) + deltaTickWidth(delta)) / 2 + 6
    )

  deltas.forEach((delta, index) => {
    if (required.has(delta)) return
    const left = centerForIndex(index)
    if (!collides(delta, left)) chosen.push({ delta, left })
  })

  const laneEnds: number[] = []
  return chosen
    .sort((left, right) => left.left - right.left)
    .map((tick) => {
      const tickLeft = tick.left - deltaTickWidth(tick.delta) / 2
      let lane = laneEnds.findIndex((end) => tickLeft >= end + 6)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = tick.left + deltaTickWidth(tick.delta) / 2
      return { ...tick, lane }
    })
}

const alleleLabel = (alleleId: string) => {
  const match = /~([1-9][0-9]*)$/.exec(alleleId)
  return match ? `ALT ${match[1]}` : alleleId
}

const PurityPointLink = styled(SelectionLink)`
  position: absolute;
  display: block;
  box-sizing: border-box;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 50%;
  background: ${LONG_READ_PRIMARY_PLOT_COLOR};
  box-shadow: 0 0 0 1px #681875;
  cursor: pointer;

  &[aria-current='true'] {
    z-index: 2;
    border: 3px solid #111;
    background: #e9781c;
    box-shadow: 0 0 0 2px #fff;
  }

  &:focus-visible {
    outline: 3px solid #111;
    outline-offset: 3px;
    z-index: 3;
  }
`

export const purityPointDiameter = (value: number, minimum: number, maximum: number) => {
  if (minimum === maximum) return 16
  const normalized = Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)))
  const minimumDiameter = 8
  const maximumDiameter = 26
  return Math.sqrt(
    minimumDiameter ** 2 + normalized * (maximumDiameter ** 2 - minimumDiameter ** 2)
  )
}

export const purityDomain = (values: number[]): [number, number] => {
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  if (minimum !== maximum) {
    const padding = (maximum - minimum) * 0.08
    return [Math.max(0, minimum - padding), Math.min(1, maximum + padding)]
  }

  const padding = Math.max(0.01, Math.abs(minimum) * 0.01)
  let domainMinimum = Math.max(0, minimum - padding)
  let domainMaximum = Math.min(1, maximum + padding)
  if (domainMinimum === domainMaximum) {
    if (domainMinimum === 0) domainMaximum = Math.min(1, domainMinimum + 0.02)
    else domainMinimum = Math.max(0, domainMaximum - 0.02)
  }
  return [domainMinimum, domainMaximum]
}

const purityDecimals = (domainMinimum: number, domainMaximum: number) => {
  const span = domainMaximum - domainMinimum
  if (span <= 0.02) return 4
  if (span <= 0.2) return 3
  return 2
}

const PurityScatter = ({
  points,
  selectedAllele,
  navigation,
}: {
  points: PurityPoint[]
  selectedAllele?: string
  navigation: AlleleNavigation
}) => {
  if (!points.length) return <p>Motif purity is unavailable.</p>
  const minDelta = Math.min(...points.map((point) => point.delta))
  const maxDelta = Math.max(...points.map((point) => point.delta))
  const [domainMinimum, domainMaximum] = purityDomain(points.map((point) => point.motif_purity))
  const domainSpan = domainMaximum - domainMinimum
  const decimals = purityDecimals(domainMinimum, domainMaximum)
  const purityTicks = [domainMinimum, domainMinimum + domainSpan / 2, domainMaximum]
  let scatterHeight = 270
  if (points.length <= 5) scatterHeight = 190
  else if (points.length <= 25) scatterHeight = 230
  const overlapCounts = points.reduce((counts, point) => {
    const key = `${point.delta}\u0000${point.motif_purity}`
    counts.set(key, (counts.get(key) || 0) + 1)
    return counts
  }, new Map<string, number>())
  const overlapIndexes = new Map<string, number>()
  const coincidentPoints = [...overlapCounts.values()].some((count) => count > 1)
  const minimumCalledAlleles = Math.min(...points.map((point) => point.called_alleles))
  const maximumCalledAlleles = Math.max(...points.map((point) => point.called_alleles))

  return (
    <>
      <div
        role="group"
        aria-label={`${points.length} exact alleles plotted by total allele length change and motif purity`}
        data-purity-domain={`${domainMinimum.toFixed(6)}:${domainMaximum.toFixed(6)}`}
        style={{
          position: 'relative',
          height: scatterHeight,
          margin: '1em 1.5em 2.5em 2.8em',
          borderLeft: '1px solid #89939a',
          borderBottom: '1px solid #89939a',
        }}
      >
        {purityTicks.map((tick) => {
          const bottom = 6 + ((tick - domainMinimum) / domainSpan) * 88
          return (
            <React.Fragment key={tick}>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: `${bottom}%`,
                  left: 0,
                  borderTop: '1px solid #e2e6e8',
                }}
              />
              <span
                data-testid="purity-axis-tick"
                style={{
                  position: 'absolute',
                  right: 'calc(100% + 6px)',
                  bottom: `${bottom}%`,
                  transform: 'translateY(50%)',
                  color: '#566168',
                  fontSize: 10,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {tick.toFixed(decimals)}
              </span>
            </React.Fragment>
          )
        })}
        {points.map((point) => {
          const left =
            minDelta === maxDelta ? 50 : 6 + ((point.delta - minDelta) / (maxDelta - minDelta)) * 88
          const bottom = 6 + ((point.motif_purity - domainMinimum) / domainSpan) * 88
          const size = purityPointDiameter(
            point.called_alleles,
            minimumCalledAlleles,
            maximumCalledAlleles
          )
          const overlapKey = `${point.delta}\u0000${point.motif_purity}`
          const overlapIndex = overlapIndexes.get(overlapKey) || 0
          overlapIndexes.set(overlapKey, overlapIndex + 1)
          const overlapCount = overlapCounts.get(overlapKey) || 1
          const overlapOffset = (overlapIndex - (overlapCount - 1) / 2) * 10
          return (
            <PurityPointLink
              key={point.allele_id}
              alleleId={point.allele_id}
              navigation={navigation}
              selected={point.allele_id === selectedAllele}
              title={`${alleleLabel(point.allele_id)}: ${signed(
                point.delta
              )} bp, purity ${point.motif_purity.toFixed(4)}, AC ${point.called_alleles}`}
              aria-label={`Select ${alleleLabel(point.allele_id)}, ${signed(
                point.delta
              )} bp, purity ${point.motif_purity.toFixed(4)}, ${
                point.called_alleles
              } called copies`}
              data-called-alleles={point.called_alleles}
              data-point-diameter={size}
              style={{
                left: `${left}%`,
                bottom: `${bottom}%`,
                width: size,
                height: size,
                transform: `translate(calc(-50% + ${overlapOffset}px), 50%)`,
              }}
            >
              <span aria-hidden="true" />
            </PurityPointLink>
          )
        })}
        {minDelta === maxDelta ? (
          <span
            style={{
              position: 'absolute',
              left: '50%',
              bottom: -28,
              transform: 'translateX(-50%)',
            }}
          >
            {signed(minDelta)} bp
          </span>
        ) : (
          <>
            <span style={{ position: 'absolute', left: '6%', bottom: -28 }}>
              {signed(minDelta)} bp
            </span>
            <span style={{ position: 'absolute', right: '6%', bottom: -28 }}>
              {signed(maxDelta)} bp
            </span>
          </>
        )}
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: -42,
            transform: 'translate(-50%, -50%) rotate(-90deg)',
            color: '#566168',
            fontSize: 10,
            whiteSpace: 'nowrap',
          }}
        >
          Motif purity
        </span>
      </div>
      <div
        aria-label={`Point size represents exact allele AC from ${minimumCalledAlleles} to ${maximumCalledAlleles}`}
        style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#566168', fontSize: 11 }}
      >
        <strong>Allele count (AC)</strong>
        <span
          aria-hidden="true"
          style={{
            boxSizing: 'border-box',
            width: purityPointDiameter(
              minimumCalledAlleles,
              minimumCalledAlleles,
              maximumCalledAlleles
            ),
            height: purityPointDiameter(
              minimumCalledAlleles,
              minimumCalledAlleles,
              maximumCalledAlleles
            ),
            borderRadius: '50%',
            background: LONG_READ_PRIMARY_PLOT_COLOR,
          }}
        />
        <span>{minimumCalledAlleles.toLocaleString()}</span>
        {minimumCalledAlleles !== maximumCalledAlleles && (
          <>
            <span
              aria-hidden="true"
              style={{
                boxSizing: 'border-box',
                width: purityPointDiameter(
                  maximumCalledAlleles,
                  minimumCalledAlleles,
                  maximumCalledAlleles
                ),
                height: purityPointDiameter(
                  maximumCalledAlleles,
                  minimumCalledAlleles,
                  maximumCalledAlleles
                ),
                borderRadius: '50%',
                background: LONG_READ_PRIMARY_PLOT_COLOR,
              }}
            />
            <span>{maximumCalledAlleles.toLocaleString()}</span>
          </>
        )}
      </div>
      {coincidentPoints && (
        <div style={{ color: '#566168', fontSize: 11 }}>
          Overlapping points are slightly separated.
        </div>
      )}
    </>
  )
}

export const WholeRecordAlleleLandscape = ({
  landscape,
  genotypeLandscape,
  alleles,
  motifs = [],
  selectedAllele,
  navigation,
  selectedAlleleDetail,
  sequencesAvailable = true,
  sequencesUnavailableReason,
}: {
  landscape: WholeRecordAlleleLandscapeData
  genotypeLandscape?: WholeRecordGenotypeLandscapeData
  alleles: LongReadTrAllele[]
  motifs?: string[]
  selectedAllele?: string
  navigation: AlleleNavigation
  selectedAlleleDetail?: React.ReactNode
  sequencesAvailable?: boolean
  sequencesUnavailableReason?: string | null
}) => {
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)
  const [selectedColorBy, rawSetSelectedColorBy] = useState<ColorBy | null>(null)
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleType>('linear')
  const filterOptions = useMemo(
    () => reconciledFilterOptions(landscape, genotypeLandscape),
    [genotypeLandscape, landscape]
  )
  useEffect(() => {
    if (selectedPopulation && !filterOptions.ancestries.includes(selectedPopulation)) {
      setSelectedPopulation(null)
    }
    if (selectedSex && !filterOptions.sexes.includes(selectedSex)) setSelectedSex(null)
  }, [filterOptions, selectedPopulation, selectedSex])
  const bins = landscape.bins || []
  const alleleById = useMemo(
    () => new Map(alleles.map((allele) => [allele.variant_id, allele])),
    [alleles]
  )
  const indexScope = `${landscape.exact_alt_count || alleles.length}:${
    alleles[0]?.variant_id || 'none'
  }`
  const [indexFilter, setIndexFilter] = useState<
    | { scope: string; kind: 'delta'; delta: number }
    | { scope: string; kind: 'genotype'; label: string; alleleIds: string[] }
    | null
  >(null)
  const indexHeading = useRef<HTMLHeadingElement>(null)
  const activeIndexFilter = indexFilter?.scope === indexScope ? indexFilter : null
  const selectedDelta = activeIndexFilter?.kind === 'delta' ? activeIndexFilter.delta : null
  const selectedBin = bins.find((bin) => bin.delta === selectedDelta)
  const selectedBinAlleles = selectedBin ? new Set(selectedBin.allele_ids) : null
  const selectedGenotypeAlleles =
    activeIndexFilter?.kind === 'genotype' ? new Set(activeIndexFilter.alleleIds) : null
  let indexedAlleles = alleles
  if (selectedBinAlleles) {
    indexedAlleles = alleles.filter((allele) => selectedBinAlleles.has(allele.variant_id))
  } else if (selectedGenotypeAlleles) {
    indexedAlleles = alleles.filter((allele) => selectedGenotypeAlleles.has(allele.variant_id))
  }
  const focusIndex = () => indexHeading.current?.focus({ preventScroll: true })
  const filterIndexToDelta = (delta: number) => {
    setIndexFilter({ scope: indexScope, kind: 'delta', delta })
    focusIndex()
  }
  const filterIndexToGenotype = (label: string, alleleIds: string[]) => {
    setIndexFilter({ scope: indexScope, kind: 'genotype', label, alleleIds })
    focusIndex()
  }
  const clearIndexFilter = () => {
    setIndexFilter(null)
    focusIndex()
  }

  if (landscape.status !== 'AVAILABLE') {
    return (
      <Panel aria-labelledby="lr-tr-allele-landscape-heading">
        <h2 id="lr-tr-allele-landscape-heading">Allelic landscape</h2>
        <PlotGrid $columns={genotypeLandscape ? 3 : 2} data-testid="whole-record-allele-plot-grid">
          <PlotCard>
            <h3>Total allele length change</h3>
            <p role="status">
              Allele length distribution unavailable: {unavailableReason(landscape.reason_code)}.
            </p>
          </PlotCard>
          <PlotCard>
            <h3>Length change × motif purity</h3>
            <p role="status">
              Motif purity unavailable: {unavailableReason(landscape.reason_code)}.
            </p>
          </PlotCard>
          {genotypeLandscape && (
            <WholeRecordGenotypeLandscape
              landscape={genotypeLandscape}
              navigation={navigation}
              selectedPopulation={selectedPopulation}
              selectedSex={selectedSex}
            />
          )}
        </PlotGrid>
        <ExactAlleleIndex
          alleles={alleles}
          motifs={motifs}
          selectedAllele={selectedAllele}
          navigation={navigation}
          selectedAlleleDetail={selectedAlleleDetail}
          sequencesAvailable={sequencesAvailable}
          sequencesUnavailableReason={sequencesUnavailableReason}
        />
      </Panel>
    )
  }

  const setSelectedColorBy = (colorBy: ColorBy | null) => {
    if (selectedScaleType === 'log' && !logScaleAllowed(colorBy)) setSelectedScaleType('linear')
    rawSetSelectedColorBy(colorBy)
  }
  const counts = bins.map((bin) => binCount(bin, selectedPopulation, selectedSex))
  const maxCount = Math.max(0, ...counts)
  const yTicks = histogramTicks(maxCount, selectedScaleType)
  let colorCategories: string[] = []
  if (selectedColorBy === 'sex') colorCategories = landscape.sexes || []
  if (selectedColorBy === 'population') colorCategories = landscape.ancestry_groups || []
  const segmentsForBin = (bin: AlleleBin) =>
    colorCategories.map((category) => ({
      category,
      color: stackColorFor(selectedColorBy, category),
      count: bin.stacks
        .filter((stack) =>
          selectedColorBy === 'sex'
            ? stack.sex === category && stack.ancestry_group === (selectedPopulation || null)
            : stack.ancestry_group === category && stack.sex === (selectedSex || null)
        )
        .reduce((sum, stack) => sum + stack.called_alleles, 0),
    }))
  const selectedDivision =
    selectedPopulation && selectedSex
      ? `${selectedPopulation}_${selectedSex}`
      : selectedPopulation || selectedSex
  const filteredPurityPoints = (landscape.purity_points || []).flatMap((point) => {
    if (!selectedDivision) return [point]
    const frequency = alleleById
      .get(point.allele_id)
      ?.freq.populations.find((item) => item.id === selectedDivision)
    return frequency && frequency.ac > 0 ? [{ ...point, called_alleles: frequency.ac }] : []
  })
  const clippedAt = scaleCap(selectedScaleType)
  const totalInView = counts.reduce((sum, count) => sum + count, 0)
  let histogramLayout = { barWidth: 14, gap: 2, height: 260 }
  if (bins.length <= 3) histogramLayout = { barWidth: 48, gap: 10, height: 190 }
  else if (bins.length <= 12) histogramLayout = { barWidth: 34, gap: 6, height: 220 }
  else if (bins.length <= 40) histogramLayout = { barWidth: 20, gap: 3, height: 240 }
  const histogramContentWidth =
    bins.length * histogramLayout.barWidth + Math.max(0, bins.length - 1) * histogramLayout.gap
  const histogramSidePadding = 20
  const histogramScrollableWidth = histogramContentWidth + histogramSidePadding * 2
  const deltaAxisTicks = histogramDeltaAxisTicks(
    bins.map((bin) => bin.delta),
    histogramLayout.barWidth,
    histogramLayout.gap,
    selectedBin?.delta ?? null
  )
  const deltaAxisHeight = 25 + Math.max(0, ...deltaAxisTicks.map((tick) => tick.lane)) * 15

  return (
    <Panel aria-labelledby="lr-tr-allele-landscape-heading">
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <h2 id="lr-tr-allele-landscape-heading" style={{ marginRight: 0 }}>
          Allelic landscape
        </h2>
        <TotalAlleleLengthHelp />
      </div>
      <ControlSection style={{ marginTop: '1em', flexWrap: 'wrap', gap: '10px 22px' }}>
        {landscape.stratified_available && (
          <>
            <div
              role="group"
              aria-label="Shared ancestry and sex filters"
              style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
            >
              <ControlGroupLabel>Filter all three plots:</ControlGroupLabel>
              <ShortTandemRepeatPopulationOptions
                id="lr-tr-landscape"
                populations={filterOptions.ancestries}
                selectedPopulation={selectedPopulation}
                selectedSex={selectedSex}
                setSelectedPopulation={setSelectedPopulation}
                setSelectedSex={setSelectedSex}
                ancestryGroupName={longReadAncestryGroupDisplayName}
              />
            </div>
            <div
              role="group"
              aria-label="Allele plot display controls"
              style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
            >
              <ControlGroupLabel>Allele plots only:</ControlGroupLabel>
              <ShortTandemRepeatColorBySelect
                id="lr-tr-whole-record"
                selectedColorBy={selectedColorBy}
                setSelectedColorBy={setSelectedColorBy}
                setSelectedScaleType={setSelectedScaleType}
                allowedColorBys={['sex', 'population']}
              />
              <ShortTandemRepeatScaleSelect
                id="lr-tr-whole-record"
                selectedScaleType={selectedScaleType}
                setSelectedScaleType={setSelectedScaleType}
                selectedColorBy={selectedColorBy}
              />
            </div>
          </>
        )}
      </ControlSection>
      {!landscape.stratified_available && (
        <p role="status">
          Stratified controls are unavailable:{' '}
          {unavailableReason(landscape.stratified_unavailable_reason)}.
        </p>
      )}
      <p aria-live="polite">
        <strong>{totalInView.toLocaleString()} called non-reference allele copies</strong> in the
        current filters.
      </p>
      {selectedColorBy && (
        <p aria-label="Stack color legend">
          <strong>Stack colors:</strong>{' '}
          {colorCategories.map((category, index) => {
            let label = category
            if (selectedColorBy === 'population') label = longReadAncestryGroupDisplayName(category)
            else if (category === 'unknown') label = 'Unknown'
            const color = stackColorFor(selectedColorBy, category)
            return (
              <React.Fragment key={category}>
                {index > 0 && ', '}
                <span aria-label={`${label} stack color`} data-stack-color={color}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      marginRight: 3,
                      borderRadius: 2,
                      background: color,
                    }}
                  />
                  {label}
                </span>
              </React.Fragment>
            )
          })}
        </p>
      )}
      {clippedAt && counts.some((count) => count > clippedAt) && (
        <p role="status">
          Bars above {clippedAt.toLocaleString()} copies are clipped; exact counts remain in labels
          and tables.
        </p>
      )}
      <PlotGrid $columns={genotypeLandscape ? 3 : 2} data-testid="whole-record-allele-plot-grid">
        <PlotCard>
          <h3>Total allele length change</h3>
          <HistogramChart data-bin-count={bins.length} data-bar-width={histogramLayout.barWidth}>
            <HistogramYScale aria-hidden="true" $height={histogramLayout.height}>
              <AxisTitle>Called allele copies</AxisTitle>
              {yTicks.map((tick) => (
                <AxisTick
                  key={tick}
                  style={{
                    bottom: `${histogramHeightPercent(tick, maxCount, selectedScaleType)}%`,
                  }}
                >
                  {tick.toLocaleString()}
                </AxisTick>
              ))}
            </HistogramYScale>
            <HistogramScroller data-testid="whole-record-delta-histogram-scroller">
              <HistogramScrollContent style={{ width: histogramScrollableWidth }}>
                <Histogram
                  aria-label="Total allele length change histogram"
                  data-testid="whole-record-delta-histogram"
                  $height={histogramLayout.height}
                  $gap={histogramLayout.gap}
                >
                  {bins.map((bin, index) => {
                    const count = counts[index]
                    const height = histogramHeightPercent(count, maxCount, selectedScaleType)
                    return (
                      <BarButton
                        key={bin.delta}
                        type="button"
                        $height={height}
                        $hasValue={count > 0}
                        $width={histogramLayout.barWidth}
                        data-height-percent={height.toFixed(3)}
                        data-bar-width={histogramLayout.barWidth}
                        $selected={bin.delta === selectedBin?.delta}
                        aria-pressed={bin.delta === selectedBin?.delta}
                        aria-label={`${signed(
                          bin.delta
                        )} bp, ${count} called allele copies in this view, ${
                          bin.exact_alt_count
                        } exact ALTs globally`}
                        title={`${signed(bin.delta)} bp · ${count.toLocaleString()} copies · ${
                          bin.exact_alt_count
                        } exact ALTs`}
                        onClick={() => filterIndexToDelta(bin.delta)}
                      >
                        {selectedColorBy && count > 0 && (
                          <BarSegments aria-hidden="true">
                            {segmentsForBin(bin).map((segment) => (
                              <span
                                key={segment.category}
                                style={{
                                  flexGrow: segment.count,
                                  background: segment.color,
                                  display: segment.count ? 'block' : 'none',
                                }}
                              />
                            ))}
                          </BarSegments>
                        )}
                        <BarExactCount title={`${bin.exact_alt_count} exact ALTs`}>
                          {bin.exact_alt_count}
                        </BarExactCount>
                      </BarButton>
                    )
                  })}
                </Histogram>
                <HistogramXAxis
                  role="group"
                  aria-label={`Total allele length change axis in base pairs; ticks ${deltaAxisTicks
                    .map((tick) => `${signed(tick.delta)} bp`)
                    .join(', ')}`}
                  data-testid="whole-record-delta-axis"
                  $height={deltaAxisHeight}
                  $width={histogramScrollableWidth}
                >
                  {deltaAxisTicks.map((tick) => (
                    <HistogramXTick
                      key={tick.delta}
                      aria-label={`${signed(tick.delta)} bp tick`}
                      data-delta={tick.delta}
                      data-testid="whole-record-delta-axis-tick"
                      $lane={tick.lane}
                      $left={tick.left + histogramSidePadding}
                    >
                      {signed(tick.delta)}
                    </HistogramXTick>
                  ))}
                </HistogramXAxis>
              </HistogramScrollContent>
            </HistogramScroller>
          </HistogramChart>
          <div style={{ color: '#566168', fontSize: 11, textAlign: 'center' }}>
            Total allele length change (ALT − REF, bp) · numbers above bars are exact alleles
          </div>
        </PlotCard>
        <PlotCard>
          <h3>Length change × motif purity</h3>
          {landscape.purity_available ? (
            <PurityScatter
              points={filteredPurityPoints}
              selectedAllele={selectedAllele}
              navigation={navigation}
            />
          ) : (
            <p role="status">
              Purity unavailable: {unavailableReason(landscape.purity_unavailable_reason)}.
            </p>
          )}
        </PlotCard>
        {genotypeLandscape && (
          <WholeRecordGenotypeLandscape
            landscape={genotypeLandscape}
            navigation={navigation}
            selectedPopulation={selectedPopulation}
            selectedSex={selectedSex}
            onSelectCell={filterIndexToGenotype}
          />
        )}
      </PlotGrid>
      <ExactAlleleIndex
        alleles={indexedAlleles}
        totalExactAlts={landscape.exact_alt_count || alleles.length}
        filteredDelta={selectedBin?.delta}
        filterDescription={
          activeIndexFilter?.kind === 'genotype' ? activeIndexFilter.label : undefined
        }
        motifs={motifs}
        selectedAllele={selectedAllele}
        navigation={navigation}
        selectedAlleleDetail={selectedAlleleDetail}
        selectedDivision={selectedDivision}
        sequencesAvailable={sequencesAvailable}
        sequencesUnavailableReason={sequencesUnavailableReason}
        headingRef={indexHeading}
        onClearFilter={clearIndexFilter}
      />
    </Panel>
  )
}

const HeatmapFigure = styled.figure`
  margin: 0;
`

const HeatmapSvg = styled.svg`
  display: block;
  width: 100%;
  max-width: 520px;
  height: auto;
  min-height: 300px;
  margin: 0 auto;

  [role='gridcell']:focus-visible {
    outline: none;
    stroke: #111;
    stroke-width: 4px;
  }
`

const IntensityKey = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 0.5em;
  color: #566168;
  font-size: 11px;
`

const filteredPairs = (pairs: GenotypePair[], population: PopulationId | null, sex: Sex | null) =>
  pairs.filter(
    (pair) => (!population || pair.ancestry_group === population) && (!sex || pair.sex === sex)
  )

type ExactGenotypePair = Pick<
  GenotypePair,
  'shorter_allele_id' | 'longer_allele_id' | 'people' | 'phased_people' | 'unphased_people'
>

export const aggregateGenotypePairs = (pairs: GenotypePair[]): ExactGenotypePair[] => {
  const aggregated = new Map<string, ExactGenotypePair>()
  pairs.forEach((pair) => {
    const alleleIds = [pair.shorter_allele_id, pair.longer_allele_id].sort()
    const key = alleleIds.join('\u0000')
    const existing = aggregated.get(key)
    if (existing) {
      existing.people += pair.people
      existing.phased_people += pair.phased_people
      existing.unphased_people += pair.unphased_people
    } else {
      aggregated.set(key, {
        shorter_allele_id: alleleIds[0],
        longer_allele_id: alleleIds[1],
        people: pair.people,
        phased_people: pair.phased_people,
        unphased_people: pair.unphased_people,
      })
    }
  })
  return [...aggregated.values()].sort(
    (left, right) =>
      right.people - left.people ||
      `${left.shorter_allele_id}/${left.longer_allele_id}`.localeCompare(
        `${right.shorter_allele_id}/${right.longer_allele_id}`
      )
  )
}

const pairName = (id: string, referenceId: string | null) =>
  id === referenceId ? 'Reference (Δ 0)' : alleleLabel(id)

export const WholeRecordGenotypeLandscape = ({
  landscape,
  navigation,
  selectedPopulation,
  selectedSex,
  onSelectCell,
}: {
  landscape: WholeRecordGenotypeLandscapeData
  navigation: AlleleNavigation
  selectedPopulation: PopulationId | null
  selectedSex: Sex | null
  onSelectCell?: (label: string, alleleIds: string[]) => void
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  if (landscape.status !== 'AVAILABLE') {
    return (
      <PlotCard data-testid="genotype-length-card">
        <h3>Genotype length distribution</h3>
        <p role="status">
          Genotype landscape unavailable: {unavailableReason(landscape.reason_code)}.
        </p>
      </PlotCard>
    )
  }

  const sourceCells = landscape.cells || []
  const cells = sourceCells
    .map((cell) => ({
      ...cell,
      selectedPairs: aggregateGenotypePairs(
        filteredPairs(cell.pairs, selectedPopulation, selectedSex)
      ),
    }))
    .map((cell) => ({
      ...cell,
      selectedPeople: cell.selectedPairs.reduce((sum, pair) => sum + pair.people, 0),
    }))
    .filter((cell) => cell.selectedPeople > 0)
  const values = [
    ...new Set([0, ...sourceCells.flatMap((cell) => [cell.shorter_delta, cell.longer_delta])]),
  ].sort((a, b) => a - b)
  const maxPeople = Math.max(1, ...cells.map((cell) => cell.selectedPeople))
  const keyFor = (cell: GenotypeCell) => `${cell.shorter_delta}/${cell.longer_delta}`
  const selectedCell = cells.find((cell) => keyFor(cell) === selectedKey) || cells[0]
  const totalPeople = cells.reduce((sum, cell) => sum + cell.selectedPeople, 0)
  const byCoordinate = new Map(cells.map((cell) => [keyFor(cell), cell]))
  const heatmapWidth = 720
  const heatmapHeight = 650
  const heatmapLeft = 78
  const heatmapTop = 18
  const heatmapBottom = 86
  const heatmapRight = 18
  const plotSize = Math.min(
    heatmapWidth - heatmapLeft - heatmapRight,
    heatmapHeight - heatmapTop - heatmapBottom
  )
  const band = plotSize / Math.max(1, values.length)
  const valueIndex = new Map(values.map((value, index) => [value, index]))
  const xFor = (value: number) => heatmapLeft + (valueIndex.get(value) || 0) * band
  const yFor = (value: number) =>
    heatmapTop + (values.length - 1 - (valueIndex.get(value) || 0)) * band
  const axisStep = Math.max(1, Math.ceil(values.length / 12))
  const axisValues = values.filter(
    (value, index) =>
      index % axisStep === 0 ||
      index === values.length - 1 ||
      value === 0 ||
      value === selectedCell?.shorter_delta ||
      value === selectedCell?.longer_delta
  )
  const selectCell = (cell: (typeof cells)[number], key: string) => {
    setSelectedKey(key)
    const alleleIds = [
      ...new Set(
        cell.selectedPairs.flatMap((pair) => [pair.shorter_allele_id, pair.longer_allele_id])
      ),
    ].filter((alleleId) => alleleId !== landscape.reference_allele_id)
    onSelectCell?.(
      `selected genotype cell (${signed(cell.longer_delta)} bp × ${signed(cell.shorter_delta)} bp)`,
      alleleIds
    )
  }

  return (
    <>
      <PlotCard data-testid="genotype-length-card">
        <h3>Genotype length distribution</h3>
        <p aria-live="polite">
          <strong>{totalPeople.toLocaleString()} people</strong> with complete diploid genotypes in
          this view.
        </p>
        <p style={{ color: '#566168', fontSize: 11 }}>
          Select a square to filter the exact allele table. Reference (0 bp) remains distinct from a
          0 bp exact ALT.
        </p>
        <HeatmapFigure>
          <HeatmapSvg
            viewBox={`0 0 ${heatmapWidth} ${heatmapHeight}`}
            role="grid"
            aria-label="Genotype length-change heatmap"
          >
            <title>Genotype distribution by longer and shorter total allele length change</title>
            {valueIndex.has(0) && (
              <>
                <line
                  x1={xFor(0)}
                  y1={heatmapTop}
                  x2={xFor(0)}
                  y2={heatmapTop + plotSize}
                  stroke="#89939a"
                  strokeDasharray="4 4"
                />
                <line
                  x1={heatmapLeft}
                  y1={yFor(0) + band}
                  x2={heatmapLeft + plotSize}
                  y2={yFor(0) + band}
                  stroke="#89939a"
                  strokeDasharray="4 4"
                />
              </>
            )}
            {[...values].reverse().map((shorter) => (
              <g key={shorter} role="row" aria-label={`${signed(shorter)} bp shorter allele row`}>
                {values.map((longer) => {
                  const cell = byCoordinate.get(`${shorter}/${longer}`)
                  const key = `${shorter}/${longer}`
                  const selected = Boolean(cell && selectedCell && key === keyFor(selectedCell))
                  const intensity = cell
                    ? Math.log(cell.selectedPeople + 1) / Math.log(maxPeople + 1)
                    : 0
                  return (
                    <React.Fragment key={key}>
                      <rect
                        role="gridcell"
                        tabIndex={cell ? 0 : undefined}
                        aria-disabled={!cell || undefined}
                        aria-selected={selected}
                        aria-label={`${signed(longer)} bp longer, ${signed(shorter)} bp shorter: ${
                          cell?.selectedPeople || 0
                        } people`}
                        x={xFor(longer) + 1}
                        y={yFor(shorter) + 1}
                        width={Math.max(1, band - 2)}
                        height={Math.max(1, band - 2)}
                        rx={Math.min(2, band / 8)}
                        fill={cell ? LONG_READ_PRIMARY_PLOT_COLOR : '#f5f7f8'}
                        fillOpacity={cell ? 0.15 + 0.85 * intensity : 1}
                        stroke={selected ? '#e9781c' : '#fff'}
                        strokeWidth={selected ? 4 : 1}
                        cursor={cell ? 'pointer' : 'default'}
                        onClick={() => cell && selectCell(cell, key)}
                        onKeyDown={(event) => {
                          if (cell && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault()
                            selectCell(cell, key)
                          }
                        }}
                      >
                        <title>
                          {signed(longer)} bp × {signed(shorter)} bp: {cell?.selectedPeople || 0}{' '}
                          people
                        </title>
                      </rect>
                      {cell && band >= 24 && (
                        <text
                          x={xFor(longer) + band / 2}
                          y={yFor(shorter) + band / 2 + 4}
                          fill={intensity > 0.78 ? '#fff' : '#111'}
                          fontSize={Math.min(11, band * 0.34)}
                          textAnchor="middle"
                          pointerEvents="none"
                          aria-hidden="true"
                        >
                          {cell.selectedPeople}
                        </text>
                      )}
                    </React.Fragment>
                  )
                })}
              </g>
            ))}
            {axisValues.map((value) => (
              <React.Fragment key={value}>
                <text
                  x={xFor(value) + band / 2}
                  y={heatmapTop + plotSize + 15}
                  fill="#566168"
                  fontSize={10}
                  textAnchor="end"
                  transform={`rotate(-48 ${xFor(value) + band / 2} ${heatmapTop + plotSize + 15})`}
                >
                  {signed(value)}
                </text>
                <text
                  x={heatmapLeft - 7}
                  y={yFor(value) + band / 2 + 3}
                  fill="#566168"
                  fontSize={10}
                  textAnchor="end"
                >
                  {signed(value)}
                </text>
              </React.Fragment>
            ))}
            <line
              x1={heatmapLeft}
              y1={heatmapTop + plotSize}
              x2={heatmapLeft + plotSize}
              y2={heatmapTop + plotSize}
              stroke="#89939a"
            />
            <line
              x1={heatmapLeft}
              y1={heatmapTop}
              x2={heatmapLeft}
              y2={heatmapTop + plotSize}
              stroke="#89939a"
            />
            <text
              x={heatmapLeft + plotSize / 2}
              y={heatmapHeight - 8}
              fill="#566168"
              fontSize={11}
              textAnchor="middle"
            >
              Longer allele length change (bp)
            </text>
            <text
              x={15}
              y={heatmapTop + plotSize / 2}
              fill="#566168"
              fontSize={11}
              textAnchor="middle"
              transform={`rotate(-90 15 ${heatmapTop + plotSize / 2})`}
            >
              Shorter allele length change (bp)
            </text>
          </HeatmapSvg>
          <IntensityKey aria-label="Logarithmic people intensity legend">
            <span>Fewer people</span>
            <span
              aria-hidden="true"
              style={{
                width: 110,
                height: 10,
                border: '1px solid #bfc8ce',
                background: `linear-gradient(90deg, rgba(156,39,176,.15), ${LONG_READ_PRIMARY_PLOT_COLOR})`,
              }}
            />
            <span>More people (log intensity)</span>
          </IntensityKey>
        </HeatmapFigure>
      </PlotCard>
      <GenotypePairDetail aria-live="polite" data-testid="genotype-pair-detail">
        {selectedCell ? (
          <details>
            <summary>
              <strong>
                {signed(selectedCell.longer_delta)} bp × {signed(selectedCell.shorter_delta)} bp
              </strong>{' '}
              — {selectedCell.selectedPeople.toLocaleString()}{' '}
              {selectedCell.selectedPeople === 1 ? 'person' : 'people'} across{' '}
              {selectedCell.selectedPairs.length.toLocaleString()} exact allele{' '}
              {selectedCell.selectedPairs.length === 1 ? 'pair' : 'pairs'}
            </summary>
            <ScrollTable>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Exact pair</th>
                    <th scope="col">People</th>
                    <th scope="col">Phased</th>
                    <th scope="col">Unphased</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCell.selectedPairs.map((pair) => (
                    <tr key={`${pair.shorter_allele_id}/${pair.longer_allele_id}`}>
                      <td>
                        {pair.shorter_allele_id === landscape.reference_allele_id ? (
                          pairName(pair.shorter_allele_id, landscape.reference_allele_id)
                        ) : (
                          <SelectionLink alleleId={pair.shorter_allele_id} navigation={navigation}>
                            {pairName(pair.shorter_allele_id, landscape.reference_allele_id)}
                          </SelectionLink>
                        )}
                        {' × '}
                        {pair.longer_allele_id === landscape.reference_allele_id ? (
                          pairName(pair.longer_allele_id, landscape.reference_allele_id)
                        ) : (
                          <SelectionLink alleleId={pair.longer_allele_id} navigation={navigation}>
                            {pairName(pair.longer_allele_id, landscape.reference_allele_id)}
                          </SelectionLink>
                        )}
                      </td>
                      <td>{pair.people.toLocaleString()}</td>
                      <td>{pair.phased_people.toLocaleString()}</td>
                      <td>{pair.unphased_people.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollTable>
          </details>
        ) : (
          <p>No complete diploid genotypes match these filters.</p>
        )}
      </GenotypePairDetail>
    </>
  )
}

const IndexSection = styled.section`
  margin: 1.25em 0;
`

const AlleleBrowserGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 100%);
  align-items: start;
  gap: 1em;
`

const IndexPane = styled.div`
  overflow-x: hidden;
  min-width: 0;
  border: 1px solid #d8dee2;
  border-radius: 4px;
`

const SelectedAllelePane = styled.div`
  min-width: 0;
`

const EmptySelectedAllele = styled.p`
  min-height: 120px;
  padding: 1em;
  border: 1px solid #d8dee2;
  border-radius: 4px;
  margin: 0;
  background: #fbfcfd;
  color: #566168;
`

const indexColumns = 'minmax(280px, 1.7fr) minmax(150px, 2fr) 76px 72px 54px 80px 86px'
const narrowIndexColumns = 'minmax(200px, 1fr) 72px 86px'
const compactIndexColumns = 'minmax(170px, 1fr) 68px 78px'

const ExactAlleleIdentity = styled.span`
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 0.45em;
  line-height: 1.15;

  strong {
    flex: 0 0 auto;
  }

  code {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 11px;
    white-space: normal;
  }
`

const IndexTitle = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
  margin-bottom: 0.65em;

  h3 {
    margin: 0;
  }
`

const ClearIndexFilter = styled.button`
  flex: 0 0 auto;
  padding: 0.35em 0.75em;
  border: 1px solid #397daf;
  border-radius: 3px;
  background: #fff;
  color: #185b8d;
  cursor: pointer;
  font-weight: bold;

  &:hover {
    background: #f1f8fc;
  }

  &:focus-visible {
    outline: 3px solid #111;
    outline-offset: 2px;
  }
`

const NumericIndexCell = styled.span`
  min-width: 0;
  text-align: right;
`

const SortableIndexHeader = styled.span<{ $numeric?: boolean }>`
  min-width: 0;
  text-align: ${(props) => (props.$numeric ? 'right' : 'left')};

  button {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    text-align: inherit;
  }

  button:hover {
    color: #185b8d;
    text-decoration: underline;
  }

  button:focus-visible {
    outline: 3px solid #111;
    outline-offset: 2px;
  }
`

const IndexHeader = styled.div`
  display: grid;
  grid-template-columns: ${indexColumns};
  align-items: center;
  column-gap: 0.75em;
  box-sizing: border-box;
  width: 100%;
  height: 36px;
  padding: 0 0.6em;
  border-bottom: 1px solid #bbb;
  background: #f7f9fa;
  font-weight: bold;

  @media (max-width: 900px) {
    grid-template-columns: ${narrowIndexColumns};

    .lr-tr-index-preview,
    .lr-tr-index-purity,
    .lr-tr-index-ac,
    .lr-tr-index-af {
      display: none;
    }
  }

  @media (max-width: 420px) {
    grid-template-columns: ${compactIndexColumns};
  }
`

const IndexRow = styled.div<{ selected: boolean }>`
  display: grid;
  grid-template-columns: ${indexColumns};
  align-items: center;
  column-gap: 0.75em;
  box-sizing: border-box;
  width: 100%;
  height: 52px;
  padding: 0 0.6em;
  border-bottom: 1px solid #ddd;
  background: ${(props) => (props.selected ? '#fff3e8' : '#fff')};
  outline: ${(props) => (props.selected ? '2px solid #a65310' : 'none')};
  outline-offset: -2px;

  > span {
    min-width: 0;
  }

  @media (max-width: 900px) {
    grid-template-columns: ${narrowIndexColumns};

    .lr-tr-index-preview,
    .lr-tr-index-purity,
    .lr-tr-index-ac,
    .lr-tr-index-af {
      display: none;
    }
  }

  @media (max-width: 420px) {
    grid-template-columns: ${compactIndexColumns};
  }
`

const MOTIF_UNIT_SEPARATOR = '#36454f'

const MotifPreview = styled.svg`
  display: block;
  width: 100%;
  max-width: 420px;
  height: 18px;
  border: 1px solid #d8dee2;
  background: #fff;
`

const SelectedMotifStructure = styled.div`
  [title^='Decomposed with'] {
    display: none;
  }

  [aria-label='Selected ALT motif structure grid'] svg rect[stroke='white'] {
    stroke: ${MOTIF_UNIT_SEPARATOR} !important;
    stroke-width: 1px !important;
    vector-effect: non-scaling-stroke;
    shape-rendering: crispEdges;
  }
`

const ExactAlleleMotifPreview = ({
  allele,
  motifs,
}: {
  allele: LongReadTrAllele
  motifs: string[]
}) => {
  if (!allele.ref || !allele.alt) {
    return (
      <span aria-label={`${alleleLabel(allele.variant_id)} motif preview unavailable`}>
        Unavailable
      </span>
    )
  }
  const decomposition = decomposeExactTrAlt({ ref: allele.ref, alt: allele.alt, motifs })
  if (decomposition.status !== 'available') {
    return (
      <span aria-label={`${alleleLabel(allele.variant_id)} motif preview unavailable`}>
        Unavailable
      </span>
    )
  }
  const totalBases = Math.max(1, decomposition.structure.sequence.length)
  let offset = 0
  return (
    <MotifPreview
      role="img"
      aria-label={`${alleleLabel(allele.variant_id)} motif structure preview`}
      viewBox={`0 0 ${totalBases} 18`}
      preserveAspectRatio="none"
    >
      {decomposition.structure.tokens.map((token, tokenIndex) => {
        const start = offset
        offset += token.sequence.length
        return (
          <rect
            // Sequence order is the stable identity for repeated motif tokens.
            // eslint-disable-next-line react/no-array-index-key
            key={tokenIndex}
            x={start}
            y={0}
            width={Math.max(1, token.sequence.length)}
            height={18}
            fill={token.type === 'motif' ? motifColor(motifs[token.motifIndex], motifs) : '#737b80'}
            data-motif-unit="true"
            stroke={MOTIF_UNIT_SEPARATOR}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            shapeRendering="crispEdges"
          />
        )
      })}
    </MotifPreview>
  )
}

type ExactAlleleSortKey = 'alt' | 'length' | 'purity' | 'ac' | 'af'
type ExactAlleleSortDirection = 'ascending' | 'descending'

type ExactAlleleIndexRowData = {
  alleles: LongReadTrAllele[]
  motifs: string[]
  selectedAllele?: string
  selectedDivision?: string | null
  navigation: AlleleNavigation
}

const exactAlleleFrequency = (allele: LongReadTrAllele, selectedDivision?: string | null) =>
  selectedDivision
    ? allele.freq.populations.find((item) => item.id === selectedDivision)
    : allele.freq.all

const ExactAlleleIndexRow = ({
  index,
  style,
  data,
}: {
  index: number
  style: React.CSSProperties
  data: ExactAlleleIndexRowData
}) => {
  const allele = data.alleles[index]
  const altLabel = alleleLabel(allele.variant_id)
  const length = allele.length == null ? '—' : `${signed(allele.length)} bp`
  const purity = allele.motif_purity == null ? '—' : allele.motif_purity.toFixed(4)
  const frequency = exactAlleleFrequency(allele, data.selectedDivision)
  const ac = frequency ? Math.round(frequency.ac).toLocaleString() : '—'
  const af = frequency ? frequency.af.toPrecision(4) : '—'
  const selected = allele.variant_id === data.selectedAllele
  return (
    <IndexRow
      style={style}
      selected={selected}
      role="row"
      aria-label={`${altLabel}; ${allele.variant_id}; total allele length change ${length}; purity ${purity}; AC ${ac}; AF ${af}`}
      aria-selected={selected}
      aria-rowindex={index + 2}
      title={allele.variant_id}
    >
      <ExactAlleleIdentity role="cell">
        <strong>{altLabel}</strong>
        <code>{allele.variant_id}</code>
      </ExactAlleleIdentity>
      <span className="lr-tr-index-preview" role="cell">
        <ExactAlleleMotifPreview allele={allele} motifs={data.motifs} />
      </span>
      <NumericIndexCell role="cell">{length}</NumericIndexCell>
      <NumericIndexCell className="lr-tr-index-purity" role="cell">
        {purity}
      </NumericIndexCell>
      <NumericIndexCell className="lr-tr-index-ac" role="cell">
        {ac}
      </NumericIndexCell>
      <NumericIndexCell className="lr-tr-index-af" role="cell">
        {af}
      </NumericIndexCell>
      <span role="cell">
        <SelectAlleleControl
          alleleId={allele.variant_id}
          navigation={data.navigation}
          selected={selected}
          aria-label={`${selected ? 'Selected' : 'Select'} ${altLabel}`}
        >
          {selected ? 'Selected' : 'Select'}
        </SelectAlleleControl>
      </span>
    </IndexRow>
  )
}

export const ExactAlleleIndex = ({
  alleles,
  totalExactAlts = alleles.length,
  filteredDelta,
  filterDescription,
  selectedAllele,
  motifs,
  navigation,
  selectedAlleleDetail,
  selectedDivision,
  sequencesAvailable = true,
  sequencesUnavailableReason,
  headingRef,
  onClearFilter,
}: {
  alleles: LongReadTrAllele[]
  totalExactAlts?: number
  filteredDelta?: number
  filterDescription?: string
  motifs: string[]
  selectedAllele?: string
  navigation: AlleleNavigation
  selectedAlleleDetail?: React.ReactNode
  selectedDivision?: string | null
  sequencesAvailable?: boolean
  sequencesUnavailableReason?: string | null
  headingRef?: RefObject<HTMLHeadingElement>
  onClearFilter?: () => void
}) => {
  const [sortKey, setSortKey] = useState<ExactAlleleSortKey>('alt')
  const [sortDirection, setSortDirection] = useState<ExactAlleleSortDirection>('ascending')
  const sortedAlleles = useMemo(() => {
    const sortValue = (allele: LongReadTrAllele): number | null | undefined => {
      if (sortKey === 'alt') return allele.alt_index
      if (sortKey === 'length') return allele.length
      if (sortKey === 'purity') return allele.motif_purity
      const frequency = exactAlleleFrequency(allele, selectedDivision)
      return sortKey === 'ac' ? frequency?.ac : frequency?.af
    }
    return [...alleles].sort((left, right) => {
      const leftValue = sortValue(left)
      const rightValue = sortValue(right)
      if (leftValue == null && rightValue != null) return 1
      if (leftValue != null && rightValue == null) return -1
      const comparison = (leftValue || 0) - (rightValue || 0)
      if (comparison !== 0) return sortDirection === 'ascending' ? comparison : -comparison
      return left.alt_index - right.alt_index
    })
  }, [alleles, selectedDivision, sortDirection, sortKey])
  const changeSort = (nextKey: ExactAlleleSortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'ascending' ? 'descending' : 'ascending'))
      return
    }
    setSortKey(nextKey)
    setSortDirection(nextKey === 'alt' ? 'ascending' : 'descending')
  }
  const sortHeader = (
    key: ExactAlleleSortKey,
    label: string,
    className?: string,
    numeric = false
  ) => {
    const active = key === sortKey
    return (
      <SortableIndexHeader
        className={className}
        $numeric={numeric}
        role="columnheader"
        aria-sort={active ? sortDirection : 'none'}
      >
        <button type="button" onClick={() => changeSort(key)}>
          {label}{' '}
          {active && <span aria-hidden="true">{sortDirection === 'ascending' ? '↑' : '↓'}</span>}
        </button>
      </SortableIndexHeader>
    )
  }
  const itemData = {
    alleles: sortedAlleles,
    motifs,
    selectedAllele,
    selectedDivision,
    navigation,
  }
  const hasMissingIndexSequence = alleles.some((allele) => !allele.ref || !allele.alt)
  const previewUnavailableMessage =
    hasMissingIndexSequence && !sequencesAvailable
      ? `Motif previews are unavailable because ${unavailableReason(sequencesUnavailableReason)}.`
      : null
  let heading = `All exact ALTs (${totalExactAlts.toLocaleString()})`
  if (filterDescription) {
    heading = `${alleles.length.toLocaleString()} of ${totalExactAlts.toLocaleString()} exact ALTs in ${filterDescription}`
  } else if (filteredDelta != null) {
    heading = `${alleles.length.toLocaleString()} of ${totalExactAlts.toLocaleString()} exact ALTs at ${signed(
      filteredDelta
    )} bp`
  }
  return (
    <IndexSection aria-labelledby="lr-tr-index-heading">
      <IndexTitle aria-live="polite">
        <h3 id="lr-tr-index-heading" ref={headingRef} tabIndex={-1}>
          {heading}
        </h3>
        {(filteredDelta != null || filterDescription) && (
          <ClearIndexFilter type="button" onClick={onClearFilter}>
            Show all exact ALTs
          </ClearIndexFilter>
        )}
      </IndexTitle>
      {previewUnavailableMessage && <p role="status">{previewUnavailableMessage}</p>}
      <AlleleBrowserGrid data-testid="lr-tr-exact-allele-browser">
        <IndexPane
          role="table"
          aria-label="Exact alternate allele index"
          aria-rowcount={alleles.length + 1}
        >
          <IndexHeader role="row" aria-rowindex={1}>
            {sortHeader('alt', 'Exact allele')}
            <span className="lr-tr-index-preview" role="columnheader">
              Motif preview
            </span>
            {sortHeader('length', 'Length change', undefined, true)}
            {sortHeader('purity', 'Purity', 'lr-tr-index-purity', true)}
            {sortHeader('ac', 'AC', 'lr-tr-index-ac', true)}
            {sortHeader('af', 'AF', 'lr-tr-index-af', true)}
            <span role="columnheader">Select</span>
          </IndexHeader>
          <FixedSizeList
            className="lr-tr-exact-index-scroll"
            height={Math.min(312, Math.max(104, alleles.length * 52))}
            itemCount={alleles.length}
            itemData={itemData}
            itemKey={(index: number) => sortedAlleles[index].variant_id}
            itemSize={52}
            overscanCount={10}
            width="100%"
          >
            {ExactAlleleIndexRow}
          </FixedSizeList>
        </IndexPane>
        <SelectedAllelePane aria-live="polite">
          {selectedAlleleDetail || (
            <EmptySelectedAllele>
              {selectedAllele
                ? 'Details for the selected allele are unavailable.'
                : 'Select an exact ALT to view its sequence and details.'}
            </EmptySelectedAllele>
          )}
        </SelectedAllelePane>
      </AlleleBrowserGrid>
    </IndexSection>
  )
}

const Sequence = styled.pre`
  overflow: auto;
  max-height: 220px;
  padding: 0.9em;
  border: 1px solid #d8dee2;
  border-radius: 3px;
  background: #fff;
  white-space: pre-wrap;
  word-break: break-all;
`

const SelectedDetail = styled.article`
  padding: 1em;
  border: 1px solid #d8dee2;
  border-radius: 4px;
  margin: 0;
  background: #fffdf9;
`

const SelectedDetailGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 100%);
  align-items: start;
  gap: 1.2em;

  h4 {
    margin-top: 0;
  }
`

const sequenceAnalysisMethod = (ref: string, alt: string, motifs: string[]) => {
  const decomposition = decomposeExactTrAlt({ ref, alt, motifs })
  if (decomposition.status !== 'available') return 'unavailable'
  return decomposition.structure.algorithm === 'dp'
    ? 'dynamic-programming sequence alignment'
    : 'regular-expression sequence matching'
}

export const SelectedExactAlleleDetail = React.forwardRef<
  HTMLElement,
  {
    allele: LongReadTrSelectedAllele
    motifs: string[]
  }
>(({ allele, motifs }, ref) => (
  <SelectedDetail
    ref={ref}
    tabIndex={-1}
    aria-labelledby="lr-tr-selected-detail-heading"
    data-testid="lr-tr-selected-detail"
  >
    <h3 id="lr-tr-selected-detail-heading">
      <code>{allele.variant_id}</code> allele details
    </h3>
    <SelectedDetailGrid>
      <div>
        <SelectedMotifStructure data-testid="selected-motif-structure-boundaries">
          <ExactTrAltMotifStructure
            refAllele={allele.ref}
            altAllele={allele.alt}
            motifs={motifs}
            showHighlightedExactSequence
            showHeading={false}
          />
        </SelectedMotifStructure>
        <details>
          <summary>Sequence analysis details</summary>
          <p>
            Browser motif analysis used {sequenceAnalysisMethod(allele.ref, allele.alt, motifs)}.
            Motif units were aligned from sequence and do not represent the source component
            coordinates. Source note: <code>{allele.decomposition_reason}</code>.
          </p>
        </details>
        <details>
          <summary>REF sequence ({allele.ref.length.toLocaleString()} bp)</summary>
          <Sequence>{allele.ref}</Sequence>
        </details>
      </div>
      <ScrollTable>
        <table>
          <tbody>
            <tr>
              <th scope="row">Source allele</th>
              <td>
                <code>{allele.source_variant_id}</code> / ALT {allele.alt_index} of{' '}
                {allele.alt_count}
              </td>
            </tr>
            <tr>
              <th scope="row">Total allele length change</th>
              <td>{allele.length == null ? '—' : `${signed(allele.length)} bp`}</td>
            </tr>
            <tr>
              <th scope="row">Exact frequency</th>
              <td>
                {allele.freq.all.ac.toLocaleString()} / {allele.freq.all.an.toLocaleString()} (
                {(allele.freq.all.af * 100).toPrecision(4)}%)
              </td>
            </tr>
            <tr>
              <th scope="row">Motif purity</th>
              <td>{allele.motif_purity == null ? '—' : allele.motif_purity.toFixed(6)}</td>
            </tr>
            <tr>
              <th scope="row">Repeat count</th>
              <td>{allele.repeat_count == null ? '—' : allele.repeat_count.toLocaleString()}</td>
            </tr>
            <tr>
              <th scope="row">Filters</th>
              <td>{allele.filters.length ? allele.filters.join(', ') : 'PASS'}</td>
            </tr>
            <tr>
              <th scope="row">rsID</th>
              <td>{allele.rsids.length ? allele.rsids.join(', ') : '—'}</td>
            </tr>
            <tr>
              <th scope="row">Major consequence</th>
              <td>{allele.major_consequence || '—'}</td>
            </tr>
            <tr>
              <th scope="row">CADD / phyloP</th>
              <td>
                {allele.cadd_phred == null ? '—' : allele.cadd_phred} /{' '}
                {allele.phylop == null ? '—' : allele.phylop}
              </td>
            </tr>
            <tr>
              <th scope="row">Release / processing run</th>
              <td>
                {allele.source_release} / <code>{allele.source_run_id}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </ScrollTable>
    </SelectedDetailGrid>
    {(allele.motif_purity_source || allele.repeat_count_source) && (
      <details>
        <summary>Measurement provenance</summary>
        <dl>
          {allele.motif_purity_source && (
            <>
              <dt>Motif-purity field</dt>
              <dd>
                <code>{allele.motif_purity_source}</code>
              </dd>
            </>
          )}
          {allele.repeat_count_source && (
            <>
              <dt>Repeat-count field</dt>
              <dd>
                <code>{allele.repeat_count_source}</code>
              </dd>
            </>
          )}
        </dl>
      </details>
    )}
    {allele.freq.populations.length > 0 && (
      <details>
        <summary>Population and sex frequencies ({allele.freq.populations.length})</summary>
        <ScrollTable>
          <table>
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">AC</th>
                <th scope="col">AN</th>
                <th scope="col">AF</th>
              </tr>
            </thead>
            <tbody>
              {allele.freq.populations.map((frequency) => (
                <tr key={frequency.id}>
                  <th scope="row">{frequency.id}</th>
                  <td>{frequency.ac}</td>
                  <td>{frequency.an}</td>
                  <td>{frequency.af.toPrecision(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>
      </details>
    )}
  </SelectedDetail>
))

SelectedExactAlleleDetail.displayName = 'SelectedExactAlleleDetail'

export { Panel, signed, unavailableReason }
