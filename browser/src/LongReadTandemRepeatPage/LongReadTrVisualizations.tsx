import React, { useMemo, useState } from 'react'
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
  grid-template-columns: minmax(440px, 1.6fr) minmax(300px, 1fr);
  gap: 1.25em;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
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

const motifColors = ['#1769aa', '#e9781c', '#268553', '#7953aa', '#d53d3d', '#5f6b72']

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
      <p>
        Components come directly from source TRID coordinates. Overlaps use separate lanes; repeated
        motifs remain distinct by source order and coordinates.
      </p>
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
            const componentWidth = Math.max(28, x(component.end0) - x(component.start0))
            const y = 12 + lanes[index] * 54
            const label = `Component ${index + 1}, ${component.motif}, chr${component.chrom}:${(
              component.start0 + 1
            ).toLocaleString()}–${component.end0.toLocaleString()}, ${
              component.end0 - component.start0
            } bp`
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
                  fill={motifColors[index % motifColors.length]}
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
                  {index + 1}. {component.motif}
                </text>
                <text
                  x={x(component.start0) + componentWidth / 2}
                  y={y + 43}
                  fill="#4f5960"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {component.end0 - component.start0} bp
                </text>
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
    </Panel>
  )
}

const Histogram = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  min-height: 270px;
  padding: 1em 0 2.5em;
  border-bottom: 1px solid #89939a;
