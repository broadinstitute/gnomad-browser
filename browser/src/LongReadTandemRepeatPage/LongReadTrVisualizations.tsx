import React, { useEffect, useMemo, useState } from 'react'
import { FixedSizeList } from 'react-window'
import styled from 'styled-components'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import Link from '../Link'
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

const PlotGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(440px, calc(61.5% - 0.625em)) minmax(300px, calc(38.5% - 0.625em));
  gap: 1.25em;

  @media (max-width: 900px) {
    grid-template-columns: 100%;
  }
`

const PlotCard = styled.div`
  min-width: 0;
  padding: 1em;
  border: 1px solid #d8dee2;
  border-radius: 4px;
  background: #fbfcfd;
`

const signed = (value: number) => {
  if (value > 0) return `+${value}`
  if (value < 0) return `−${Math.abs(value)}`
  return '0'
}
const unavailableReason = (reason: string | null | undefined) =>
  reason ? reason.toLowerCase().replace(/_/g, ' ') : 'the required source data are unavailable'

const SelectionLink = ({
  alleleId,
  children,
  navigation,
}: {
  alleleId: string
  children: React.ReactNode
  navigation: AlleleNavigation
}) => (
  <Link
    to={navigation.hrefForAllele(alleleId)}
    preserveSelectedDataset={false}
    onClick={(event: React.MouseEvent) => {
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

export const motifColor = (motif: string) => {
  if (knownMotifColors[motif]) return knownMotifColors[motif]
  const hash = Array.from(motif).reduce((value, character) => value + character.charCodeAt(0), 0)
  return fallbackMotifColors[hash % fallbackMotifColors.length]
}

const MotifLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em 1em;
  margin-top: 0.6em;
  color: #4f5960;
  font-size: 12px;
`

export const componentLanes = (components: LongReadTrLocus['components']) => {
  const laneEnds: number[] = []
  return components.map((component) => {
    let lane = laneEnds.findIndex((end) => component.start0 >= end)
    if (lane < 0) lane = laneEnds.length
    laneEnds[lane] = component.end0
    return lane
  })
}