`

const BarButton = styled.button<{ height: number; selected: boolean }>`
  position: relative;
  flex: 1 1 14px;
  min-width: 12px;
  height: ${(props) => Math.max(4, props.height)}%;
  padding: 0;
  border: ${(props) => (props.selected ? '3px solid #222' : '1px solid #397daf')};
  border-radius: 2px 2px 0 0;
  background: ${(props) => (props.selected ? '#e9781c' : '#74a9cf')};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid #111;
    outline-offset: 2px;
  }

  > span:last-child {
    position: absolute;
    bottom: -2.4em;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    white-space: nowrap;
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

const scaleValue = (count: number, scale: ScaleType) => {
  if (scale === 'log') return Math.log10(count + 1)
  const cap = {
    'linear-truncated-50': 50,
    'linear-truncated-200': 200,
    'linear-truncated-1000': 1000,
  }[scale as string]
  return Math.min(count, cap || count)
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
        role="img"
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
  const [selectedDelta, setSelectedDelta] = useState<number | null>(bins[0]?.delta ?? null)
  const selectedBin = bins.find((bin) => bin.delta === selectedDelta) || bins[0]
  const alleleById = useMemo(
    () => new Map(alleles.map((allele) => [allele.variant_id, allele])),
    [alleles]
  )

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
  const transformedMax = Math.max(1, ...counts.map((count) => scaleValue(count, selectedScaleType)))
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
  const clippedAt = (
    {
      'linear-truncated-50': 50,
      'linear-truncated-200': 200,
      'linear-truncated-1000': 1000,
    } as Record<string, number>
  )[selectedScaleType]
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
          <Histogram aria-label="Whole-record delta histogram">
            {bins.map((bin, index) => {
              const count = counts[index]
              return (
                <BarButton
                  key={bin.delta}
                  type="button"
                  height={(scaleValue(count, selectedScaleType) / transformedMax) * 100}
                  selected={bin.delta === selectedBin?.delta}
                  aria-pressed={bin.delta === selectedBin?.delta}
                  aria-label={`${signed(
                    bin.delta
                  )} bp, ${count} called allele copies in this view, ${
                    bin.exact_alt_count
                  } exact ALTs globally`}
                  title={`${signed(bin.delta)} bp · ${count.toLocaleString()} copies · ${
                    bin.exact_alt_count
                  } exact ALTs`}
                  onClick={() => setSelectedDelta(bin.delta)}
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
                  <span>{signed(bin.delta)}</span>
                </BarButton>
              )
            })}
          </Histogram>
          <p>
            Bar height is called allele copies; selecting a bar lists every exact global contributor
            at that length.
          </p>
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

const HeatGrid = styled.div<{ columns: number }>`
  display: grid;
  grid-template-columns: repeat(${(props) => props.columns}, minmax(30px, 1fr));
  gap: 2px;
  min-width: ${(props) => Math.max(300, props.columns * 34)}px;
`

const HeatCellButton = styled.button<{ intensity: number; selected: boolean }>`
  aspect-ratio: 1 / 1;
  border: ${(props) => (props.selected ? '3px solid #e9781c' : '1px solid #fff')};
  background: rgba(23, 105, 170, ${(props) => 0.15 + 0.85 * props.intensity});
  color: ${(props) => (props.intensity > 0.55 ? '#fff' : '#111')};
  cursor: pointer;

  &:focus-visible {
    outline: 3px solid #111;
    outline-offset: 1px;
  }
`

const filteredPairs = (pairs: GenotypePair[], population: PopulationId | null, sex: Sex | null) =>
  pairs.filter(
    (pair) => (!population || pair.ancestry_group === population) && (!sex || pair.sex === sex)
  )

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

  const cells = (landscape.cells || [])
    .map((cell) => ({
      ...cell,
      selectedPairs: filteredPairs(cell.pairs, selectedPopulation, selectedSex),
    }))
    .map((cell) => ({
      ...cell,
      selectedPeople: cell.selectedPairs.reduce((sum, pair) => sum + pair.people, 0),
    }))
    .filter((cell) => cell.selectedPeople > 0)
  const values = [
    ...new Set(cells.flatMap((cell) => [cell.shorter_delta, cell.longer_delta])),
  ].sort((a, b) => a - b)
  const maxPeople = Math.max(1, ...cells.map((cell) => cell.selectedPeople))
  const keyFor = (cell: GenotypeCell) => `${cell.shorter_delta}/${cell.longer_delta}`
  const selectedCell =
    cells.find((cell) => keyFor(cell) === selectedKey) ||
    cells.slice().sort((a, b) => b.selectedPeople - a.selectedPeople)[0]
  const totalPeople = cells.reduce((sum, cell) => sum + cell.selectedPeople, 0)
  const byCoordinate = new Map(cells.map((cell) => [keyFor(cell), cell]))

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
          <div style={{ overflowX: 'auto' }} role="grid" aria-label="Whole-record genotype heatmap">
            <HeatGrid columns={Math.max(1, values.length)}>
              {values.flatMap((shorter) =>
                values.map((longer) => {
                  const cell = byCoordinate.get(`${shorter}/${longer}`)
                  if (!cell) return <span key={`${shorter}/${longer}`} aria-hidden="true" />
                  const key = keyFor(cell)
                  return (
                    <HeatCellButton
                      key={key}
                      type="button"
                      role="gridcell"
                      intensity={Math.log(cell.selectedPeople + 1) / Math.log(maxPeople + 1)}
                      selected={key === keyFor(selectedCell)}
                      aria-selected={key === keyFor(selectedCell)}
                      aria-label={`${signed(longer)} bp longer, ${signed(shorter)} bp shorter: ${
                        cell.selectedPeople
                      } people`}
                      title={`${signed(longer)} bp × ${signed(shorter)} bp: ${
                        cell.selectedPeople
                      } people`}
                      onClick={() => setSelectedKey(key)}
                    >
                      {cell.selectedPeople}
                    </HeatCellButton>
                  )
                })
              )}
            </HeatGrid>
          </div>
          <p>
            Columns: longer allele Δ bp; rows: shorter allele Δ bp. Lighter cells contain fewer
            people.
          </p>
        </PlotCard>
        <PlotCard aria-live="polite">
          {selectedCell ? (
            <>
              <h3>
                {signed(selectedCell.longer_delta)} bp × {signed(selectedCell.shorter_delta)} bp
              </h3>
              <p>
                <strong>{selectedCell.selectedPeople.toLocaleString()} people</strong> across{' '}
                {selectedCell.selectedPairs.length.toLocaleString()} exact allele pairs.
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
                      <tr
                        key={`${pair.shorter_allele_id}/${pair.longer_allele_id}/${pair.ancestry_group}/${pair.sex}/${pair.people}/${pair.phased_people}/${pair.unphased_people}`}
                      >
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
  grid-template-columns: minmax(130px, 1.6fr) repeat(5, minmax(80px, 1fr));
  min-width: 650px;
  height: 36px;
  align-items: center;
  padding: 0 0.6em;
  border-bottom: 1px solid #bbb;
  background: #f7f9fa;
  font-weight: bold;
`

const IndexRow = styled.div<{ selected: boolean }>`
  display: grid;
  grid-template-columns: minmax(130px, 1.6fr) repeat(5, minmax(80px, 1fr));
  min-width: 650px;
  height: 36px;
  align-items: center;
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
        <IndexHeader role="row">
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
  max-height: 220px;
  overflow: auto;
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