export const LongReadTrComponentTrack = ({ locus }: { locus: LongReadTrLocus }) => {
  const { components, region } = locus
  const lanes = componentLanes(components)
  const laneCount = Math.max(1, ...lanes.map((lane) => lane + 1))
  const width = 1000
  const left = 80
  const plotWidth = 880
  const x = (position: number) =>
    left + ((position - region.start0) / Math.max(1, region.end0 - region.start0)) * plotWidth

  return (
    <Panel aria-labelledby="lr-tr-components-heading">
      <h2 id="lr-tr-components-heading">Source-defined repeat components</h2>
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${85 + laneCount * 54}`}
          style={{ display: 'block', minWidth: 700, width: '100%' }}
          role="img"
          aria-label={`${components.length} ordered source repeat components in ${laneCount} coordinate lanes`}
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
                  fill={motifColor(component.motif)}
                >
                  <title>{label}</title>
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
      <MotifLegend aria-label="Repeat motif color legend">
        {[...new Set(components.map((component) => component.motif))].map((motif) => (
          <span key={motif}>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                marginRight: 4,
                borderRadius: 2,
                background: motifColor(motif),
              }}
            />
            {motif}
          </span>
        ))}
      </MotifLegend>
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
  margin: 1.8em 0 3.2em;
`

const HistogramYScale = styled.div`
  position: relative;
  height: 240px;
  border-right: 1px solid #89939a;
`

const HistogramScroller = styled.div`
  overflow-x: auto;
  overflow-y: visible;
  min-width: 0;
`

const Histogram = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 240px;
  border-bottom: 1px solid #89939a;
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

const BarButton = styled.button<{ $height: number; $selected: boolean; $hasValue: boolean }>`
  position: relative;
  flex: 1 1 14px;
  min-width: 12px;
  height: ${(props) => props.$height}%;
  min-height: ${(props) => (props.$hasValue ? '3px' : '1px')};
  padding: 0;
  border: ${(props) => {
    if (props.$selected) return '3px solid #222'
    return props.$hasValue ? '1px solid #397daf' : '0'
  }};
  border-bottom: ${(props) => {
    if (props.$selected) return '3px solid #222'
    return props.$hasValue ? '1px solid #397daf' : '1px solid #89939a'
  }};
  border-radius: 2px 2px 0 0;
  background: ${(props) => {
    if (!props.$hasValue) return 'transparent'
    return props.$selected ? '#e9781c' : '#74a9cf'
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

const BarDelta = styled.span`
  position: absolute;
  bottom: -2.2em;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  white-space: nowrap;
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

const alleleLabel = (alleleId: string) => {
  const match = /~([1-9][0-9]*)$/.exec(alleleId)
  return match ? `ALT ${match[1]}` : alleleId
}

const LengthBinAlleleTable = ({
  bin,
  alleles,
  selectedAllele,
  navigation,
}: {
  bin: AlleleBin
  alleles: Map<string, LongReadTrAllele>
  selectedAllele?: string
  navigation: AlleleNavigation
}) => (
  <div aria-live="polite">
    <h3>
      {signed(bin.delta)} bp contains {bin.allele_ids.length.toLocaleString()} exact ALT
      {bin.allele_ids.length === 1 ? '' : 's'}
    </h3>
    <p>
      The global bin contains {bin.called_alleles.toLocaleString()} called non-reference allele
      copies. Equal length does not imply equal sequence.
    </p>
    <ScrollTable>
      <table aria-label={`Exact alleles at ${signed(bin.delta)} bp`}>
        <thead>
          <tr>
            <th scope="col">Exact allele</th>
            <th scope="col">Δ length</th>
            <th scope="col">Source purity</th>
            <th scope="col">AC</th>
            <th scope="col">AN</th>
            <th scope="col">AF</th>
          </tr>
        </thead>
        <tbody>
          {bin.allele_ids.map((id) => {
            const allele = alleles.get(id)
            return (
              <tr key={id} aria-selected={id === selectedAllele}>
                <th scope="row">
                  <SelectionLink alleleId={id} navigation={navigation}>
                    {alleleLabel(id)}
                  </SelectionLink>
                </th>
                <td>{signed(bin.delta)} bp</td>
                <td>{allele?.motif_purity == null ? '—' : allele.motif_purity.toFixed(4)}</td>
                <td>{allele ? allele.freq.all.ac.toLocaleString() : '—'}</td>
                <td>{allele ? allele.freq.all.an.toLocaleString() : '—'}</td>
                <td>{allele ? allele.freq.all.af.toPrecision(4) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </ScrollTable>
  </div>
)

const PurityScatter = ({
  points,
  selectedAllele,
  navigation,
}: {
  points: PurityPoint[]
  selectedAllele?: string
  navigation: AlleleNavigation
}) => {
  if (!points.length) return <p>Source allele purity is unavailable.</p>
  const minDelta = Math.min(...points.map((point) => point.delta))
  const maxDelta = Math.max(...points.map((point) => point.delta))
  const minPurity = Math.min(...points.map((point) => point.motif_purity))
  const maxPurity = Math.max(...points.map((point) => point.motif_purity))
  return (
    <>
      <div
        role="group"
        aria-label={`${points.length} exact alleles plotted by whole-record length difference and source purity`}
        style={{
          position: 'relative',
          height: 250,
          margin: '1em 1.5em 2.5em',
          borderLeft: '1px solid #89939a',
          borderBottom: '1px solid #89939a',
        }}
      >
        {points.map((point) => {
          const left = ((point.delta - minDelta) / Math.max(1, maxDelta - minDelta)) * 100
          const bottom =
            ((point.motif_purity - minPurity) / Math.max(0.000001, maxPurity - minPurity)) * 100
          const selected = point.allele_id === selectedAllele
          return (
            <button
              key={point.allele_id}
              type="button"
              title={`${alleleLabel(point.allele_id)}: ${signed(
                point.delta
              )} bp, purity ${point.motif_purity.toFixed(4)}, AC ${point.called_alleles}`}
              aria-label={`Select ${alleleLabel(point.allele_id)}, ${signed(
                point.delta
              )} bp, purity ${point.motif_purity.toFixed(4)}, ${
                point.called_alleles
              } called copies`}
              aria-pressed={selected}
              onClick={() => navigation.onSelectAllele(point.allele_id)}
              style={{
                position: 'absolute',
                left: `${left}%`,
                bottom: `${bottom}%`,
                width: Math.min(24, 7 + Math.sqrt(point.called_alleles) * 2),
                height: Math.min(24, 7 + Math.sqrt(point.called_alleles) * 2),
                padding: 0,
                transform: 'translate(-50%, 50%)',
                border: selected ? '3px solid #111' : '1px solid #fff',
                borderRadius: '50%',
                background: selected ? '#e9781c' : '#7953aa',
                cursor: 'pointer',
              }}
            />
          )
        })}
        <span style={{ position: 'absolute', left: 0, bottom: -28 }}>{signed(minDelta)} bp</span>
        <span style={{ position: 'absolute', right: 0, bottom: -28 }}>{signed(maxDelta)} bp</span>
        <span style={{ position: 'absolute', left: -45, bottom: 0 }}>{minPurity.toFixed(3)}</span>
        <span style={{ position: 'absolute', left: -45, top: 0 }}>{maxPurity.toFixed(3)}</span>
      </div>
      <details>
        <summary>Accessible purity-point table ({points.length.toLocaleString()})</summary>
        <ScrollTable>
          <table>
            <thead>
              <tr>
                <th scope="col">Allele</th>
                <th scope="col">Δ length</th>
                <th scope="col">Purity</th>
                <th scope="col">AC</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.allele_id} aria-selected={point.allele_id === selectedAllele}>
                  <th scope="row">
                    <SelectionLink alleleId={point.allele_id} navigation={navigation}>
                      {alleleLabel(point.allele_id)}
                    </SelectionLink>
                  </th>
                  <td>{signed(point.delta)} bp</td>
                  <td>{point.motif_purity.toFixed(4)}</td>
                  <td>{point.called_alleles.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollTable>
      </details>
    </>
  )
}

export const WholeRecordAlleleLandscape = ({
  landscape,
  alleles,
  selectedAllele,
  navigation,
}: {
  landscape: WholeRecordAlleleLandscapeData
  alleles: LongReadTrAllele[]
  selectedAllele?: string
  navigation: AlleleNavigation
}) => {
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)
  const [selectedColorBy, rawSetSelectedColorBy] = useState<ColorBy | null>(null)
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleType>('linear')
  const bins = landscape.bins || []
  const alleleById = useMemo(
    () => new Map(alleles.map((allele) => [allele.variant_id, allele])),
    [alleles]
  )
  const selectedAlleleDelta = selectedAllele ? alleleById.get(selectedAllele)?.length ?? null : null
  const [selectedDelta, setSelectedDelta] = useState<number | null>(
    selectedAlleleDelta ?? bins[0]?.delta ?? null
  )
  const binDeltas = bins.map((bin) => bin.delta).join(',')

  useEffect(() => {
    if (selectedAlleleDelta != null && bins.some((bin) => bin.delta === selectedAlleleDelta)) {
      setSelectedDelta(selectedAlleleDelta)
      return
    }
    setSelectedDelta((current) =>
      bins.some((bin) => bin.delta === current) ? current : bins[0]?.delta ?? null
    )
    // binDeltas intentionally represents query reloads without depending on the unstable bins array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binDeltas, selectedAllele, selectedAlleleDelta])

  const selectedBin = bins.find((bin) => bin.delta === selectedDelta) || bins[0]

  if (landscape.status !== 'AVAILABLE') {
    return (
      <Panel aria-labelledby="lr-tr-allele-landscape-heading">
        <h2 id="lr-tr-allele-landscape-heading">Allelic landscape</h2>
        <p role="status">
          Whole-record allele landscape unavailable: {unavailableReason(landscape.reason_code)}.
        </p>
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
  const stackColor = (index: number) =>
    ['#6aa6ce', '#f7c3cc', '#8c8c8c', '#941494', '#ef1e24', '#128b44', '#fe9a10'][index % 7]
  const segmentsForBin = (bin: AlleleBin) =>
    colorCategories.map((category, index) => ({
      category,
      color: stackColor(index),
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

  return (
    <Panel aria-labelledby="lr-tr-allele-landscape-heading">
      <h2 id="lr-tr-allele-landscape-heading">Allelic landscape</h2>
      <p>
        Whole-record difference is complete ALT length minus REF length in base pairs. It is not a
        component repeat count, expansion size, or clinical classification.
      </p>
      <ControlSection style={{ marginTop: '1em', flexWrap: 'wrap', gap: '8px 16px' }}>
        {landscape.stratified_available && (
          <>
            <ShortTandemRepeatPopulationOptions
              id="lr-tr-whole-record"
              populations={(landscape.ancestry_groups || []) as PopulationId[]}
              selectedPopulation={selectedPopulation}
              selectedSex={selectedSex}
              setSelectedPopulation={setSelectedPopulation}
              setSelectedSex={setSelectedSex}
              ancestryGroupName={longReadAncestryGroupDisplayName}
            />
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
          </>
        )}
        <label>
          Measurement: &nbsp;
          <select value="whole-record" disabled aria-label="Measurement">
            <option value="whole-record">Whole-record ALT − REF length (bp)</option>
          </select>
        </label>
      </ControlSection>
      {!landscape.stratified_available && (
        <p role="status">
          Stratified controls are unavailable:{' '}
          {unavailableReason(landscape.stratified_unavailable_reason)}.
        </p>
      )}
      <p aria-live="polite">
        <strong>{totalInView.toLocaleString()} called non-reference allele copies</strong> in this
        filtered view; {landscape.exact_alt_count?.toLocaleString() || 'no'} exact ALTs globally.
      </p>
      {selectedColorBy && (
        <p>
          <strong>Stack colors:</strong>{' '}
          {colorCategories.map((category, index) => (
            <React.Fragment key={category}>
              {index > 0 && ', '}
              <span style={{ borderBottom: `4px solid ${stackColor(index)}` }}>{category}</span>
            </React.Fragment>
          ))}
        </p>
      )}
      {clippedAt && counts.some((count) => count > clippedAt) && (
        <p role="status">
          Bars above {clippedAt.toLocaleString()} copies are clipped; exact counts remain in labels
          and tables.
        </p>
      )}
      <PlotGrid>
        <PlotCard>
          <h3>Whole-record length difference</h3>
          <HistogramChart>
            <HistogramYScale aria-hidden="true">
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
            <HistogramScroller>
              <Histogram
                aria-label="Whole-record delta histogram"
                style={{ minWidth: Math.max(320, bins.length * 18) }}
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
                      data-height-percent={height.toFixed(3)}
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
                      onClick={() => {
                        setSelectedDelta(bin.delta)
                        if (
                          bin.allele_ids[0] &&
                          (!selectedAllele || !bin.allele_ids.includes(selectedAllele))
                        ) {
                          navigation.onSelectAllele(bin.allele_ids[0])
                        }
                      }}
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
                      <BarDelta>{signed(bin.delta)}</BarDelta>
                    </BarButton>
                  )
                })}
              </Histogram>
            </HistogramScroller>
          </HistogramChart>
          <div style={{ color: '#566168', fontSize: 11, textAlign: 'center' }}>
            Whole-record ALT − REF length (bp) · numbers above bars are exact ALTs
          </div>
        </PlotCard>
        <PlotCard>
          <h3>Length and source allele purity</h3>
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
      </PlotGrid>
      {selectedBin && (
        <LengthBinAlleleTable
          bin={selectedBin}
          alleles={alleleById}
          selectedAllele={selectedAllele}
          navigation={navigation}
        />
      )}
    </Panel>
  )
}

const HeatmapFigure = styled.figure`
  margin: 0;
`

const HeatmapSvg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  min-height: 300px;

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
}: {
  landscape: WholeRecordGenotypeLandscapeData
  navigation: AlleleNavigation
}) => {
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  if (landscape.status !== 'AVAILABLE') {
    return (
      <Panel aria-labelledby="lr-tr-genotype-heading">
        <h2 id="lr-tr-genotype-heading">Whole-record genotype distribution</h2>
        <p role="status">
          Genotype landscape unavailable: {unavailableReason(landscape.reason_code)}.
        </p>
      </Panel>
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
  const selectedCell =
    cells.find((cell) => keyFor(cell) === selectedKey) ||
    cells.slice().sort((a, b) => b.selectedPeople - a.selectedPeople)[0]
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

  return (
    <Panel aria-labelledby="lr-tr-genotype-heading">
      <h2 id="lr-tr-genotype-heading">Whole-record genotype distribution</h2>
      <p>
        X is the longer whole-record ALT − REF difference; Y is the shorter difference. Intensity is
        people. Reference (Δ 0) is an explicit identity, distinct from an exact zero-delta ALT.
      </p>
      <ControlSection style={{ marginTop: '1em', flexWrap: 'wrap' }}>
        <ShortTandemRepeatPopulationOptions
          id="lr-tr-whole-record-genotypes"
          populations={(landscape.ancestry_groups || []) as PopulationId[]}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
          ancestryGroupName={longReadAncestryGroupDisplayName}
        />
      </ControlSection>
      <p aria-live="polite">
        <strong>{totalPeople.toLocaleString()} people</strong> with complete diploid genotypes in
        this view.
      </p>
      <PlotGrid>
        <PlotCard>
          <HeatmapFigure>
            <HeatmapSvg
              viewBox={`0 0 ${heatmapWidth} ${heatmapHeight}`}
              role="grid"
              aria-label="Whole-record genotype heatmap"
            >
              <title>
                Whole-record genotype distribution by longer and shorter allele length difference
              </title>
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
                          aria-label={`${signed(longer)} bp longer, ${signed(
                            shorter
                          )} bp shorter: ${cell?.selectedPeople || 0} people`}
                          x={xFor(longer) + 1}
                          y={yFor(shorter) + 1}
                          width={Math.max(1, band - 2)}
                          height={Math.max(1, band - 2)}
                          rx={Math.min(2, band / 8)}
                          fill={cell ? '#1769aa' : '#f5f7f8'}
                          fillOpacity={cell ? 0.15 + 0.85 * intensity : 1}
                          stroke={selected ? '#e9781c' : '#fff'}
                          strokeWidth={selected ? 4 : 1}
                          cursor={cell ? 'pointer' : 'default'}
                          onClick={() => cell && setSelectedKey(key)}
                          onKeyDown={(event) => {
                            if (cell && (event.key === 'Enter' || event.key === ' ')) {
                              event.preventDefault()
                              setSelectedKey(key)
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
                            fill={intensity > 0.55 ? '#fff' : '#111'}
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
                    transform={`rotate(-48 ${xFor(value) + band / 2} ${
                      heatmapTop + plotSize + 15
                    })`}
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
                Longer allele ALT − REF length (bp)
              </text>
              <text
                x={15}
                y={heatmapTop + plotSize / 2}
                fill="#566168"
                fontSize={11}
                textAnchor="middle"
                transform={`rotate(-90 15 ${heatmapTop + plotSize / 2})`}
              >
                Shorter allele ALT − REF length (bp)
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
                  background: 'linear-gradient(90deg, rgba(23,105,170,.15), #1769aa)',
                }}
              />
              <span>More people (log intensity)</span>
            </IntensityKey>
          </HeatmapFigure>
        </PlotCard>
        <PlotCard aria-live="polite">
          {selectedCell ? (
            <>
              <h3>
                {signed(selectedCell.longer_delta)} bp × {signed(selectedCell.shorter_delta)} bp
              </h3>
              <p>
                <strong>{selectedCell.selectedPeople.toLocaleString()} people</strong> across{' '}
                {selectedCell.selectedPairs.length.toLocaleString()} unique exact allele{' '}
                {selectedCell.selectedPairs.length === 1 ? 'pair' : 'pairs'}.
              </p>
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
                            <SelectionLink
                              alleleId={pair.shorter_allele_id}
                              navigation={navigation}
                            >
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
            </>
          ) : (
            <p>No complete diploid genotypes match these filters.</p>
          )}
        </PlotCard>
      </PlotGrid>
    </Panel>
  )
}

const IndexHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(130px, 24%) repeat(5, minmax(80px, 15%));
  align-items: center;
  min-width: 650px;
  height: 36px;
  padding: 0 0.6em;
  border-bottom: 1px solid #bbb;
  background: #f7f9fa;
  font-weight: bold;
`

const IndexRow = styled.div<{ selected: boolean }>`
  display: grid;
  grid-template-columns: minmax(130px, 24%) repeat(5, minmax(80px, 15%));
  align-items: center;
  min-width: 650px;
  height: 36px;
  padding: 0 0.6em;
  border-bottom: 1px solid #ddd;
  background: ${(props) => (props.selected ? '#fff3e8' : '#fff')};
  outline: ${(props) => (props.selected ? '2px solid #a65310' : 'none')};
  outline-offset: -2px;
`

type ExactAlleleIndexRowData = {
  alleles: LongReadTrAllele[]
  selectedAllele?: string
  navigation: AlleleNavigation
}

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
  return (
    <IndexRow
      style={style}
      selected={allele.variant_id === data.selectedAllele}
      role="row"
      aria-selected={allele.variant_id === data.selectedAllele}
      aria-rowindex={index + 2}
      title={allele.variant_id}
    >
      <span role="cell">
        <SelectionLink alleleId={allele.variant_id} navigation={data.navigation}>
          {alleleLabel(allele.variant_id)}
        </SelectionLink>
      </span>
      <span role="cell">{allele.length == null ? '—' : `${signed(allele.length)} bp`}</span>
      <span role="cell">{allele.motif_purity == null ? '—' : allele.motif_purity.toFixed(4)}</span>
      <span role="cell">{allele.freq.all.ac.toLocaleString()}</span>
      <span role="cell">{allele.freq.all.an.toLocaleString()}</span>
      <span role="cell">{allele.freq.all.af.toPrecision(4)}</span>
    </IndexRow>
  )
}

export const ExactAlleleIndex = ({
  alleles,
  selectedAllele,
  navigation,
}: {
  alleles: LongReadTrAllele[]
  selectedAllele?: string
  navigation: AlleleNavigation
}) => {
  const itemData = { alleles, selectedAllele, navigation }
  return (
    <Panel aria-labelledby="lr-tr-index-heading">
      <h2 id="lr-tr-index-heading">Full exact ALT index ({alleles.length.toLocaleString()})</h2>
      <p>
        Every exact sequence identity in this bounded locus response remains independently
        selectable.
      </p>
      <div
        role="table"
        aria-label="Exact alternate allele index"
        aria-rowcount={alleles.length + 1}
        style={{ overflowX: 'auto', border: '1px solid #ddd' }}
      >
        <IndexHeader role="row" aria-rowindex={1}>
          <span role="columnheader">Allele</span>
          <span role="columnheader">Δ length</span>
          <span role="columnheader">Purity</span>
          <span role="columnheader">AC</span>
          <span role="columnheader">AN</span>
          <span role="columnheader">AF</span>
        </IndexHeader>
        <FixedSizeList
          height={Math.min(420, Math.max(72, alleles.length * 36))}
          itemCount={alleles.length}
          itemData={itemData}
          itemKey={(index: number) => alleles[index].variant_id}
          itemSize={36}
          overscanCount={10}
          width="100%"
        >
          {ExactAlleleIndexRow}
        </FixedSizeList>
      </div>
    </Panel>
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

export const SelectedExactAlleleDetail = React.forwardRef<
  HTMLElement,
  {
    allele: LongReadTrSelectedAllele
    motifs: string[]
  }
>(({ allele, motifs }, ref) => (
  <Panel
    ref={ref}
    tabIndex={-1}
    aria-labelledby="lr-tr-selected-detail-heading"
    data-testid="lr-tr-selected-detail"
  >
    <h2 id="lr-tr-selected-detail-heading">
      Selected exact allele: {alleleLabel(allele.variant_id)}
    </h2>
    <p>
      <code>{allele.variant_id}</code> is immutable, cohort/source-scoped exact identity.
    </p>
    <ScrollTable>
      <table>
        <tbody>
          <tr>
            <th scope="row">Source record / ordinal</th>
            <td>
              <code>{allele.source_variant_id}</code> / ALT {allele.alt_index} of {allele.alt_count}
            </td>
          </tr>
          <tr>
            <th scope="row">Whole-record Δ length</th>
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
            <th scope="row">Source purity</th>
            <td>
              {allele.motif_purity == null
                ? '—'
                : `${allele.motif_purity.toFixed(6)} (${
                    allele.motif_purity_source || 'source unavailable'
                  })`}
            </td>
          </tr>
          <tr>
            <th scope="row">Repeat count</th>
            <td>
              {allele.repeat_count == null
                ? '—'
                : `${allele.repeat_count.toLocaleString()} (${
                    allele.repeat_count_source || 'source unavailable'
                  })`}
            </td>
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
            <th scope="row">Release / run</th>
            <td>
              {allele.source_release} / <code>{allele.source_run_id}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </ScrollTable>
    {allele.freq.populations.length > 0 && (
      <details>
        <summary>Exact stratified frequencies ({allele.freq.populations.length})</summary>
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
    <h3>REF sequence ({allele.ref.length.toLocaleString()} bp)</h3>
    <Sequence>{allele.ref}</Sequence>
    <h3>ALT sequence ({allele.alt.length.toLocaleString()} bp)</h3>
    <Sequence>{allele.alt}</Sequence>
    <p>
      <strong>Source decomposition:</strong> {allele.decomposition_reason}. Browser DP tokens below
      describe sequence motifs; they do not assign tokens to source-coordinate components.
    </p>
    <ExactTrAltMotifStructure refAllele={allele.ref} altAllele={allele.alt} motifs={motifs} />
  </Panel>
))

SelectedExactAlleleDetail.displayName = 'SelectedExactAlleleDetail'

export { Panel, signed, unavailableReason }
