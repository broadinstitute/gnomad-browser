import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { FixedSizeList } from 'react-window'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { Select } from '@gnomad/ui'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'
import { shortenLongMotifToItsEnds } from '@gnomad/dataset-metadata/longReadTrLocusPresentation'

import Link from '../Link'
import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import ShortTandemRepeatColorBySelect from '../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect'
import ShortTandemRepeatPopulationOptions from '../ShortTandemRepeatPage/ShortTandemRepeatPopulationOptions'
import ShortTandemRepeatScaleSelect from '../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect'
import {
  ColorBy,
  ScaleType,
} from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import { Sex, logScaleAllowed } from '../ShortTandemRepeatPage/ShortTandemRepeatPage'
import { longReadAncestryGroupDisplayName } from '../LongReadVariantPage/longReadAncestryGroups'
import {
  LongReadAlleleSizeDistributionSection,
  LongReadGenotypeDistributionSection,
} from '../LongReadVariantPage/LongReadSTRDistributionSections'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import { PATH_COLORS, SUPERPOPULATION_COLORS } from '../Haplotypes/colors'
import {
  AlleleBin,
  AlleleNavigation,
  GenotypeCell,
  GenotypePair,
  LongReadTrAllele,
  LongReadTrFilterContract,
  LongReadTrFilterGroup,
  LongReadTrLocus,
  LongReadTrPresentation,
  LongReadTrRepresentedLength,
  PrimaryMotifMeasurementData,
  LongReadTrSelectedAllele,
  LongReadTrSequenceCardinality,
  PurityPoint,
  WholeRecordAlleleLandscapeData,
  WholeRecordGenotypeLandscapeData,
} from './types'
import {
  exactStoredMotifCountSummary,
  exactStoredMotifPreview,
  ExactStoredMotifSegment,
} from './exactStoredMotifPreview'
import {
  exactStoredMotifDistribution,
  ExactStoredMotifDistributionBin,
} from './exactStoredMotifDistribution'
import { DiscreteBrushMark, useDiscretePlotBrush } from './discretePlotBrush'
import {
  PrimaryMotifAllelePlotCard,
  PrimaryMotifGenotypeCells,
  primaryMotifGenotypeAvailable,
  primaryMotifMeasurementAvailable,
} from './PrimaryMotifMeasurementSection'

const Panel = styled.section`
  min-width: 0;
  max-width: 100%;
  margin-top: 2.4em;
`

const HorizontalPlotScroller = styled.div`
  overflow-x: auto;
  min-width: 0;
  max-width: 100%;
  outline-offset: 2px;

  &:focus-visible {
    outline: 3px solid #111;
  }
`

const ComponentLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45em;
  margin-top: 0.5em;
  color: #38434a;
  font-size: 0.9em;
`

const ComponentTableScroller = styled.div`
  overflow: auto;
  max-height: 420px;
  outline-offset: 2px;

  &:focus-visible {
    outline: 3px solid #111;
  }

  table {
    width: 100%;
    min-width: 660px;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.5em 0.65em;
    border-bottom: 1px solid #ddd;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: #f7f9fa;
  }

  td:nth-child(3) {
    max-width: 24em;
    overflow-wrap: anywhere;
  }
`

const ComponentPager = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65em;
  margin: 0.65em 0;

  button {
    min-height: 44px;
    padding: 0.45em 0.8em;
  }
`

const ExactReferenceOutlineKey = styled.span`
  display: inline-block;
  box-sizing: border-box;
  width: 2.2em;
  height: 1em;
  border: 2px dotted #111;
  background: #d8dee2;
`

const desktopColumnCount = (plotCount: number) => {
  if (plotCount === 3) return 3
  if (plotCount === 4) return 2
  return Math.min(2, Math.max(1, plotCount))
}

const PlotGrid = styled.div<{ $plotCount: number }>`
  /* stylelint-disable unit-whitelist -- CSS Grid fractional tracks preserve equal readable cards. */
  display: grid;
  grid-template-columns: repeat(
    ${(props) => desktopColumnCount(props.$plotCount)},
    minmax(280px, 1fr)
  );
  align-items: stretch;
  gap: clamp(24px, 2vw, 32px);

  @media (max-width: 1199px) {
    grid-template-columns: repeat(2, minmax(280px, 1fr));
  }

  @media (max-width: 700px) {
    grid-template-columns: minmax(280px, 1fr);
  }
  /* stylelint-enable unit-whitelist */
`

const DistributionControls = styled.div`
  /* stylelint-disable unit-whitelist -- fractional tracks align controls with plot slots. */
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  gap: clamp(24px, 2vw, 32px);
  margin: 1em 0 0.8em;

  > [role='radiogroup'] {
    margin-bottom: 0;
  }

  @media (max-width: 700px) {
    grid-template-columns: minmax(280px, 1fr);
  }
  /* stylelint-enable unit-whitelist */
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

const HeadingWithHelp = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35em;

  h2,
  h3 {
    margin-right: 0;
  }
`

const LandscapeControls = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  margin: 1em 0 1.5em;
  gap: 10px 22px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: stretch;
  }
`

const LengthAxisControl = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-weight: bold;
`

const ContractControlGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  gap: 8px;

  @media (max-width: 600px) {
    align-items: stretch;
    width: 100%;
  }
`

const ContractSelect = styled.label`
  display: inline-flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  gap: 0.2em;
  font-weight: bold;

  select {
    box-sizing: border-box;
    min-width: 13em;
    max-width: 100%;
    min-height: 44px;
  }

  @media (max-width: 600px) {
    flex: 1 1 13em;
  }
`

const ControlGroupLabel = styled.strong`
  align-self: center;
  white-space: nowrap;

  @media (max-width: 600px) {
    white-space: normal;
  }
`

type DistributionView = 'length' | 'repeat-count' | 'exact-motif'

export type LengthAxisMode = 'delta' | 'absolute'

// One control drives both landscape plots. The bp measures use the exact source length
// products; the repeat measures use whichever admitted repeat-unit product a plot has.
export type LandscapeMeasure = 'bp-absolute' | 'bp-delta' | 'repeats-absolute' | 'repeats-delta'

const landscapeMeasureLabel = (measure: LandscapeMeasure) => {
  if (measure === 'bp-absolute') return 'ALT allele size (bp)'
  if (measure === 'bp-delta') return 'ALT − REF allele size (bp)'
  if (measure === 'repeats-absolute') return 'ALT allele size (repeats)'
  return 'ALT − REF allele size (repeats)'
}

const measuresLength = (measure: LandscapeMeasure) =>
  measure === 'bp-absolute' || measure === 'bp-delta'

// Reference repeat units for the change-from-REF repeat measure. The browser divides the
// represented reference length by the primary motif length, which is only defensible for
// a single-component locus with one admitted primary motif.
const referenceRepeatUnits = (
  isolatedRepeat: boolean,
  primaryMotif: string | null,
  representedRefLength: number | null
) => {
  if (!isolatedRepeat || !primaryMotif || !representedRefLength) return null
  const units = representedRefLength / primaryMotif.length
  return Number.isInteger(units) ? units : null
}

const signed = (value: number) => {
  if (value > 0) return `+${value}`
  if (value < 0) return `−${Math.abs(value)}`
  return '0'
}

const lengthAxisValue = (
  delta: number,
  mode: LengthAxisMode,
  representedRefLength: number | null
) => (mode === 'absolute' && representedRefLength != null ? representedRefLength + delta : delta)

const lengthAxisLabel = (
  delta: number,
  mode: LengthAxisMode,
  representedRefLength: number | null
) =>
  mode === 'absolute' && representedRefLength != null
    ? `${(representedRefLength + delta).toLocaleString()} bp represented (${signed(
        delta
      )} bp vs REF)`
    : `${signed(delta)} bp vs REF`

// Axis title for an allele length axis, e.g. "Long Allele (bp)" or "Allele (bp minus REF)".
const lengthAxisTitle = (allele: string, mode: LengthAxisMode) =>
  `${allele} (${mode === 'absolute' ? 'bp' : 'bp minus REF'})`

const counted = (count: number, singular: string, plural: string) =>
  `${count.toLocaleString()} ${count === 1 ? singular : plural}`

const calledAlleleCopies = (count: number, nonReference = false) =>
  counted(
    count,
    `called ${nonReference ? 'non-reference ' : ''}allele copy`,
    `called ${nonReference ? 'non-reference ' : ''}allele copies`
  )

const exactAltSequences = (count: number) =>
  counted(count, 'source ALT allele', 'source ALT alleles')
const UNAVAILABLE_REASON_COPY: Record<string, string> = {
  ADMITTED_HISTOGRAM_COULD_NOT_BE_VALIDATED:
    'the cohort-specific repeat-count source could not be validated',
  ALLELE_INDEX_SEQUENCE_BYTE_BOUND_EXCEEDED: 'the allele sequences are too large to preview safely',
  BOUND_EXCEEDED: 'the result is too large to display safely',
  EXACT_ALLELE_SEQUENCE_ANCHOR_NOT_RECONCILABLE:
    'the complete REF and ALT sequences do not share one validated VCF anchor',
  EXACT_ALT_LIMIT_EXCEEDED:
    'the locus has more alternate alleles than this view can display safely',
  NO_METADATA: 'the source does not include the required metadata',
  NOT_AVAILABLE: 'the source does not provide these data',
  SELECTED_ALLELE_DETAIL_BYTE_BOUND_EXCEEDED:
    'the selected allele sequence is too large to display safely',
}

const unavailableReason = (reason: string | null | undefined) =>
  (reason && UNAVAILABLE_REASON_COPY[reason]) || 'the required source data are unavailable'

const AllelicLandscapeHelp = ({
  showRepeatCountControls = false,
  showLengthAxisControl = false,
  showAncestryControl = false,
  showSexControl = false,
  showHistogramDisplayControl = false,
  primaryMotifMeasurement,
}: {
  showRepeatCountControls?: boolean
  showLengthAxisControl?: boolean
  showAncestryControl?: boolean
  showSexControl?: boolean
  showHistogramDisplayControl?: boolean
  primaryMotifMeasurement?: PrimaryMotifMeasurementData
}) => (
  <HaplotypeHelpButton title="About the allelic landscape">
    <p style={{ marginTop: 0 }}>
      These plots summarize long-read observations at this locus and connect them to the source-ALT
      index below. Choosing a mark filters the index; dragging between identity-backed marks selects
      a range or region. A new plot selection replaces the previous one and never changes the URL.
      Choose <strong>Details</strong> in the index to update allele details.
    </p>
    <h4>Repeat-count distributions (simple loci only)</h4>
    <p>
      Bars show called allele copies; squares show people by shorter and longer repeat count.
      {showRepeatCountControls &&
        ' Use the ancestry, sex, color, and scale controls within each card.'}{' '}
      These marks are read-only when the source does not identify the contributing exact ALT
      sequences or allele pairs.
    </p>
    <h4>Total allele length change (ALT − REF, bp)</h4>
    <p>
      Bar height shows called allele copies: ALT copies in blue and REF copies in orange at the
      reference length. The number above each bar is its height, the number of alleles in that bin,
      and a bar holding only REF copies is also labeled REF. Hover over the number to see how many
      distinct source ALT sequences the bin holds. Choose a bar to filter the index, drag between
      bars, or activate one bar then use Shift+Arrow to select a contiguous range. Choose a single
      selected bar again, press Escape, or use <strong>Show all source ALT alleles</strong> to
      clear.
    </p>
    <h4>Motif occurrences</h4>
    <p>
      Bars count exact literal matches of the selected motif across whole represented source ALT
      alleles; they are not component repeat counts, genotypes, or a clinical measure. Bar height
      shows called source ALT copies and the number above shows contributing source ALT identities.
      Drag between bars, or activate one bar then use Shift+Arrow, to replace the current plot
      selection. Escape clears it.
    </p>
    {primaryMotifMeasurement && primaryMotifMeasurementAvailable(primaryMotifMeasurement) && (
      <>
        <h4>Reviewed exact primary-motif product</h4>
        <p>
          The genotype <strong>Exact motif</strong> plot uses the fixed, reviewed primary motif{' '}
          <strong>{primaryMotifMeasurement.motif}</strong>. Each value counts exact, non-overlapping
          primary-motif units across the complete represented REF or ALT allele. This whole-record
          aggregate research measurement is not a component repeat count, total length change,
          source MC/LPS value, short-read estimate, diagnostic result, or clinical classification.
          The allele <strong>Exact motif</strong> plot is different when it offers a motif selector:
          it counts literal occurrences of the selected stored motif in represented source ALT
          identities only. If that source-ALT distribution is unavailable, the allele slot may
          instead show the reviewed primary-product allele-copy histogram.
        </p>
        <details>
          <summary>Exact primary-motif totals and provenance</summary>
          <dl>
            {primaryMotifMeasurement.called_alleles != null && (
              <>
                <dt>Allele copies</dt>
                <dd>{primaryMotifMeasurement.called_alleles.toLocaleString()}</dd>
              </>
            )}
            {primaryMotifMeasurement.alternate_identities_checked != null && (
              <>
                <dt>Complete source ALT identities checked</dt>
                <dd>{primaryMotifMeasurement.alternate_identities_checked.toLocaleString()}</dd>
              </>
            )}
            {primaryMotifMeasurement.biological_role && (
              <>
                <dt>Source-backed motif role</dt>
                <dd>{primaryMotifMeasurement.biological_role}</dd>
              </>
            )}
            {primaryMotifMeasurement.provenance && (
              <>
                <dt>Product run</dt>
                <dd>
                  <code>{primaryMotifMeasurement.provenance.product_run_id}</code>
                </dd>
                <dt>Source record</dt>
                <dd>
                  <code>{primaryMotifMeasurement.provenance.source_variant_id}</code>
                </dd>
                <dt>Reviewed registry digest</dt>
                <dd>
                  <code>{primaryMotifMeasurement.provenance.registry_digest}</code>
                </dd>
                <dt>Algorithm</dt>
                <dd>
                  <code>{primaryMotifMeasurement.provenance.algorithm_version}</code>
                </dd>
                <dt>Anchor rule</dt>
                <dd>
                  <code>{primaryMotifMeasurement.provenance.anchor_rule}</code>
                </dd>
                <dt>Bounds status</dt>
                <dd>{primaryMotifMeasurement.provenance.bounds_status}</dd>
              </>
            )}
          </dl>
        </details>
      </>
    )}
    <h4>Length change × motif purity</h4>
    <p>
      Each point is one source ALT identity; point area shows allele count. Choose a point or drag a
      rectangle to filter without selecting an ALT. Purity is source-reported; the colored motif
      preview is a separate browser decomposition and may differ.
    </p>
    <h4>Genotype length distribution</h4>
    <p>
      Each populated square summarizes people with complete called genotypes containing both plotted
      alleles, grouped by the shorter and longer allele&apos;s total length change. Choose a square,
      drag a rectangle, or activate one square then use Shift+Arrow to union exact contributors.
      Escape clears the selection. Reference remains distinct from a zero-change source ALT and
      reference sentinel identities are excluded. Expand a square&apos;s exact-pair summary for
      details.
    </p>
    {(showLengthAxisControl ||
      showAncestryControl ||
      showSexControl ||
      showHistogramDisplayControl ||
      showRepeatCountControls) && (
      <p>
        {showLengthAxisControl &&
          'The length-axis control switches both landscape plots between the API-admitted ALT allele size and its change from REF, in base pairs or in repeat units. Repeat units come from the exact repeat-count product; change from REF in repeat units divides the represented reference length by the primary motif length, so it is offered only for a single-component locus. '}
        {(showAncestryControl || showSexControl) &&
          `The shared ${[showAncestryControl ? 'ancestry' : null, showSexControl ? 'sex' : null]
            .filter(Boolean)
            .join(' and ')} ${
            showAncestryControl && showSexControl ? 'controls affect' : 'control affects'
          } the visible allelic-landscape plots that support those slices. `}
        {showHistogramDisplayControl &&
          'Color and y-scale controls affect only the total-length histogram. '}
        {showRepeatCountControls && 'Repeat-count controls are card-local. '}
        Only index row selection changes the URL and selected detail.
      </p>
    )}
    <p style={{ marginBottom: 0 }}>
      Plot position, color, outlines, and catalog ranges do not classify an LR allele, genotype,
      component, person, or total allele length change.
    </p>
  </HaplotypeHelpButton>
)

const ExactAlleleIndexHelp = () => (
  <HaplotypeHelpButton title="About the source-ALT index">
    <p style={{ marginTop: 0 }}>
      <strong>What this shows.</strong> One row per source ALT identity, with an exact stored-motif
      string preview, total allele length change (ALT − REF, bp), source-reported motif purity,
      allele count, and allele frequency. The exact stored-motif string preview marks only literal
      occurrences of the displayed stored motif strings and may differ from source purity.
    </p>
    <p>
      <strong>How to use it.</strong> Sort with a column heading. Plot marks can temporarily filter
      these rows; <strong>Show all exact ALT sequences</strong> clears that filter. Choose{' '}
      <strong>Details</strong> to update the allele detail and URL without reloading the page.
    </p>
    <p style={{ marginBottom: 0 }}>
      <strong>What it does not show.</strong> A row is one exact source ALT identity, not a
      component projection, clinical classification, or person.
    </p>
  </HaplotypeHelpButton>
)

const SelectedAlleleHelp = () => (
  <HaplotypeHelpButton title="About exact ALT details">
    <p style={{ marginTop: 0 }}>
      <strong>What this shows.</strong> The selected source ALT identity, exact copyable sequence,
      an exact stored-motif string preview, admitted represented length when available, signed
      change from REF, stored motifs, and aggregate annotations.
    </p>
    <p>
      <strong>How to use it.</strong> Copy the exact sequence and expand aggregate frequency or
      technical provenance only when those details are needed.
    </p>
    <p style={{ marginBottom: 0 }}>
      <strong>What it does not show.</strong> Literal sequence-only motif highlighting does not
      assign bases to LR reference components, infer component-local repeat counts or longest-pure
      segments, or provide a clinical interpretation.
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
    aria-current={selected ? 'page' : undefined}
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
    // Source keys are not remapped here. In particular nfe is never guessed to mean EUR.
    return SUPERPOPULATION_COLORS[category] || UNKNOWN_STACK_COLOR
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
  exactReferenceComponentIndex = null,
  showTable = true,
  showOverview = true,
}: {
  locus: LongReadTrLocus
  exactReferenceComponentIndex?: number | null
  showTable?: boolean
  showOverview?: boolean
}) => {
  const { components, region } = locus
  const hasAuthorizedExactReferenceOutline =
    exactReferenceComponentIndex != null &&
    exactReferenceComponentIndex >= 0 &&
    exactReferenceComponentIndex < components.length
  const lanes = componentLanes(components)
  const laneCount = Math.max(1, ...lanes.map((lane) => lane + 1))
  const componentPageSize = 25
  const [componentPage, setComponentPage] = useState(0)
  const componentPageCount = Math.max(1, Math.ceil(components.length / componentPageSize))
  const boundedComponentPage = Math.min(componentPage, componentPageCount - 1)
  const visibleComponents = components.slice(
    boundedComponentPage * componentPageSize,
    (boundedComponentPage + 1) * componentPageSize
  )
  const width = 1000
  const left = 80
  const plotWidth = 880
  const x = (position: number) =>
    left + ((position - region.start0) / Math.max(1, region.end0 - region.start0)) * plotWidth

  return (
    <Panel
      aria-labelledby={showOverview ? 'lr-tr-components-heading' : undefined}
      aria-label={showOverview ? undefined : 'Ordered source component details'}
    >
      {showOverview && (
        <>
          <HeadingWithHelp>
            <h2 id="lr-tr-components-heading">LR reference components</h2>
            <HaplotypeHelpButton title="About LR reference components">
              <p style={{ marginTop: 0 }}>
                <strong>What this shows.</strong> LR reference components are the callset&apos;s
                ordered coordinate-and-motif intervals. Coordinates are one-based, inclusive genomic
                intervals.
              </p>
              <p>
                <strong>How to use it.</strong> Read components in number order. Overlapping
                intervals use separate lanes, and repeated motifs remain separate because interval
                and order are part of their identity. A neutral black dotted outline marks a
                verified unique exact short-read catalog reference match.
              </p>
              <p style={{ marginBottom: 0 }}>
                <strong>What it does not show.</strong> Motif fills and outlines do not classify an
                LR component, exact ALT sequence, genotype, person, or total allele length change.
              </p>
            </HaplotypeHelpButton>
          </HeadingWithHelp>
          <HorizontalPlotScroller
            role="region"
            aria-label="Scrollable LR reference component track"
            tabIndex={0}
          >
            <svg
              viewBox={`0 0 ${width} ${85 + laneCount * 54}`}
              style={{ display: 'block', minWidth: 700, width: '100%' }}
              role="img"
              aria-label={`${
                components.length
              } ordered LR reference components in ${laneCount} coordinate lanes${
                hasAuthorizedExactReferenceOutline
                  ? `; component ${
                      (exactReferenceComponentIndex as number) + 1
                    } has a neutral dotted outline for an exact short-read catalog reference match`
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
                const exactReferenceMatch =
                  hasAuthorizedExactReferenceOutline && index === exactReferenceComponentIndex
                const accessibleLabel = exactReferenceMatch
                  ? `${label}; exact short-read catalog reference match; neutral identity outline; no clinical classification`
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
                      stroke={exactReferenceMatch ? '#111' : undefined}
                      strokeWidth={exactReferenceMatch ? 4 : undefined}
                      strokeDasharray={exactReferenceMatch ? '2 4' : undefined}
                      data-exact-reference-component-match={
                        exactReferenceMatch ? 'true' : undefined
                      }
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
          </HorizontalPlotScroller>
          {hasAuthorizedExactReferenceOutline && (
            <ComponentLegend aria-label="LR reference component legend">
              <ExactReferenceOutlineKey aria-hidden="true" />
              <span>Exact short-read catalog reference match (identity only)</span>
            </ComponentLegend>
          )}
        </>
      )}
      {showTable && (
        <details>
          <summary>Full ordered component table ({components.length})</summary>
          <ComponentPager aria-label="Ordered component table pagination">
            <button
              type="button"
              disabled={boundedComponentPage === 0}
              onClick={() => setComponentPage((page) => Math.max(0, page - 1))}
            >
              Previous components
            </button>
            <span aria-live="polite">
              Components {(boundedComponentPage * componentPageSize + 1).toLocaleString()}–
              {Math.min(
                components.length,
                (boundedComponentPage + 1) * componentPageSize
              ).toLocaleString()}{' '}
              of {components.length.toLocaleString()}
            </span>
            <button
              type="button"
              disabled={boundedComponentPage >= componentPageCount - 1}
              onClick={() => setComponentPage((page) => Math.min(componentPageCount - 1, page + 1))}
            >
              Next components
            </button>
          </ComponentPager>
          <ComponentTableScroller
            role="region"
            aria-label="Scrollable ordered source component table"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Exact GRCh38 interval</th>
                  <th scope="col">Stored motif</th>
                  <th scope="col">Length</th>
                  <th scope="col">Lane / relation to previous</th>
                </tr>
              </thead>
              <tbody>
                {visibleComponents.map((component, pageIndex) => {
                  const index = boundedComponentPage * componentPageSize + pageIndex
                  const previous = components[index - 1]
                  let relation = 'first source component'
                  if (previous && component.start0 < previous.end0) {
                    relation = `${(previous.end0 - component.start0).toLocaleString()} bp overlap`
                  } else if (previous && component.start0 > previous.end0) {
                    relation = `${(component.start0 - previous.end0).toLocaleString()} bp gap`
                  } else if (previous) {
                    relation = 'touching'
                  }
                  return (
                    // Source component order is identity-bearing, including exact duplicates.
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={`${component.start0}-${component.end0}-${component.motif}-${index}`}>
                      <th scope="row">{index + 1}</th>
                      <td>
                        chr{component.chrom}:{(component.start0 + 1).toLocaleString()}–
                        {component.end0.toLocaleString()}
                      </td>
                      <td>
                        <code>{component.motif}</code>
                      </td>
                      <td>{(component.end0 - component.start0).toLocaleString()} bp</td>
                      <td>
                        Lane {lanes[index] + 1} · {relation}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </ComponentTableScroller>
        </details>
      )}
    </Panel>
  )
}

// The first column holds the rotated axis title and the y tick labels, so it is wide
// enough to keep the title inside the plot card rather than in the card's padding.
const HISTOGRAM_Y_COLUMN_WIDTH = 76
const HISTOGRAM_COLUMN_GAP = 8
const HISTOGRAM_SIDE_PADDING = 20

// On-screen size, in CSS pixels, of the axis tick labels and axis titles in the allele length
// histograms and the genotype length heatmap, so both plots read at the same size.
const AXIS_LABEL_FONT_PX = 14
// Room above the tallest bar for its label, which can be two lines (REF and its copy count).
const HISTOGRAM_BAR_LABEL_HEADROOM = 28

// Count labels on the allele length bars and in the genotype heatmap squares use one font size
// per plot, chosen so the widest label fills about 1/3 of a bar or square, within these bounds.
const COUNT_LABEL_MIN_FONT_PX = 9
const COUNT_LABEL_MAX_FONT_PX = 28
// Digits are about 0.6em wide.
const countLabelFontPx = (availableWidthPx: number, longestLabelLength: number) =>
  Math.min(
    COUNT_LABEL_MAX_FONT_PX,
    Math.max(COUNT_LABEL_MIN_FONT_PX, availableWidthPx / 3 / (longestLabelLength * 0.6))
  )
// Vertical spacing between the stacked lanes of x tick labels under the histogram.
const HISTOGRAM_X_TICK_LANE_HEIGHT = AXIS_LABEL_FONT_PX + 5

const HistogramChart = styled.div`
  display: grid;
  grid-template-columns:
    ${HISTOGRAM_Y_COLUMN_WIDTH}px
    calc(100% - ${HISTOGRAM_Y_COLUMN_WIDTH + HISTOGRAM_COLUMN_GAP}px);
  gap: ${HISTOGRAM_COLUMN_GAP}px;
  margin: 1.8em 0 1.2em;
`

const HistogramSizer = styled.div`
  width: 100%;
`

// react-sizeme's SizeMe render-prop export does not resolve under this project's jest
// transform, so the measurement uses the withSize HOC that the other plots here use.
const MeasuredWidth = withSize({ monitorWidth: true, noPlaceholder: true })(
  ({
    size,
    children,
  }: {
    size: { width: number | null }
    children: (width: number) => React.ReactElement
  }) => children(size.width || 0)
)

type HistogramLayout = { barWidth: number; gap: number; height: number }

// Bars widen to fill the plot when the natural layout leaves room. When the bins do not
// fit, they keep their natural width and the plot scrolls horizontally as before. A
// measured width of 0 (the initial render, and jsdom) keeps the natural width.
const filledBarWidth = (measuredWidth: number, binCount: number, layout: HistogramLayout) => {
  if (!measuredWidth || !binCount) return layout.barWidth
  const usableWidth =
    measuredWidth -
    HISTOGRAM_Y_COLUMN_WIDTH -
    HISTOGRAM_COLUMN_GAP -
    HISTOGRAM_SIDE_PADDING * 2 -
    (binCount - 1) * layout.gap
  return Math.max(layout.barWidth, Math.floor(usableWidth / binCount))
}

const HistogramYScale = styled.div<{ $height: number }>`
  position: relative;
  height: ${(props) => props.$height}px;
  margin-top: ${HISTOGRAM_BAR_LABEL_HEADROOM}px;
  border-right: 1px solid #89939a;
`

const HistogramScroller = styled.div`
  overflow-x: auto;
  min-width: 0;
`

// The headroom for the labels above the bars sits outside the bar area (here and as the
// y scale's top margin), so a full-height bar lines up with the top y tick and labels are not
// clipped by the scroller.
const HistogramScrollContent = styled.div`
  min-width: 100%;
  padding-top: ${HISTOGRAM_BAR_LABEL_HEADROOM}px;
`

const Histogram = styled.div<{ $height: number; $gap: number }>`
  display: flex;
  justify-content: center;
  align-items: flex-end;
  box-sizing: border-box;
  gap: ${(props) => props.$gap}px;
  height: ${(props) => props.$height}px;
`

const AxisTick = styled.span`
  position: absolute;
  right: 5px;
  transform: translateY(50%);
  color: #566168;
  font-size: ${AXIS_LABEL_FONT_PX}px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const AxisTitle = styled.span`
  position: absolute;
  top: 50%;
  left: ${AXIS_LABEL_FONT_PX / 2 + 2}px;
  width: 170px;
  transform: translate(-50%, -50%) rotate(-90deg);
  color: #566168;
  font-size: ${AXIS_LABEL_FONT_PX}px;
  text-align: center;
`

const BarButton = styled.button<{
  $height: number
  $selected: boolean
  $hasValue: boolean
  $width: number
  $fill?: string
  $selectedFill?: string
}>`
  position: relative;
  flex: 0 0 ${(props) => props.$width}px;
  min-width: 24px;
  max-width: ${(props) => Math.max(48, props.$width)}px;
  height: ${(props) => props.$height}%;
  min-height: ${(props) => (props.$hasValue ? '3px' : '1px')};
  padding: 0;
  border: ${(props) => {
    if (props.$selected) return '3px solid #222'
    return props.$hasValue ? `1px solid ${props.$fill || LONG_READ_PRIMARY_PLOT_COLOR}` : '0'
  }};
  border-bottom: ${(props) => {
    if (props.$selected) return '3px solid #222'
    return props.$hasValue
      ? `1px solid ${props.$fill || LONG_READ_PRIMARY_PLOT_COLOR}`
      : '1px solid #89939a'
  }};
  border-radius: 2px 2px 0 0;
  background: ${(props) => {
    if (!props.$hasValue) return 'transparent'
    return props.$selected
      ? props.$selectedFill || '#e9781c'
      : props.$fill || LONG_READ_PRIMARY_PLOT_COLOR
  }};
  cursor: pointer;

  &:disabled {
    cursor: default;
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 100%;
    min-width: 44px;
    height: max(44px, 100%);
    transform: translateX(-50%);
  }

  &:focus-visible {
    outline: 3px solid #111;
    outline-offset: 2px;
  }
`

// Anchored to the bar's top edge, so a two-line label (REF and its copy count) grows upward.
const BarExactCount = styled.span`
  position: absolute;
  bottom: calc(100% + 3px);
  left: 50%;
  transform: translateX(-50%);
  color: #525d64;
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
`

const HistogramSelectionBoundary = styled.span<{
  $height: number
  $start: boolean
  $stop: boolean
}>`
  position: absolute;
  z-index: 2;
  bottom: 0;
  left: -2px;
  box-sizing: border-box;
  width: calc(100% + 4px);
  height: ${(props) => props.$height}px;
  border-right: ${(props) => (props.$stop ? '2px solid #e9781c' : '0')};
  border-left: ${(props) => (props.$start ? '2px solid #e9781c' : '0')};
  pointer-events: none;
`

const HistogramXAxis = styled.div<{ $height: number; $width: number }>`
  position: relative;
  box-sizing: border-box;
  width: ${(props) => props.$width}px;
  height: ${(props) => props.$height}px;
  border-top: 1px solid #566168;
  margin: 0 auto;
  color: #3f484d;
  font-size: ${AXIS_LABEL_FONT_PX}px;
  font-variant-numeric: tabular-nums;
`

// The x axis title supplies the space below the plot, so the chart above it drops its own.
const HistogramChartWithXAxisTitle = styled(HistogramChart)`
  margin-bottom: 0;
`

// Sits under the scrolling plot column, outside the scroller, so it stays centered and visible.
const HistogramXAxisTitle = styled.div`
  margin: 2px 0 1.2em;
  padding-left: ${HISTOGRAM_Y_COLUMN_WIDTH + HISTOGRAM_COLUMN_GAP}px;
  color: #566168;
  font-size: ${AXIS_LABEL_FONT_PX}px;
  text-align: center;
`

const HistogramXTick = styled.span<{ $lane: number; $left: number }>`
  position: absolute;
  top: ${(props) => 7 + props.$lane * HISTOGRAM_X_TICK_LANE_HEIGHT}px;
  left: ${(props) => props.$left}px;
  transform: translateX(-50%);
  white-space: nowrap;

  &::before {
    content: '';
    position: absolute;
    top: ${(props) => -7 - props.$lane * HISTOGRAM_X_TICK_LANE_HEIGHT}px;
    left: 50%;
    width: 1px;
    height: ${(props) => 5 + props.$lane * HISTOGRAM_X_TICK_LANE_HEIGHT}px;
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
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  height: calc(2em + 2px);
  padding: 0.375em 0.75em;
  border: 1px solid #6c757d;
  border-radius: 0.5em;
  background: #f8f9fa;
  color: #111;
  font-size: 0.85em;
  line-height: 1.25;
  text-decoration: none;
  user-select: none;

  &[aria-current='page'] {
    border-color: #a65310;
    background: #fff3e8;
    box-shadow: inset 0 0 0 1px #a65310;
  }

  &:hover {
    background: #d3d7da;
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 0.2em rgb(108 117 125 / 50%);
  }
`

const ScrollTable = styled.div`
  /* stylelint-disable no-descending-specificity -- generated styled-component classes isolate tables. */
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
  /* stylelint-enable no-descending-specificity */
`

const stackSourceKey = (stack: AlleleBin['stacks'][number]) => {
  if (stack.ancestry_group && stack.sex) return `${stack.ancestry_group}_${stack.sex}`
  return stack.ancestry_group || stack.sex
}

const binCount = (bin: AlleleBin, ancestry: PopulationId | null, sex: Sex | null): number => {
  if (!ancestry && !sex) return bin.called_alleles
  return bin.stacks
    .filter((stack) => stack.ancestry_group === (ancestry || null) && stack.sex === (sex || null))
    .reduce((sum, stack) => sum + stack.called_alleles, 0)
}

// Colorblind-safe (Okabe-Ito) pair for the allele length histogram: ALT allele sizes in blue and
// the REF allele size in orange, with a dark navy for selected bars so selection never reads as REF.
const ALT_ALLELE_SIZE_BAR_COLOR = '#0072b2'
const REF_ALLELE_SIZE_BAR_COLOR = '#e69f00'
const SELECTED_ALLELE_SIZE_BAR_COLOR = '#003f63'

const AlleleSizeColorSwatch = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 3px;
  border-radius: 2px;
  background: ${(props) => props.$color};
`

// REF copies sit at 0 bp change. When no ALT allele has the REF length, an ALT-free bin at 0 gives
// them a bar of their own.
const withReferenceSizeBin = (bins: AlleleBin[], referenceCalledAlleles: number | null) =>
  !referenceCalledAlleles || bins.some((bin) => bin.delta === 0)
    ? bins
    : [
        ...bins,
        { delta: 0, called_alleles: 0, exact_alt_count: 0, allele_ids: [], stacks: [] },
      ].sort((left, right) => left.delta - right.delta)

const groupSupportsVisiblePlots = (
  group: LongReadTrFilterGroup,
  genotypeLandscapeVisible: boolean
) =>
  group.shared_available &&
  group.available_in_frequency &&
  group.source_frequency_keys.length > 0 &&
  (!genotypeLandscapeVisible ||
    (group.available_in_genotype && group.source_metadata_keys.length > 0))

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

const deltaTickWidth = (delta: number) =>
  Math.max(20, signed(delta).length * AXIS_LABEL_FONT_PX * 0.7 + 6)

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
  return match ? `Sequence ${match[1]}` : alleleId
}

const PurityPointButton = styled.button<{ $diameter: number }>`
  position: absolute;
  display: block;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;

  > span {
    position: absolute;
    top: 50%;
    left: 50%;
    box-sizing: border-box;
    width: ${(props) => props.$diameter}px;
    height: ${(props) => props.$diameter}px;
    border: 2px solid #fff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background: ${LONG_READ_PRIMARY_PLOT_COLOR};
    box-shadow: 0 0 0 1px #681875;
  }

  &[data-selected-allele='true'] > span {
    border: 3px solid #111;
    background: #e9781c;
    box-shadow: 0 0 0 2px #fff;
  }

  &[aria-pressed='true'] {
    z-index: 2;
    outline: 3px solid #111;
    outline-offset: 2px;
  }

  &:focus-visible {
    z-index: 3;
    outline: 3px solid #111;
    outline-offset: 3px;
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

// The 44 px button's focus outline reaches 25 px from its center. Keep that full keyboard
// target (and the largest 26 px AC mark) inside the axes at every data-domain boundary.
export const PURITY_POINT_CLEARANCE = 25
export const PURITY_MAX_JITTER = 32
export const PURITY_HORIZONTAL_INSET = PURITY_POINT_CLEARANCE + PURITY_MAX_JITTER

export const purityScalePosition = (
  value: number,
  minimum: number,
  maximum: number,
  inset: number
) => {
  const ratio = minimum === maximum ? 0.5 : (value - minimum) / (maximum - minimum)
  return {
    percent: ratio * 100,
    pixelOffset: (1 - 2 * ratio) * inset,
  }
}

export const purityOverlapOffset = (index: number, count: number) => {
  if (count <= 1) return 0
  const span = Math.min((count - 1) * 24, PURITY_MAX_JITTER * 2)
  return (index / (count - 1) - 0.5) * span
}

const purityPositionCss = ({ percent, pixelOffset }: ReturnType<typeof purityScalePosition>) => {
  if (pixelOffset === 0) return `${percent}%`
  const operator = pixelOffset > 0 ? '+' : '-'
  return `calc(${percent}% ${operator} ${Math.abs(pixelOffset)}px)`
}

const PurityScatter = ({
  points,
  selectedAllele,
  activeMarkIds,
  onSelectPoints,
  onClear,
  lengthAxisMode = 'delta',
  representedRefLength = null,
}: {
  points: PurityPoint[]
  selectedAllele?: string
  activeMarkIds: Set<string>
  onSelectPoints: (points: PurityPoint[]) => void
  onClear: () => void
  lengthAxisMode?: LengthAxisMode
  representedRefLength?: number | null
}) => {
  const brushMarks: DiscreteBrushMark<PurityPoint>[] = points.map((point) => ({
    id: `purity:${point.allele_id}`,
    x: point.delta,
    y: point.motif_purity,
    value: point,
  }))
  const brush = useDiscretePlotBrush({
    marks: brushMarks,
    axis: 'xy',
    onSelect: (selection) => onSelectPoints(selection.marks),
    onClear,
  })
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
        aria-label={`${exactAltSequences(points.length)} plotted by ${
          lengthAxisMode === 'absolute' ? 'represented allele length' : 'change from REF'
        } and source-reported motif purity`}
        data-purity-domain={`${domainMinimum.toFixed(6)}:${domainMaximum.toFixed(6)}`}
        data-horizontal-inset={PURITY_HORIZONTAL_INSET}
        data-vertical-inset={PURITY_POINT_CLEARANCE}
        {...brush.containerProps}
        style={{
          position: 'relative',
          height: scatterHeight,
          margin: '1em 1.5em 2.5em 2.8em',
          borderLeft: '1px solid #89939a',
          borderBottom: '1px solid #89939a',
        }}
      >
        {purityTicks.map((tick) => {
          const bottom = purityPositionCss(
            purityScalePosition(tick, domainMinimum, domainMaximum, PURITY_POINT_CLEARANCE)
          )
          return (
            <React.Fragment key={tick}>
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom,
                  left: 0,
                  borderTop: '1px solid #e2e6e8',
                }}
              />
              <span
                data-testid="purity-axis-tick"
                style={{
                  position: 'absolute',
                  right: 'calc(100% + 6px)',
                  bottom,
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
          const mark = brushMarks.find((candidate) => candidate.value === point)!
          const markProps = brush.markProps(mark)
          const pointSelected = activeMarkIds.has(mark.id) || brush.previewMarkIds.has(mark.id)
          const left = purityPositionCss(
            purityScalePosition(point.delta, minDelta, maxDelta, PURITY_HORIZONTAL_INSET)
          )
          const bottom = purityPositionCss(
            purityScalePosition(
              point.motif_purity,
              domainMinimum,
              domainMaximum,
              PURITY_POINT_CLEARANCE
            )
          )
          const size = purityPointDiameter(
            point.called_alleles,
            minimumCalledAlleles,
            maximumCalledAlleles
          )
          const overlapKey = `${point.delta}\u0000${point.motif_purity}`
          const overlapIndex = overlapIndexes.get(overlapKey) || 0
          overlapIndexes.set(overlapKey, overlapIndex + 1)
          const overlapCount = overlapCounts.get(overlapKey) || 1
          const overlapOffset = purityOverlapOffset(overlapIndex, overlapCount)
          return (
            <PurityPointButton
              key={point.allele_id}
              type="button"
              $diameter={size}
              aria-pressed={pointSelected}
              data-selected-allele={point.allele_id === selectedAllele}
              data-discrete-brush-id={markProps['data-discrete-brush-id']}
              title={`${alleleLabel(point.allele_id)}: ${lengthAxisLabel(
                point.delta,
                lengthAxisMode,
                representedRefLength
              )}, purity ${point.motif_purity.toFixed(4)}, AC ${point.called_alleles}`}
              aria-label={`Filter the source-ALT index to ${alleleLabel(
                point.allele_id
              )}; ${lengthAxisLabel(
                point.delta,
                lengthAxisMode,
                representedRefLength
              )}; source-reported motif purity ${point.motif_purity.toFixed(
                4
              )}; ${calledAlleleCopies(point.called_alleles)}`}
              data-allele-id={point.allele_id}
              data-called-alleles={point.called_alleles}
              data-point-diameter={size}
              data-overlap-offset={overlapOffset}
              onClick={(event) => {
                if (!markProps.onClick(event)) onSelectPoints([point])
              }}
              onKeyDown={(event) => markProps.onKeyDown(event)}
              style={{
                left,
                bottom,
                transform: `translate(calc(-50% + ${overlapOffset}px), 50%)`,
              }}
            >
              <span aria-hidden="true" />
            </PurityPointButton>
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
            {lengthAxisMode === 'absolute'
              ? lengthAxisValue(minDelta, lengthAxisMode, representedRefLength).toLocaleString()
              : signed(minDelta)}{' '}
            bp
          </span>
        ) : (
          <>
            <span style={{ position: 'absolute', left: PURITY_HORIZONTAL_INSET, bottom: -28 }}>
              {lengthAxisMode === 'absolute'
                ? lengthAxisValue(minDelta, lengthAxisMode, representedRefLength).toLocaleString()
                : signed(minDelta)}{' '}
              bp
            </span>
            <span style={{ position: 'absolute', right: PURITY_HORIZONTAL_INSET, bottom: -28 }}>
              {lengthAxisMode === 'absolute'
                ? lengthAxisValue(maxDelta, lengthAxisMode, representedRefLength).toLocaleString()
                : signed(maxDelta)}{' '}
              bp
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
      <div style={{ color: '#566168', fontSize: 11 }}>
        Drag between points for a rectangular selection, or activate one point then use Shift+Arrow.
        Escape clears the selection.
      </div>
      <div
        aria-label={`Point size represents source ALT allele AC from ${minimumCalledAlleles} to ${maximumCalledAlleles}`}
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

const RepeatCountPlotCard = ({
  variantId,
  repeatCountPlots,
  kind,
}: {
  variantId: string
  repeatCountPlots: LongReadTrLocus['repeat_count_plots']
  kind: 'allele' | 'genotype'
}) => {
  if (repeatCountPlots.status !== 'AVAILABLE_EXACT') return null

  return (
    <PlotCard
      data-plot-card={`${kind}-repeat-count`}
      data-testid={`${kind}-repeat-count-card`}
      data-interaction-status={repeatCountPlots.interaction.interaction_status}
      role="group"
      aria-label={`Static ${kind} repeat-count plot and controls; does not filter the source-ALT index`}
    >
      {kind === 'allele' ? (
        <>
          <h3>Allele repeat-count distribution</h3>
          <LongReadAlleleSizeDistributionSection
            variantId={variantId}
            alleleSizeDistribution={repeatCountPlots.allele_size_distribution}
            maxRepunits={repeatCountPlots.max_repunits || 0}
            repeatUnit={repeatCountPlots.repeat_unit || undefined}
            headingLevel="h4"
            heading="Repeat-count plot"
            compact
            focusObservedDomain
            showHelp={false}
            yAxisLabel="Called allele copies"
          />
        </>
      ) : (
        <>
          <h3>Genotype repeat-count distribution</h3>
          <LongReadGenotypeDistributionSection
            variantId={variantId}
            genotypeDistribution={repeatCountPlots.genotype_distribution}
            headingLevel="h4"
            heading="Repeat-count plot"
            compact
            focusObservedDomain
            showHelp={false}
          />
        </>
      )}
    </PlotCard>
  )
}

const MotifOccurrenceControl = styled.label`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45em;
  font-weight: bold;

  select {
    max-width: 100%;
  }
`

const MotifOccurrenceAxis = styled.div<{ $gap: number; $width: number }>`
  display: flex;
  justify-content: center;
  gap: ${(props) => props.$gap}px;
  box-sizing: border-box;
  width: ${(props) => props.$width}px;
  padding-top: 6px;
  border-top: 1px solid #566168;
  margin: 0 auto;
  color: #3f484d;
  font-size: ${AXIS_LABEL_FONT_PX}px;
  font-variant-numeric: tabular-nums;
  text-align: center;
`

const MotifOccurrenceTick = styled.span`
  flex: 0 0 34px;
`

const MotifOccurrencePlotCard = ({
  motifs,
  selectedMotifIndex,
  bins,
  activeMarkIds,
  onSelectMotifIndex,
  onSelectBins,
  onClear,
}: {
  motifs: string[]
  selectedMotifIndex: number
  bins: ExactStoredMotifDistributionBin[]
  activeMarkIds: Set<string>
  onSelectMotifIndex: (motifIndex: number) => void
  onSelectBins: (bins: ExactStoredMotifDistributionBin[]) => void
  onClear: () => void
}) => {
  const motif = motifs[selectedMotifIndex]
  const brushMarks: DiscreteBrushMark<ExactStoredMotifDistributionBin>[] = bins.map((bin) => ({
    id: `motif-occurrence:${selectedMotifIndex}:${bin.occurrence_count}`,
    x: bin.occurrence_count,
    y: 0,
    value: bin,
  }))
  const brush = useDiscretePlotBrush({
    marks: brushMarks,
    axis: 'x',
    onSelect: (selection) => onSelectBins(selection.marks),
    onClear,
  })
  const maxCopies = Math.max(0, ...bins.map((bin) => bin.allele_copies))
  const ticks = histogramTicks(maxCopies, 'linear')
  let height = 240
  if (bins.length <= 3) height = 190
  else if (bins.length <= 12) height = 220
  const gap = bins.length <= 12 ? 6 : 3
  const barWidth = 34
  const sidePadding = 20
  const contentWidth = bins.length * barWidth + Math.max(0, bins.length - 1) * gap
  const scrollWidth = contentWidth + sidePadding * 2
  return (
    <PlotCard data-plot-card="source-alt-motif-occurrences" data-testid="motif-occurrence-card">
      <h3>Allele exact-motif distribution</h3>
      {/* With a single motif there is nothing to choose; the page header already names it. */}
      {motifs.length > 1 && (
        <MotifOccurrenceControl>
          Motif
          <Select
            aria-label="Motif for source ALT occurrence distribution"
            title={motif}
            value={selectedMotifIndex}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              onSelectMotifIndex(Number(event.target.value))
            }
          >
            {motifs.map((option, motifIndex) => (
              // Vocabulary position is identity-bearing, including exact duplicate strings.
              // eslint-disable-next-line react/no-array-index-key
              <option key={motifIndex} value={motifIndex}>
                {shortenLongMotifToItsEnds(option)}
                {motifs.filter((candidate) => candidate === option).length > 1
                  ? ` (stored position ${motifIndex + 1})`
                  : ''}
              </option>
            ))}
          </Select>
        </MotifOccurrenceControl>
      )}
      {bins.length ? (
        <HistogramChart>
          <HistogramYScale aria-hidden="true" $height={height}>
            <AxisTitle>Called source ALT copies</AxisTitle>
            {ticks.map((tick) => (
              <AxisTick
                key={tick}
                style={{ bottom: `${histogramHeightPercent(tick, maxCopies, 'linear')}%` }}
              >
                {tick.toLocaleString()}
              </AxisTick>
            ))}
          </HistogramYScale>
          <HistogramScroller
            role="region"
            aria-label={`${motif} exact literal occurrence histogram for whole represented source ALTs`}
            tabIndex={0}
          >
            <HistogramScrollContent style={{ width: scrollWidth }}>
              <Histogram $height={height} $gap={gap} {...brush.containerProps}>
                {bins.map((bin, index) => {
                  const mark = brushMarks.find(
                    (candidate) => candidate.value.occurrence_count === bin.occurrence_count
                  )!
                  const selected = activeMarkIds.has(mark.id) || brush.previewMarkIds.has(mark.id)
                  const selectedIndices = brushMarks
                    .map((candidate, candidateIndex) =>
                      activeMarkIds.has(candidate.id) || brush.previewMarkIds.has(candidate.id)
                        ? candidateIndex
                        : -1
                    )
                    .filter((candidateIndex) => candidateIndex >= 0)
                  const selectionStart = selected && index === Math.min(...selectedIndices)
                  const selectionStop = selected && index === Math.max(...selectedIndices)
                  const barHeight = histogramHeightPercent(bin.allele_copies, maxCopies, 'linear')
                  const markProps = brush.markProps(mark)
                  return (
                    <BarButton
                      key={bin.occurrence_count}
                      data-discrete-brush-id={markProps['data-discrete-brush-id']}
                      type="button"
                      $height={barHeight}
                      $hasValue={bin.allele_copies > 0}
                      $width={barWidth}
                      $selected={selected}
                      aria-pressed={selected}
                      aria-label={`${motif}; ${counted(
                        bin.occurrence_count,
                        'exact literal occurrence',
                        'exact literal occurrences'
                      )} in each whole represented source ALT; ${counted(
                        bin.allele_copies,
                        'called source ALT copy',
                        'called source ALT copies'
                      )} in this view; ${exactAltSequences(
                        bin.allele_ids.length
                      )}; filter the source-ALT index to this occurrence bin`}
                      onClick={(event) => {
                        if (!markProps.onClick(event)) onSelectBins([bin])
                      }}
                      onKeyDown={(event) => markProps.onKeyDown(event)}
                    >
                      <BarExactCount title={exactAltSequences(bin.allele_ids.length)}>
                        {bin.allele_ids.length}
                      </BarExactCount>
                      {(selectionStart || selectionStop) && (
                        <HistogramSelectionBoundary
                          aria-hidden="true"
                          data-testid="motif-occurrence-selection-boundary"
                          $height={height}
                          $start={selectionStart}
                          $stop={selectionStop}
                        />
                      )}
                    </BarButton>
                  )
                })}
              </Histogram>
              <MotifOccurrenceAxis $gap={gap} $width={scrollWidth}>
                {bins.map((bin) => (
                  <MotifOccurrenceTick key={bin.occurrence_count}>
                    {bin.occurrence_count.toLocaleString()}
                  </MotifOccurrenceTick>
                ))}
              </MotifOccurrenceAxis>
            </HistogramScrollContent>
          </HistogramScroller>
        </HistogramChart>
      ) : (
        <p role="status">No called source ALT copies in the current frequency slice.</p>
      )}
    </PlotCard>
  )
}

export type ExactIndexMarkFilterScope = {
  locusId: string
  cohort: string
  sourceRunId: string
}

export type ExactIndexSelectionOrigin =
  | 'total-length'
  | 'motif-occurrence'
  | 'purity'
  | 'genotype-length'

export type ExactIndexSelection = {
  scope: ExactIndexMarkFilterScope
  origin: ExactIndexSelectionOrigin
  markIds: string[]
  alleleIds: string[]
  label: string
  singleDelta?: number
}

export const WholeRecordAlleleLandscape = ({
  landscape,
  genotypeLandscape,
  repeatCountPlots,
  primaryMotifMeasurement,
  variantId,
  markFilterScope,
  alleles,
  motifs = [],
  primaryMotif,
  exactAltCountComplete = false,
  selectedAllele,
  navigation,
  selectedAlleleDetail,
  sequencesAvailable = true,
  sequencesUnavailableReason,
  presentation,
  sequenceCardinality,
  representedLength,
  filterContract,
  sourceRecordOrder = [],
}: {
  landscape: WholeRecordAlleleLandscapeData
  genotypeLandscape?: WholeRecordGenotypeLandscapeData
  repeatCountPlots?: LongReadTrLocus['repeat_count_plots']
  primaryMotifMeasurement?: PrimaryMotifMeasurementData
  variantId?: string
  markFilterScope?: ExactIndexMarkFilterScope
  alleles: LongReadTrAllele[]
  motifs?: string[]
  primaryMotif?: string | null
  exactAltCountComplete?: boolean
  selectedAllele?: string
  navigation: AlleleNavigation
  selectedAlleleDetail?: React.ReactNode
  sequencesAvailable?: boolean
  sequencesUnavailableReason?: string | null
  presentation?: LongReadTrPresentation
  sequenceCardinality?: LongReadTrSequenceCardinality
  representedLength?: LongReadTrRepresentedLength
  filterContract?: LongReadTrFilterContract
  sourceRecordOrder?: string[]
}) => {
  const admittedRepeatCountPlots =
    repeatCountPlots?.status === 'AVAILABLE_EXACT' ? repeatCountPlots : undefined
  const admittedGenotypeLandscape =
    genotypeLandscape?.status === 'AVAILABLE' ? genotypeLandscape : undefined
  const admittedPrimaryMotifMeasurement = primaryMotifMeasurementAvailable(primaryMotifMeasurement)
    ? primaryMotifMeasurement
    : undefined
  const admittedPrimaryMotifGenotype = primaryMotifGenotypeAvailable(primaryMotifMeasurement)
    ? primaryMotifMeasurement
    : undefined
  const repeatCountVariantId = variantId || 'lr-tr-locus'
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)
  const [selectedContractAncestryId, setSelectedContractAncestryId] = useState<string | null>(null)
  const [selectedContractSexId, setSelectedContractSexId] = useState<string | null>(null)
  const [selectedColorBy, rawSetSelectedColorBy] = useState<ColorBy | null>(null)
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleType>('linear')
  const [requestedMeasure, setRequestedMeasure] = useState<LandscapeMeasure>('bp-absolute')
  const representedRefLength = representedLength?.represented_ref_length_bp ?? null
  const absoluteLengthAvailable =
    representedLength?.status === 'AVAILABLE_EXACT' &&
    representedLength.reconciliation_status === 'RECONCILED' &&
    representedRefLength != null
  const excludeValidatedSharedPadding =
    representedLength?.status === 'AVAILABLE_EXACT' &&
    representedLength.reconciliation_status === 'RECONCILED' &&
    representedLength.anchor_rule === 'VCF_SHARED_LEFT_PADDING_BASE_V1'
  const defaultMotifIndex = Math.max(0, primaryMotif ? motifs.indexOf(primaryMotif) : 0)
  const motifVocabularyKey = `${motifs.join('\u0000')}\u0001${primaryMotif || ''}`
  const [selectedMotifIndex, setSelectedMotifIndex] = useState(defaultMotifIndex)
  useEffect(() => setSelectedMotifIndex(defaultMotifIndex), [defaultMotifIndex, motifVocabularyKey])
  const filterOptions = useMemo(
    () => reconciledFilterOptions(landscape, admittedGenotypeLandscape),
    [admittedGenotypeLandscape, landscape]
  )
  const contractAvailable = Boolean(
    filterContract &&
      filterContract.status !== 'UNAVAILABLE' &&
      filterContract.vocabulary_release &&
      filterContract.vocabulary_digest
  )
  const admittedAncestryGroups = useMemo(
    () =>
      contractAvailable &&
      filterContract?.ancestry_mapping_status === 'APPROVED_EXACT' &&
      filterContract.available_color_dimensions.includes('ANCESTRY')
        ? filterContract.ancestry_groups.filter((group) =>
            groupSupportsVisiblePlots(group, Boolean(admittedGenotypeLandscape))
          )
        : [],
    [admittedGenotypeLandscape, contractAvailable, filterContract]
  )
  const admittedSexGroups = useMemo(
    () =>
      contractAvailable &&
      filterContract?.sex_mapping_status === 'APPROVED_EXACT' &&
      filterContract.available_color_dimensions.includes('SEX')
        ? filterContract.sex_groups.filter((group) =>
            groupSupportsVisiblePlots(group, Boolean(admittedGenotypeLandscape))
          )
        : [],
    [admittedGenotypeLandscape, contractAvailable, filterContract]
  )
  const showContractAncestryControl = Boolean(
    filterContract && !filterContract.ancestry_control_redundant && admittedAncestryGroups.length
  )
  const showContractSexControl = Boolean(filterContract && admittedSexGroups.length)
  const contractColorBys: ColorBy[] = [
    ...(showContractAncestryControl ? (['population'] as ColorBy[]) : []),
    ...(showContractSexControl ? (['sex'] as ColorBy[]) : []),
  ]
  const showLegacyFilterControls = landscape.stratified_available && !filterContract
  const showHistogramDisplayControl = showLegacyFilterControls || contractColorBys.length > 0
  const bins = withReferenceSizeBin(landscape.bins || [], landscape.reference_called_alleles)
  // The REF allele as a bin of its own, so the same ancestry and sex filtering counts its copies.
  const referenceBin: AlleleBin = {
    delta: 0,
    called_alleles: landscape.reference_called_alleles || 0,
    exact_alt_count: 0,
    allele_ids: [],
    stacks: landscape.reference_stacks || [],
  }
  useEffect(() => {
    if (selectedPopulation && !filterOptions.ancestries.includes(selectedPopulation)) {
      setSelectedPopulation(null)
    }
    if (selectedSex && !filterOptions.sexes.includes(selectedSex)) setSelectedSex(null)
  }, [filterOptions, selectedPopulation, selectedSex])
  useEffect(() => {
    if (
      selectedContractAncestryId &&
      !admittedAncestryGroups.some((group) => group.id === selectedContractAncestryId)
    ) {
      setSelectedContractAncestryId(null)
    }
    if (
      selectedContractSexId &&
      !admittedSexGroups.some((group) => group.id === selectedContractSexId)
    ) {
      setSelectedContractSexId(null)
    }
  }, [admittedAncestryGroups, admittedSexGroups, selectedContractAncestryId, selectedContractSexId])
  useEffect(() => {
    if (
      (selectedColorBy === 'population' && !showContractAncestryControl && filterContract) ||
      (selectedColorBy === 'sex' && !showContractSexControl && filterContract)
    ) {
      rawSetSelectedColorBy(null)
    }
  }, [filterContract, selectedColorBy, showContractAncestryControl, showContractSexControl])
  const alleleById = useMemo(
    () => new Map(alleles.map((allele) => [allele.variant_id, allele])),
    [alleles]
  )
  const scope = markFilterScope || {
    locusId: variantId || alleles[0]?.source_variant_id || 'lr-tr-locus',
    cohort: 'unknown',
    sourceRunId: 'unknown',
  }
  const scopeKey = `${scope.locusId}\u0000${scope.cohort}\u0000${scope.sourceRunId}`
  const previousScopeKey = useRef(scopeKey)
  const [indexSelection, setIndexSelection] = useState<ExactIndexSelection | null>(null)
  const indexHeading = useRef<HTMLHeadingElement>(null)
  const selectedContractAncestry = admittedAncestryGroups.find(
    (group) => group.id === selectedContractAncestryId
  )
  const selectedContractSex = admittedSexGroups.find((group) => group.id === selectedContractSexId)
  const contractSelectionActive = Boolean(selectedContractAncestry || selectedContractSex)
  const matchingContractFrequencyKeys = (stack: AlleleBin['stacks'][number]) => {
    const sourceKey = stackSourceKey(stack)
    if (!sourceKey) return false
    if (selectedContractAncestry && !selectedContractSex && stack.sex) return false
    if (selectedContractSex && !selectedContractAncestry && stack.ancestry_group) return false
    return (
      (!selectedContractAncestry ||
        selectedContractAncestry.source_frequency_keys.includes(sourceKey)) &&
      (!selectedContractSex || selectedContractSex.source_frequency_keys.includes(sourceKey))
    )
  }
  const selectedContractFrequencyKeys = [
    ...new Set(
      bins.flatMap((bin) =>
        bin.stacks.filter(matchingContractFrequencyKeys).map((stack) => stackSourceKey(stack) || '')
      )
    ),
  ].filter(Boolean)
  const legacySelectedDivision =
    selectedPopulation && selectedSex
      ? `${selectedPopulation}_${selectedSex}`
      : selectedPopulation || selectedSex
  let selectedDivision = legacySelectedDivision
  if (filterContract) {
    selectedDivision = null
    if (contractSelectionActive) {
      selectedDivision =
        selectedContractFrequencyKeys.length === 1
          ? selectedContractFrequencyKeys[0]
          : '__NO_EXACT_CONTRACT_FREQUENCY_SLICE__'
    }
  }
  const frequencyCountFor = (allele: LongReadTrAllele | undefined) => {
    if (!allele) return 0
    if (!selectedDivision) return allele.freq.all.ac
    if (selectedDivision === '__NO_EXACT_CONTRACT_FREQUENCY_SLICE__') return 0
    return allele.freq.populations.find((frequency) => frequency.id === selectedDivision)?.ac || 0
  }
  const motifDistribution = useMemo(
    () =>
      exactStoredMotifDistribution({
        alleles,
        motifs,
        sequenceCardinality,
        representedLength,
        exactAltCountComplete,
        selectedFrequencyId:
          selectedDivision === '__NO_EXACT_CONTRACT_FREQUENCY_SLICE__'
            ? '__NO_MATCH__'
            : selectedDivision,
      }),
    [
      alleles,
      exactAltCountComplete,
      motifs,
      representedLength,
      selectedDivision,
      sequenceCardinality,
    ]
  )
  const admittedMotifDistribution =
    landscape.status === 'AVAILABLE' &&
    selectedDivision !== '__NO_EXACT_CONTRACT_FREQUENCY_SLICE__' &&
    motifDistribution.status === 'available'
      ? motifDistribution
      : undefined
  const selectedMotifDistribution = admittedMotifDistribution?.motifs[selectedMotifIndex]
  const alleleDistributionChoices = useMemo(() => {
    const choices: DistributionView[] = []
    if (landscape.status === 'AVAILABLE') choices.push('length')
    if (admittedRepeatCountPlots) choices.push('repeat-count')
    if (admittedMotifDistribution || admittedPrimaryMotifMeasurement) {
      choices.push('exact-motif')
    }
    return choices
  }, [
    admittedMotifDistribution,
    admittedPrimaryMotifMeasurement,
    admittedRepeatCountPlots,
    landscape.status,
  ])
  const genotypeDistributionChoices = useMemo(() => {
    const choices: DistributionView[] = []
    if (admittedGenotypeLandscape) choices.push('length')
    if (admittedRepeatCountPlots) choices.push('repeat-count')
    if (admittedPrimaryMotifGenotype) choices.push('exact-motif')
    return choices
  }, [admittedGenotypeLandscape, admittedPrimaryMotifGenotype, admittedRepeatCountPlots])
  // A repeat measure uses the reviewed exact-motif product when a plot admits one, and the
  // exact repeat-count product otherwise.
  const repeatViewFor = (choices: DistributionView[]) => {
    if (choices.includes('exact-motif')) return 'exact-motif' as const
    if (choices.includes('repeat-count')) return 'repeat-count' as const
    return null
  }
  const repeatsAvailable = Boolean(
    repeatViewFor(alleleDistributionChoices) || repeatViewFor(genotypeDistributionChoices)
  )
  const referenceUnits = referenceRepeatUnits(
    presentation?.locus_type === 'ISOLATED_REPEAT',
    primaryMotif,
    representedRefLength
  )
  const measureChoices = useMemo(() => {
    const choices: LandscapeMeasure[] = []
    if (absoluteLengthAvailable) choices.push('bp-absolute')
    if (repeatsAvailable) choices.push('repeats-absolute')
    choices.push('bp-delta')
    if (repeatsAvailable && referenceUnits != null) choices.push('repeats-delta')
    return choices
  }, [absoluteLengthAvailable, referenceUnits, repeatsAvailable])
  // The fallback is named rather than taken from the list, so the repeats measure listed second
  // never becomes the default when the absolute bp measure is unavailable.
  const fallbackMeasure: LandscapeMeasure = absoluteLengthAvailable ? 'bp-absolute' : 'bp-delta'
  const selectedMeasure = measureChoices.includes(requestedMeasure)
    ? requestedMeasure
    : fallbackMeasure
  const showControlSection =
    measureChoices.length > 1 ||
    showLegacyFilterControls ||
    showContractAncestryControl ||
    showContractSexControl
  const lengthAxisMode: LengthAxisMode = selectedMeasure === 'bp-absolute' ? 'absolute' : 'delta'
  const lengthAxisName =
    lengthAxisMode === 'absolute' ? 'Represented allele length (bp)' : 'Change from REF (bp)'
  // Each plot honours the selected measure when it admits a matching product, and keeps
  // its own first admitted view otherwise.
  const viewForMeasure = (choices: DistributionView[]) => {
    if (!choices.length) return undefined
    if (measuresLength(selectedMeasure)) {
      return choices.includes('length') ? ('length' as const) : choices[0]
    }
    return repeatViewFor(choices) || choices[0]
  }
  const selectedAlleleDistributionView = viewForMeasure(alleleDistributionChoices)
  const selectedGenotypeDistributionView = viewForMeasure(genotypeDistributionChoices)
  // The change-from-REF repeat measure reuses the admitted unit products with every count
  // expressed relative to the reference unit count.
  const shiftRepeatUnits = selectedMeasure === 'repeats-delta' && referenceUnits != null
  const shiftedPrimaryMotifMeasurement = useMemo(() => {
    if (!admittedPrimaryMotifMeasurement || !shiftRepeatUnits || referenceUnits == null) {
      return admittedPrimaryMotifMeasurement
    }
    return {
      ...admittedPrimaryMotifMeasurement,
      bins: admittedPrimaryMotifMeasurement.bins.map((bin) => ({
        ...bin,
        exact_units: bin.exact_units - referenceUnits,
      })),
      genotype: {
        ...admittedPrimaryMotifMeasurement.genotype,
        cells: admittedPrimaryMotifMeasurement.genotype.cells.map((cell) => ({
          ...cell,
          shorter_exact_units: cell.shorter_exact_units - referenceUnits,
          longer_exact_units: cell.longer_exact_units - referenceUnits,
        })),
      },
    }
  }, [admittedPrimaryMotifMeasurement, referenceUnits, shiftRepeatUnits])
  const shiftedPrimaryMotifGenotype = admittedPrimaryMotifGenotype
    ? shiftedPrimaryMotifMeasurement
    : undefined
  const shiftedRepeatCountPlots = useMemo(() => {
    if (
      !admittedRepeatCountPlots ||
      selectedMeasure !== 'repeats-delta' ||
      referenceUnits == null
    ) {
      return admittedRepeatCountPlots
    }
    return {
      ...admittedRepeatCountPlots,
      max_repunits:
        admittedRepeatCountPlots.max_repunits == null
          ? null
          : admittedRepeatCountPlots.max_repunits - referenceUnits,
      allele_size_distribution: admittedRepeatCountPlots.allele_size_distribution.map(
        (cohort: any) => ({
          ...cohort,
          distribution: cohort.distribution.map((item: any) => ({
            ...item,
            repunit_count: item.repunit_count - referenceUnits,
          })),
        })
      ),
      genotype_distribution: admittedRepeatCountPlots.genotype_distribution.map((cohort: any) => ({
        ...cohort,
        distribution: cohort.distribution.map((item: any) => ({
          ...item,
          short_allele_repunit_count: item.short_allele_repunit_count - referenceUnits,
          long_allele_repunit_count: item.long_allele_repunit_count - referenceUnits,
        })),
      })),
    }
  }, [admittedRepeatCountPlots, referenceUnits, selectedMeasure])
  const visiblePlotCount = 2 + (genotypeDistributionChoices.length ? 1 : 0)
  const filteredPurityPoints = (landscape.purity_points || []).flatMap((point) => {
    const frequencyCount = frequencyCountFor(alleleById.get(point.allele_id))
    if (frequencyCount <= 0) return []
    return selectedDivision ? [{ ...point, called_alleles: frequencyCount }] : [point]
  })
  const selectionScopeKey = indexSelection
    ? `${indexSelection.scope.locusId}\u0000${indexSelection.scope.cohort}\u0000${indexSelection.scope.sourceRunId}`
    : null
  const activeIndexSelection = selectionScopeKey === scopeKey ? indexSelection : null
  useEffect(() => {
    if (!activeIndexSelection) return
    const originIsVisible =
      activeIndexSelection.origin === 'purity' ||
      (activeIndexSelection.origin === 'total-length' &&
        selectedAlleleDistributionView === 'length') ||
      (activeIndexSelection.origin === 'motif-occurrence' &&
        selectedAlleleDistributionView === 'exact-motif' &&
        Boolean(admittedMotifDistribution)) ||
      (activeIndexSelection.origin === 'genotype-length' &&
        selectedGenotypeDistributionView === 'length')
    if (!originIsVisible) setIndexSelection(null)
  }, [
    activeIndexSelection,
    admittedMotifDistribution,
    selectedAlleleDistributionView,
    selectedGenotypeDistributionView,
  ])
  const activeMarkIds = new Set(activeIndexSelection?.markIds || [])
  const selectedDelta =
    activeIndexSelection?.origin === 'total-length' && activeIndexSelection.markIds.length === 1
      ? activeIndexSelection.singleDelta ?? null
      : null
  const selectedBin = bins.find((bin) => bin.delta === selectedDelta)
  let selectedGenotypeAncestries: readonly string[] = selectedPopulation ? [selectedPopulation] : []
  let selectedGenotypeSexes: readonly string[] = selectedSex ? [selectedSex] : []
  if (filterContract) {
    selectedGenotypeAncestries = []
    selectedGenotypeSexes = []
    if (selectedContractAncestry) {
      selectedGenotypeAncestries = selectedContractAncestry.source_metadata_keys.length
        ? selectedContractAncestry.source_metadata_keys
        : ['__NO_EXACT_CONTRACT_METADATA_ANCESTRY__']
    }
    if (selectedContractSex) {
      selectedGenotypeSexes = selectedContractSex.source_metadata_keys.length
        ? selectedContractSex.source_metadata_keys
        : ['__NO_EXACT_CONTRACT_METADATA_SEX__']
    }
  }
  const uniqueIds = (ids: string[]) => [...new Set(ids)]
  const currentGenotypeSelectionAlleleIds =
    activeIndexSelection?.origin === 'genotype-length'
      ? uniqueIds(
          (admittedGenotypeLandscape?.cells || [])
            .filter((cell) =>
              activeIndexSelection.markIds.includes(
                `genotype-length:${cell.shorter_delta}/${cell.longer_delta}`
              )
            )
            .flatMap((cell) =>
              cell.pairs
                .filter(
                  (pair) =>
                    (!selectedGenotypeAncestries.length ||
                      selectedGenotypeAncestries.includes(pair.ancestry_group)) &&
                    (!selectedGenotypeSexes.length || selectedGenotypeSexes.includes(pair.sex)) &&
                    pair.people > 0
                )
                .flatMap((pair) => [pair.shorter_allele_id, pair.longer_allele_id])
            )
        ).filter((alleleId) => alleleId !== admittedGenotypeLandscape?.reference_allele_id)
      : []
  const activeAlleleSet = activeIndexSelection
    ? new Set(
        activeIndexSelection.origin === 'genotype-length'
          ? currentGenotypeSelectionAlleleIds
          : activeIndexSelection.alleleIds.filter((alleleId) =>
              frequencyCountFor(alleleById.get(alleleId))
            )
      )
    : null
  const indexedAlleles = activeAlleleSet
    ? alleles.filter((allele) => activeAlleleSet.has(allele.variant_id))
    : alleles
  const focusIndex = () => indexHeading.current?.focus({ preventScroll: true })
  const activateIndexSelection = (next: ExactIndexSelection) => {
    setIndexSelection((current) =>
      current &&
      current.origin === next.origin &&
      current.markIds.length === 1 &&
      next.markIds.length === 1 &&
      current.markIds[0] === next.markIds[0] &&
      `${current.scope.locusId}\u0000${current.scope.cohort}\u0000${current.scope.sourceRunId}` ===
        scopeKey
        ? null
        : next
    )
    focusIndex()
  }
  const filterIndexToLengthBins = (selectedBins: AlleleBin[]) => {
    const ordered = [...selectedBins].sort((left, right) => left.delta - right.delta)
    if (!ordered.length) return
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    let label = `at ${lengthAxisLabel(first.delta, lengthAxisMode, representedRefLength)}`
    if (ordered.length > 1) {
      label =
        lengthAxisMode === 'absolute' && representedRefLength != null
          ? `${(representedRefLength + first.delta).toLocaleString()} to ${(
              representedRefLength + last.delta
            ).toLocaleString()} bp represented`
          : `${signed(first.delta)} to ${signed(last.delta)} bp vs REF`
    }
    activateIndexSelection({
      scope,
      origin: 'total-length',
      markIds: ordered.map((bin) => `total-length:${bin.delta}`),
      alleleIds: uniqueIds(ordered.flatMap((bin) => bin.allele_ids)),
      label,
      singleDelta: ordered.length === 1 ? first.delta : undefined,
    })
  }
  const filterIndexToMotifBins = (
    motifIndex: number,
    selectedBins: ExactStoredMotifDistributionBin[]
  ) => {
    const ordered = [...selectedBins].sort(
      (left, right) => left.occurrence_count - right.occurrence_count
    )
    if (!ordered.length) return
    const motif = motifs[motifIndex]
    const first = ordered[0].occurrence_count
    const last = ordered[ordered.length - 1].occurrence_count
    activateIndexSelection({
      scope,
      origin: 'motif-occurrence',
      markIds: ordered.map((bin) => `motif-occurrence:${motifIndex}:${bin.occurrence_count}`),
      alleleIds: uniqueIds(ordered.flatMap((bin) => bin.allele_ids)),
      label:
        first === last
          ? `${motif}: ${counted(
              first,
              'exact literal occurrence',
              'exact literal occurrences'
            )} in each whole represented source ALT`
          : `${motif}: ${first.toLocaleString()} through ${last.toLocaleString()} exact literal occurrences in each whole represented source ALT`,
    })
  }
  const selectMotifIndex = (motifIndex: number) => {
    setSelectedMotifIndex(motifIndex)
    if (activeIndexSelection?.origin === 'motif-occurrence') setIndexSelection(null)
  }
  const selectMeasure = (measure: LandscapeMeasure) => {
    setRequestedMeasure(measure)
    const alleleView = measuresLength(measure) ? 'length' : repeatViewFor(alleleDistributionChoices)
    let visibleOrigin: ExactIndexSelectionOrigin | null = null
    if (alleleView === 'length') visibleOrigin = 'total-length'
    if (alleleView === 'exact-motif') visibleOrigin = 'motif-occurrence'
    if (
      activeIndexSelection &&
      ['total-length', 'motif-occurrence'].includes(activeIndexSelection.origin) &&
      activeIndexSelection.origin !== visibleOrigin
    ) {
      setIndexSelection(null)
    }
    if (!measuresLength(measure) && activeIndexSelection?.origin === 'genotype-length') {
      setIndexSelection(null)
    }
  }
  const filterIndexToPurityPoints = (points: PurityPoint[]) => {
    if (!points.length) return
    const deltas = points.map((point) => point.delta)
    const purities = points.map((point) => point.motif_purity)
    activateIndexSelection({
      scope,
      origin: 'purity',
      markIds: points.map((point) => `purity:${point.allele_id}`),
      alleleIds: uniqueIds(points.map((point) => point.allele_id)),
      label:
        points.length === 1
          ? alleleLabel(points[0].allele_id)
          : `purity region ${lengthAxisLabel(
              Math.min(...deltas),
              lengthAxisMode,
              representedRefLength
            )} through ${lengthAxisLabel(
              Math.max(...deltas),
              lengthAxisMode,
              representedRefLength
            )}, purity ${Math.min(...purities).toFixed(4)} through ${Math.max(...purities).toFixed(
              4
            )}`,
    })
  }
  const filterIndexToGenotypeCells = (
    selectedCells: Array<{
      markId: string
      shorterDelta: number
      longerDelta: number
      pairs: ExactGenotypePair[]
    }>
  ) => {
    if (!selectedCells.length) return
    const shorter = selectedCells.map((cell) => cell.shorterDelta)
    const longer = selectedCells.map((cell) => cell.longerDelta)
    const referenceId = admittedGenotypeLandscape?.reference_allele_id
    const alleleIds = uniqueIds(
      selectedCells.flatMap((cell) =>
        cell.pairs.flatMap((pair) => [pair.shorter_allele_id, pair.longer_allele_id])
      )
    ).filter((alleleId) => alleleId !== referenceId)
    const first = selectedCells[0]
    activateIndexSelection({
      scope,
      origin: 'genotype-length',
      markIds: selectedCells.map((cell) => cell.markId),
      alleleIds,
      label:
        selectedCells.length === 1
          ? `selected genotype cell (${lengthAxisLabel(
              first.longerDelta,
              lengthAxisMode,
              representedRefLength
            )} × ${lengthAxisLabel(first.shorterDelta, lengthAxisMode, representedRefLength)})`
          : `genotype region longer ${lengthAxisLabel(
              Math.min(...longer),
              lengthAxisMode,
              representedRefLength
            )} through ${lengthAxisLabel(
              Math.max(...longer),
              lengthAxisMode,
              representedRefLength
            )}; shorter ${lengthAxisLabel(
              Math.min(...shorter),
              lengthAxisMode,
              representedRefLength
            )} through ${lengthAxisLabel(
              Math.max(...shorter),
              lengthAxisMode,
              representedRefLength
            )}`,
    })
  }
  const clearIndexFilter = () => {
    setIndexSelection(null)
    focusIndex()
  }
  useEffect(() => {
    if (previousScopeKey.current !== scopeKey) {
      previousScopeKey.current = scopeKey
      setIndexSelection(null)
    }
  }, [scopeKey])
  const totalLengthBrushMarks: DiscreteBrushMark<AlleleBin>[] = bins.map((bin) => ({
    id: `total-length:${bin.delta}`,
    x: bin.delta,
    y: 0,
    value: bin,
  }))
  const totalLengthBrush = useDiscretePlotBrush({
    marks: totalLengthBrushMarks,
    axis: 'x',
    // A bar holding only REF copies has no ALT alleles to filter the index to.
    onSelect: (selection) =>
      filterIndexToLengthBins(selection.marks.filter((bin) => bin.allele_ids.length > 0)),
    onClear: clearIndexFilter,
  })
  const selectedLengthMarkIndices = totalLengthBrushMarks
    .map((mark, index) =>
      activeMarkIds.has(mark.id) || totalLengthBrush.previewMarkIds.has(mark.id) ? index : -1
    )
    .filter((index) => index >= 0)
  const measureControl = measureChoices.length > 1 && (
    <LengthAxisControl>
      Length axis
      <Select
        aria-label="Length axis"
        value={selectedMeasure}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
          selectMeasure(event.target.value as LandscapeMeasure)
        }
      >
        {measureChoices.map((measure) => (
          <option key={measure} value={measure}>
            {landscapeMeasureLabel(measure)}
          </option>
        ))}
      </Select>
    </LengthAxisControl>
  )

  if (landscape.status !== 'AVAILABLE') {
    return (
      <Panel aria-labelledby="lr-tr-allele-landscape-heading">
        <HeadingWithHelp>
          <h2 id="lr-tr-allele-landscape-heading">Allelic Landscape</h2>
          <AllelicLandscapeHelp
            showRepeatCountControls={Boolean(admittedRepeatCountPlots)}
            primaryMotifMeasurement={admittedPrimaryMotifMeasurement}
          />
        </HeadingWithHelp>
        <DistributionControls aria-label="Allelic Landscape measurement controls">
          {measureControl}
        </DistributionControls>
        <PlotGrid
          $plotCount={visiblePlotCount}
          data-plot-count={visiblePlotCount}
          data-testid="whole-record-allele-plot-grid"
        >
          {selectedAlleleDistributionView === 'repeat-count' && admittedRepeatCountPlots && (
            <RepeatCountPlotCard
              variantId={repeatCountVariantId}
              repeatCountPlots={shiftedRepeatCountPlots}
              kind="allele"
            />
          )}
          {selectedAlleleDistributionView === 'exact-motif' && admittedPrimaryMotifMeasurement && (
            <PrimaryMotifAllelePlotCard measurement={shiftedPrimaryMotifMeasurement} />
          )}
          {!selectedAlleleDistributionView && (
            <PlotCard data-plot-card="total-length-histogram">
              <h3>Allele length distribution</h3>
              <p role="status">
                Allele distribution unavailable: {unavailableReason(landscape.reason_code)}.
              </p>
            </PlotCard>
          )}
          {selectedGenotypeDistributionView === 'length' && admittedGenotypeLandscape && (
            <WholeRecordGenotypeLandscape
              landscape={admittedGenotypeLandscape}
              selectedPopulation={selectedPopulation}
              selectedSex={selectedSex}
            />
          )}
          {selectedGenotypeDistributionView === 'repeat-count' && admittedRepeatCountPlots && (
            <RepeatCountPlotCard
              variantId={repeatCountVariantId}
              repeatCountPlots={shiftedRepeatCountPlots}
              kind="genotype"
            />
          )}
          {selectedGenotypeDistributionView === 'exact-motif' && admittedPrimaryMotifGenotype && (
            <PrimaryMotifGenotypeCells measurement={shiftedPrimaryMotifGenotype} />
          )}
          <PlotCard data-plot-card="motif-purity">
            <h3>Length × motif purity</h3>
            <p role="status">
              Motif purity unavailable: {unavailableReason(landscape.reason_code)}.
            </p>
          </PlotCard>
        </PlotGrid>
        <ExactAlleleIndex
          alleles={alleles}
          motifs={motifs}
          selectedAllele={selectedAllele}
          navigation={navigation}
          selectedAlleleDetail={selectedAlleleDetail}
          sequencesAvailable={sequencesAvailable}
          sequencesUnavailableReason={sequencesUnavailableReason}
          sequenceCardinality={sequenceCardinality}
          sourceRecordOrder={sourceRecordOrder}
          excludeValidatedSharedPadding={excludeValidatedSharedPadding}
          lengthAxisMode={lengthAxisMode}
          representedRefLength={representedRefLength}
        />
      </Panel>
    )
  }

  const setSelectedColorBy = (colorBy: ColorBy | null) => {
    if (selectedScaleType === 'log' && !logScaleAllowed(colorBy)) setSelectedScaleType('linear')
    rawSetSelectedColorBy(colorBy)
  }
  const alleleCopiesInView = (bin: AlleleBin) => {
    if (!filterContract) return binCount(bin, selectedPopulation, selectedSex)
    if (!contractSelectionActive) return bin.called_alleles
    return bin.stacks
      .filter(matchingContractFrequencyKeys)
      .reduce((sum, stack) => sum + stack.called_alleles, 0)
  }
  const counts = bins.map(alleleCopiesInView)
  // REF copies join the bar at 0 bp change, stacked above any ALT copies of the same length.
  const referenceCopiesInView = alleleCopiesInView(referenceBin)
  const referenceCounts = bins.map((bin) => (bin.delta === 0 ? referenceCopiesInView : 0))
  const barTotals = counts.map((count, index) => count + referenceCounts[index])
  const maxCount = Math.max(0, ...barTotals)
  const yTicks = histogramTicks(maxCount, selectedScaleType)
  let colorCategories: { id: string; label: string; group?: LongReadTrFilterGroup }[] = []
  if (filterContract) {
    if (selectedColorBy === 'sex') {
      colorCategories = admittedSexGroups
        .filter((group) => !selectedContractSex || group.id === selectedContractSex.id)
        .map((group) => ({ id: group.id, label: group.label, group }))
    }
    if (selectedColorBy === 'population') {
      colorCategories = admittedAncestryGroups
        .filter((group) => !selectedContractAncestry || group.id === selectedContractAncestry.id)
        .map((group) => ({ id: group.id, label: group.label, group }))
    }
  } else {
    if (selectedColorBy === 'sex') {
      colorCategories = (landscape.sexes || []).map((category) => ({
        id: category,
        label: category === 'unknown' ? 'Unknown' : category,
      }))
    }
    if (selectedColorBy === 'population') {
      colorCategories = (landscape.ancestry_groups || []).map((category) => ({
        id: category,
        label: longReadAncestryGroupDisplayName(category),
      }))
    }
  }
  const segmentsForBin = (bin: AlleleBin) =>
    colorCategories.map((category) => {
      const matchingStacks = bin.stacks.filter((stack) => {
        if (!category.group) {
          return selectedColorBy === 'sex'
            ? stack.sex === category.id && stack.ancestry_group === (selectedPopulation || null)
            : stack.ancestry_group === category.id && stack.sex === (selectedSex || null)
        }
        const sourceKey = stackSourceKey(stack)
        if (!sourceKey || !category.group.source_frequency_keys.includes(sourceKey)) return false
        if (
          selectedColorBy === 'sex' &&
          ((selectedContractAncestry &&
            !selectedContractAncestry.source_frequency_keys.includes(sourceKey)) ||
            (!selectedContractAncestry && stack.ancestry_group))
        ) {
          return false
        }
        if (
          selectedColorBy === 'population' &&
          ((selectedContractSex &&
            !selectedContractSex.source_frequency_keys.includes(sourceKey)) ||
            (!selectedContractSex && stack.sex))
        ) {
          return false
        }
        return true
      })
      const colorKey =
        matchingStacks[0]?.[selectedColorBy === 'sex' ? 'sex' : 'ancestry_group'] || category.id
      return {
        category: category.id,
        color: stackColorFor(selectedColorBy, colorKey),
        count: matchingStacks.reduce((sum, stack) => sum + stack.called_alleles, 0),
      }
    })
  const clippedAt = scaleCap(selectedScaleType)
  const totalInView = barTotals.reduce((sum, count) => sum + count, 0)
  // Taken from the genotype plot under the same ancestry and sex filters. At loci where people
  // carry REF alleles or have only one allele called, these people contribute more allele copies
  // than the histogram plots.
  const genotypePeopleInView = admittedGenotypeLandscape
    ? genotypeLandscapePeopleCount(
        admittedGenotypeLandscape.cells || [],
        selectedPopulation ? [selectedPopulation] : [],
        selectedSex ? [selectedSex] : []
      )
    : null
  let histogramLayout = { barWidth: 24, gap: 2, height: 260 }
  if (bins.length <= 3) histogramLayout = { barWidth: 48, gap: 10, height: 190 }
  else if (bins.length <= 12) histogramLayout = { barWidth: 34, gap: 6, height: 220 }
  else if (bins.length <= 40) histogramLayout = { barWidth: 24, gap: 3, height: 240 }
  const activeFilterDescription = selectedDelta == null ? activeIndexSelection?.label : undefined

  return (
    <Panel aria-labelledby="lr-tr-allele-landscape-heading">
      <HeadingWithHelp>
        <h2 id="lr-tr-allele-landscape-heading">Allelic Landscape</h2>
        <AllelicLandscapeHelp
          showRepeatCountControls={Boolean(admittedRepeatCountPlots)}
          showLengthAxisControl={measureChoices.length > 1}
          showAncestryControl={showLegacyFilterControls || showContractAncestryControl}
          showSexControl={showLegacyFilterControls || showContractSexControl}
          showHistogramDisplayControl={showHistogramDisplayControl}
          primaryMotifMeasurement={admittedPrimaryMotifMeasurement}
        />
      </HeadingWithHelp>
      {showControlSection && (
        <LandscapeControls role="group" aria-label="Allelic Landscape controls">
          {measureControl}
          {showLegacyFilterControls && (
            <>
              <div
                role="group"
                aria-label="Shared ancestry and sex filters for visible allelic-landscape plots"
                style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
              >
                <ControlGroupLabel>Filter visible allelic-landscape plots:</ControlGroupLabel>
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
              {selectedAlleleDistributionView === 'length' && (
                <div
                  role="group"
                  aria-label="Total-length histogram display controls"
                  style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
                >
                  <ControlGroupLabel>Total-length histogram display:</ControlGroupLabel>
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
              )}
            </>
          )}
          {(showContractAncestryControl || showContractSexControl) && (
            <ContractControlGroup
              role="group"
              aria-label="API-admitted ancestry and sex filters for visible allelic-landscape plots"
            >
              <ControlGroupLabel>Filter visible allelic-landscape plots:</ControlGroupLabel>
              {showContractAncestryControl && (
                <ContractSelect>
                  Genetic ancestry group
                  <select
                    aria-label="Genetic ancestry group"
                    value={selectedContractAncestryId || ''}
                    onChange={(event) => setSelectedContractAncestryId(event.target.value || null)}
                  >
                    <option value="">Global</option>
                    {admittedAncestryGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </ContractSelect>
              )}
              {showContractSexControl && (
                <ContractSelect>
                  Sex
                  <select
                    aria-label="Sex"
                    value={selectedContractSexId || ''}
                    onChange={(event) => setSelectedContractSexId(event.target.value || null)}
                  >
                    <option value="">All</option>
                    {admittedSexGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </ContractSelect>
              )}
            </ContractControlGroup>
          )}
          {contractColorBys.length > 0 && selectedAlleleDistributionView === 'length' && (
            <div
              role="group"
              aria-label="Total-length histogram display controls"
              style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
            >
              <ControlGroupLabel>Total-length histogram display:</ControlGroupLabel>
              <ShortTandemRepeatColorBySelect
                id="lr-tr-whole-record"
                selectedColorBy={selectedColorBy}
                setSelectedColorBy={setSelectedColorBy}
                setSelectedScaleType={setSelectedScaleType}
                allowedColorBys={contractColorBys}
              />
              <ShortTandemRepeatScaleSelect
                id="lr-tr-whole-record"
                selectedScaleType={selectedScaleType}
                setSelectedScaleType={setSelectedScaleType}
                selectedColorBy={selectedColorBy}
              />
            </div>
          )}
        </LandscapeControls>
      )}
      {!landscape.stratified_available && !filterContract && (
        <p role="status">
          Stratified controls are unavailable:{' '}
          {unavailableReason(landscape.stratified_unavailable_reason)}.
        </p>
      )}
      {selectedColorBy && selectedAlleleDistributionView === 'length' && (
        <p aria-label="Stack color legend">
          <strong>Stack colors:</strong>{' '}
          {colorCategories.map((category, index) => {
            const segment = bins
              .flatMap(segmentsForBin)
              .find((item) => item.category === category.id)
            const color = segment?.color || stackColorFor(selectedColorBy, category.id)
            return (
              <React.Fragment key={category.id}>
                {index > 0 && ', '}
                <span aria-label={`${category.label} stack color`} data-stack-color={color}>
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
                  {category.label}
                </span>
              </React.Fragment>
            )
          })}
        </p>
      )}
      {selectedAlleleDistributionView === 'length' &&
        clippedAt &&
        barTotals.some((count) => count > clippedAt) && (
          <p role="status">
            Bars above {clippedAt.toLocaleString()} copies are clipped; exact counts remain in
            labels and tables.
          </p>
        )}
      <PlotGrid
        $plotCount={visiblePlotCount}
        data-plot-count={visiblePlotCount}
        data-testid="whole-record-allele-plot-grid"
      >
        {selectedAlleleDistributionView === 'repeat-count' && admittedRepeatCountPlots && (
          <RepeatCountPlotCard
            variantId={repeatCountVariantId}
            repeatCountPlots={shiftedRepeatCountPlots}
            kind="allele"
          />
        )}
        {selectedAlleleDistributionView === 'exact-motif' &&
          admittedMotifDistribution &&
          selectedMotifDistribution && (
            <MotifOccurrencePlotCard
              motifs={admittedMotifDistribution.motifs.map((entry) => entry.motif)}
              selectedMotifIndex={selectedMotifIndex}
              bins={selectedMotifDistribution.bins}
              activeMarkIds={activeMarkIds}
              onSelectMotifIndex={selectMotifIndex}
              onSelectBins={(selectedBins) =>
                filterIndexToMotifBins(selectedMotifIndex, selectedBins)
              }
              onClear={clearIndexFilter}
            />
          )}
        {selectedAlleleDistributionView === 'exact-motif' &&
          !admittedMotifDistribution &&
          admittedPrimaryMotifMeasurement && (
            <PrimaryMotifAllelePlotCard measurement={shiftedPrimaryMotifMeasurement} />
          )}
        {selectedAlleleDistributionView === 'length' && (
          <PlotCard data-plot-card="total-length-histogram">
            <h3>Allele length distribution</h3>
            <p aria-live="polite">
              <strong>
                Sizes of {counted(totalInView, 'allele', 'alleles')}
                {genotypePeopleInView != null &&
                  ` from ${counted(genotypePeopleInView, 'individual', 'individuals')}`}
                .
              </strong>
            </p>
            {referenceBin.called_alleles > 0 && (
              <p aria-label="Allele length histogram colors">
                <AlleleSizeColorSwatch aria-hidden="true" $color={REF_ALLELE_SIZE_BAR_COLOR} />
                REF allele
                {!selectedColorBy && (
                  <>
                    {' '}
                    <AlleleSizeColorSwatch
                      aria-hidden="true"
                      $color={ALT_ALLELE_SIZE_BAR_COLOR}
                      style={{ marginLeft: 10 }}
                    />
                    ALT alleles
                  </>
                )}
              </p>
            )}
            <MeasuredWidth>
              {(measuredWidth) => {
                const barWidth = filledBarWidth(measuredWidth, bins.length, histogramLayout)
                const histogramContentWidth =
                  bins.length * barWidth + Math.max(0, bins.length - 1) * histogramLayout.gap
                const histogramScrollableWidth = histogramContentWidth + HISTOGRAM_SIDE_PADDING * 2
                const deltaAxisTicks = histogramDeltaAxisTicks(
                  bins.map((bin) => bin.delta),
                  barWidth,
                  histogramLayout.gap,
                  selectedBin?.delta ?? null
                )
                const deltaAxisHeight =
                  AXIS_LABEL_FONT_PX +
                  15 +
                  Math.max(0, ...deltaAxisTicks.map((tick) => tick.lane)) *
                    HISTOGRAM_X_TICK_LANE_HEIGHT
                // A bar holding only REF copies is labeled "REF" above its count.
                const referenceOnlyBarShown = bins.some(
                  (bin, index) => bin.allele_ids.length === 0 && barTotals[index] > 0
                )
                const barLabelFontPx = countLabelFontPx(
                  barWidth,
                  Math.max(
                    referenceOnlyBarShown ? 'REF'.length : 1,
                    ...barTotals.map((total) => total.toLocaleString().length)
                  )
                )
                const barLabelHeadroom = Math.ceil(
                  (referenceOnlyBarShown ? 2 : 1) * 1.2 * barLabelFontPx + 6
                )
                return (
                  <HistogramSizer>
                    <HistogramChartWithXAxisTitle
                      data-bin-count={bins.length}
                      data-bar-width={barWidth}
                    >
                      <HistogramYScale
                        aria-hidden="true"
                        $height={histogramLayout.height}
                        style={{ marginTop: barLabelHeadroom }}
                      >
                        <AxisTitle># of alleles</AxisTitle>
                        {yTicks.map((tick) => (
                          <AxisTick
                            key={tick}
                            style={{
                              bottom: `${histogramHeightPercent(
                                tick,
                                maxCount,
                                selectedScaleType
                              )}%`,
                            }}
                          >
                            {tick.toLocaleString()}
                          </AxisTick>
                        ))}
                      </HistogramYScale>
                      <HistogramScroller
                        role="region"
                        aria-label={`Scrollable ${lengthAxisName.toLowerCase()} histogram`}
                        tabIndex={0}
                        data-testid="whole-record-delta-histogram-scroller"
                      >
                        <HistogramScrollContent
                          style={{ width: histogramScrollableWidth, paddingTop: barLabelHeadroom }}
                        >
                          <Histogram
                            aria-label={`${lengthAxisName} histogram`}
                            data-testid="whole-record-delta-histogram"
                            $height={histogramLayout.height}
                            $gap={histogramLayout.gap}
                            {...totalLengthBrush.containerProps}
                          >
                            {bins.map((bin, index) => {
                              const count = counts[index]
                              const referenceCount = referenceCounts[index]
                              const barTotal = barTotals[index]
                              // Only the bar holding the REF allele and no ALT allele has no ids.
                              const referenceOnly = bin.allele_ids.length === 0
                              const height = histogramHeightPercent(
                                barTotal,
                                maxCount,
                                selectedScaleType
                              )
                              const mark = totalLengthBrushMarks[index]
                              const markProps = totalLengthBrush.markProps(mark)
                              const selected =
                                activeMarkIds.has(mark.id) ||
                                totalLengthBrush.previewMarkIds.has(mark.id)
                              const lengthLabel = lengthAxisLabel(
                                bin.delta,
                                lengthAxisMode,
                                representedRefLength
                              )
                              const referenceCopiesText = counted(
                                referenceCount,
                                'REF allele copy',
                                'REF allele copies'
                              )
                              const altSummary = `${calledAlleleCopies(
                                count,
                                true
                              )} in this view; ${exactAltSequences(bin.exact_alt_count)}`
                              let ariaLabel = `${lengthLabel}; ${referenceCopiesText} in this view`
                              if (!referenceOnly) {
                                ariaLabel = `${lengthLabel}; ${
                                  referenceCount > 0 ? `${referenceCopiesText}; ` : ''
                                }${altSummary}; filter the source-ALT index to this length bin`
                              }
                              const barTitle = [
                                lengthLabel,
                                referenceOnly || referenceCount > 0 ? referenceCopiesText : null,
                                referenceOnly ? null : calledAlleleCopies(count, true),
                                referenceOnly ? null : exactAltSequences(bin.exact_alt_count),
                              ]
                                .filter(Boolean)
                                .join(' · ')
                              return (
                                <BarButton
                                  key={bin.delta}
                                  data-discrete-brush-id={markProps['data-discrete-brush-id']}
                                  type="button"
                                  disabled={referenceOnly}
                                  $height={height}
                                  $hasValue={barTotal > 0}
                                  $width={barWidth}
                                  $fill={
                                    referenceOnly
                                      ? REF_ALLELE_SIZE_BAR_COLOR
                                      : ALT_ALLELE_SIZE_BAR_COLOR
                                  }
                                  $selectedFill={SELECTED_ALLELE_SIZE_BAR_COLOR}
                                  data-height-percent={height.toFixed(3)}
                                  data-bar-width={barWidth}
                                  $selected={selected}
                                  aria-pressed={selected}
                                  aria-label={ariaLabel}
                                  title={barTitle}
                                  onClick={(event) => {
                                    if (!markProps.onClick(event)) filterIndexToLengthBins([bin])
                                  }}
                                  onKeyDown={(event) => markProps.onKeyDown(event)}
                                >
                                  {/* A bar with both kinds of copies stacks orange REF above
                                      the ALT copies, which keep the colors of the other bars. */}
                                  {!referenceOnly &&
                                    barTotal > 0 &&
                                    (selectedColorBy || referenceCount > 0) && (
                                      <BarSegments aria-hidden="true">
                                        {selectedColorBy ? (
                                          segmentsForBin(bin).map((segment) => (
                                            <span
                                              key={segment.category}
                                              style={{
                                                flexGrow: segment.count,
                                                background: segment.color,
                                                display: segment.count ? 'block' : 'none',
                                              }}
                                            />
                                          ))
                                        ) : (
                                          <span
                                            style={{
                                              flexGrow: count,
                                              background: selected
                                                ? SELECTED_ALLELE_SIZE_BAR_COLOR
                                                : ALT_ALLELE_SIZE_BAR_COLOR,
                                              display: count ? 'block' : 'none',
                                            }}
                                          />
                                        )}
                                        {referenceCount > 0 && (
                                          <span
                                            data-testid="reference-allele-segment"
                                            style={{
                                              flexGrow: referenceCount,
                                              background: REF_ALLELE_SIZE_BAR_COLOR,
                                            }}
                                          />
                                        )}
                                      </BarSegments>
                                    )}
                                  <BarExactCount
                                    style={{ fontSize: barLabelFontPx }}
                                    title={
                                      referenceOnly
                                        ? referenceCopiesText
                                        : `${counted(
                                            barTotal,
                                            'allele',
                                            'alleles'
                                          )} · ${exactAltSequences(bin.exact_alt_count)}`
                                    }
                                  >
                                    {/* The label is the bar height: alleles in this view. */}
                                    {referenceOnly && (
                                      <>
                                        REF
                                        <br />
                                      </>
                                    )}
                                    {barTotal.toLocaleString()}
                                  </BarExactCount>
                                  {(index === Math.min(...selectedLengthMarkIndices) ||
                                    index === Math.max(...selectedLengthMarkIndices)) && (
                                    <HistogramSelectionBoundary
                                      aria-hidden="true"
                                      data-testid="total-length-selection-boundary"
                                      $height={histogramLayout.height}
                                      $start={index === Math.min(...selectedLengthMarkIndices)}
                                      $stop={index === Math.max(...selectedLengthMarkIndices)}
                                    />
                                  )}
                                </BarButton>
                              )
                            })}
                          </Histogram>
                          <HistogramXAxis
                            role="group"
                            aria-label={`${lengthAxisName} axis`}
                            data-testid="whole-record-delta-axis"
                            $height={deltaAxisHeight}
                            $width={histogramScrollableWidth}
                          >
                            {deltaAxisTicks.map((tick) => (
                              <HistogramXTick
                                key={tick.delta}
                                aria-label={`${lengthAxisValue(
                                  tick.delta,
                                  lengthAxisMode,
                                  representedRefLength
                                ).toLocaleString()} bp tick`}
                                data-delta={tick.delta}
                                data-testid="whole-record-delta-axis-tick"
                                $lane={tick.lane}
                                $left={tick.left + HISTOGRAM_SIDE_PADDING}
                              >
                                {lengthAxisMode === 'absolute'
                                  ? lengthAxisValue(
                                      tick.delta,
                                      lengthAxisMode,
                                      representedRefLength
                                    ).toLocaleString()
                                  : signed(tick.delta)}
                              </HistogramXTick>
                            ))}
                          </HistogramXAxis>
                        </HistogramScrollContent>
                      </HistogramScroller>
                    </HistogramChartWithXAxisTitle>
                    <HistogramXAxisTitle aria-hidden="true">
                      {lengthAxisTitle('Allele', lengthAxisMode)}
                    </HistogramXAxisTitle>
                  </HistogramSizer>
                )
              }}
            </MeasuredWidth>
          </PlotCard>
        )}
        {selectedGenotypeDistributionView === 'length' && admittedGenotypeLandscape && (
          <WholeRecordGenotypeLandscape
            landscape={admittedGenotypeLandscape}
            selectedPopulation={selectedPopulation}
            selectedSex={selectedSex}
            selectedPopulations={selectedGenotypeAncestries}
            selectedSexes={selectedGenotypeSexes}
            activeMarkIds={activeMarkIds}
            onSelectCells={filterIndexToGenotypeCells}
            onClear={clearIndexFilter}
            lengthAxisMode={lengthAxisMode}
            representedRefLength={representedRefLength}
          />
        )}
        {selectedGenotypeDistributionView === 'repeat-count' && admittedRepeatCountPlots && (
          <RepeatCountPlotCard
            variantId={repeatCountVariantId}
            repeatCountPlots={shiftedRepeatCountPlots}
            kind="genotype"
          />
        )}
        {selectedGenotypeDistributionView === 'exact-motif' && admittedPrimaryMotifGenotype && (
          <PrimaryMotifGenotypeCells measurement={shiftedPrimaryMotifGenotype} />
        )}
        <PlotCard data-plot-card="motif-purity">
          <h3>Length × motif purity</h3>
          {landscape.purity_available ? (
            <PurityScatter
              points={filteredPurityPoints}
              selectedAllele={selectedAllele}
              activeMarkIds={activeMarkIds}
              onSelectPoints={filterIndexToPurityPoints}
              onClear={clearIndexFilter}
              lengthAxisMode={lengthAxisMode}
              representedRefLength={representedRefLength}
            />
          ) : (
            <p role="status">
              Purity unavailable: {unavailableReason(landscape.purity_unavailable_reason)}.
            </p>
          )}
        </PlotCard>
      </PlotGrid>
      <ExactAlleleIndex
        alleles={indexedAlleles}
        totalExactAlts={landscape.exact_alt_count || alleles.length}
        filteredDelta={selectedBin?.delta}
        filterDescription={activeFilterDescription}
        motifs={motifs}
        selectedAllele={selectedAllele}
        navigation={navigation}
        selectedAlleleDetail={selectedAlleleDetail}
        selectedDivision={selectedDivision}
        sequenceCardinality={sequenceCardinality}
        sourceRecordOrder={sourceRecordOrder}
        excludeValidatedSharedPadding={excludeValidatedSharedPadding}
        lengthAxisMode={lengthAxisMode}
        representedRefLength={representedRefLength}
        sequencesAvailable={sequencesAvailable}
        sequencesUnavailableReason={sequencesUnavailableReason}
        headingRef={indexHeading}
        onClearFilter={clearIndexFilter}
      />
    </Panel>
  )
}

const HeatmapFigure = styled.figure`
  overflow-x: hidden;
  max-width: 100%;
  margin: 0;
  outline-offset: 2px;

  &:focus-visible {
    outline: 3px solid #111;
  }

  @media (max-width: 700px) {
    overflow-x: auto;
  }
`

// The heatmap SVG fills this box, so measuring the box gives the SVG's on-screen width.
const HeatmapSizer = styled.div`
  width: 100%;

  @media (max-width: 700px) {
    width: 520px;
    min-width: 520px;
  }
`

const HeatmapSvg = styled.svg`
  display: block;
  width: 100%;
  min-width: 0;
  height: auto;
  min-height: 300px;
  margin: 0 auto;

  [role='button']:focus-visible {
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
  font-size: ${AXIS_LABEL_FONT_PX}px;
`

const filteredPairs = (
  pairs: GenotypePair[],
  populations: readonly string[],
  sexes: readonly string[]
) =>
  pairs.filter(
    (pair) =>
      (!populations.length || populations.includes(pair.ancestry_group)) &&
      (!sexes.length || sexes.includes(pair.sex)) &&
      pair.people > 0
  )

// People in the genotype plot under the given filters. The allele card reuses this so both cards
// report the same number of individuals.
const genotypeLandscapePeopleCount = (
  cells: GenotypeCell[],
  populations: readonly string[],
  sexes: readonly string[]
) =>
  cells.reduce(
    (total, cell) =>
      total +
      filteredPairs(cell.pairs, populations, sexes).reduce((sum, pair) => sum + pair.people, 0),
    0
  )

export type ExactGenotypePair = Pick<
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

export type GenotypeBrushCell = {
  markId: string
  shorterDelta: number
  longerDelta: number
  pairs: ExactGenotypePair[]
}

export const WholeRecordGenotypeLandscape = ({
  landscape,
  selectedPopulation,
  selectedSex,
  selectedPopulations,
  selectedSexes,
  activeMarkIds = new Set<string>(),
  onSelectCells,
  onClear = () => {},
  lengthAxisMode = 'delta',
  representedRefLength = null,
}: {
  landscape: WholeRecordGenotypeLandscapeData
  selectedPopulation: PopulationId | null
  selectedSex: Sex | null
  selectedPopulations?: readonly string[]
  selectedSexes?: readonly string[]
  activeMarkIds?: Set<string>
  onSelectCells?: (cells: GenotypeBrushCell[]) => void
  onClear?: () => void
  lengthAxisMode?: LengthAxisMode
  representedRefLength?: number | null
}) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const activePopulations = selectedPopulations || (selectedPopulation ? [selectedPopulation] : [])
  const activeSexes = selectedSexes || (selectedSex ? [selectedSex] : [])
  const sourceCells = landscape.cells || []
  const cells = sourceCells
    .map((cell) => ({
      ...cell,
      selectedPairs: aggregateGenotypePairs(
        filteredPairs(cell.pairs, activePopulations, activeSexes)
      ),
    }))
    .map((cell) => ({
      ...cell,
      selectedPeople: cell.selectedPairs.reduce((sum, pair) => sum + pair.people, 0),
    }))
    .filter((cell) => cell.selectedPeople > 0)
  const brushCells: GenotypeBrushCell[] = cells.map((cell) => ({
    markId: `genotype-length:${cell.shorter_delta}/${cell.longer_delta}`,
    shorterDelta: cell.shorter_delta,
    longerDelta: cell.longer_delta,
    pairs: cell.selectedPairs,
  }))
  const brushMarks: DiscreteBrushMark<GenotypeBrushCell>[] = brushCells.map((cell) => ({
    id: cell.markId,
    x: cell.longerDelta,
    y: cell.shorterDelta,
    value: cell,
  }))
  const brush = useDiscretePlotBrush({
    marks: brushMarks,
    axis: 'xy',
    onSelect: (selection) => onSelectCells?.(selection.marks),
    onClear,
  })

  if (landscape.status !== 'AVAILABLE') {
    return (
      <PlotCard data-plot-card="total-length-genotype" data-testid="genotype-length-card">
        <h3>Genotype length distribution</h3>
        <p role="status">
          Genotype landscape unavailable: {unavailableReason(landscape.reason_code)}.
        </p>
      </PlotCard>
    )
  }

  const values = [
    ...new Set([0, ...sourceCells.flatMap((cell) => [cell.shorter_delta, cell.longer_delta])]),
  ].sort((a, b) => a - b)
  const maxPeople = Math.max(1, ...cells.map((cell) => cell.selectedPeople))
  const keyFor = (cell: GenotypeCell) => `${cell.shorter_delta}/${cell.longer_delta}`
  const selectedCell = cells.find((cell) => keyFor(cell) === selectedKey) || cells[0]
  const totalPeople = genotypeLandscapePeopleCount(sourceCells, activePopulations, activeSexes)
  const byCoordinate = new Map(cells.map((cell) => [keyFor(cell), cell]))
  const heatmapWidth = 720
  const heatmapHeight = 650
  const heatmapTop = 18
  const heatmapRight = 18
  const valueIndex = new Map(values.map((value, index) => [value, index]))
  // Tick candidates in priority order: REF, the selected square, the two ends, then the rest.
  // A tick is drawn only if it clears the labels already placed, so labels never overlap.
  const axisValueCandidates = [
    ...new Set(
      [
        0,
        selectedCell?.shorter_delta,
        selectedCell?.longer_delta,
        values[0],
        values[values.length - 1],
        ...values,
      ].filter((value): value is number => value != null && valueIndex.has(value))
    ),
  ]
  const axisValueLabel = (value: number) =>
    lengthAxisMode === 'absolute'
      ? lengthAxisValue(value, lengthAxisMode, representedRefLength).toLocaleString()
      : signed(value)
  const longestAxisValueLabelLength = Math.max(
    1,
    ...values.map((value) => axisValueLabel(value).length)
  )
  const selectedBrushCells = brushCells.filter(
    (cell) => activeMarkIds.has(cell.markId) || brush.previewMarkIds.has(cell.markId)
  )
  const selectedRange = selectedBrushCells.length
    ? {
        minimumLonger: Math.min(...selectedBrushCells.map((cell) => cell.longerDelta)),
        maximumLonger: Math.max(...selectedBrushCells.map((cell) => cell.longerDelta)),
        minimumShorter: Math.min(...selectedBrushCells.map((cell) => cell.shorterDelta)),
        maximumShorter: Math.max(...selectedBrushCells.map((cell) => cell.shorterDelta)),
      }
    : null
  const selectCell = (cell: (typeof cells)[number], key: string) => {
    setSelectedKey(key)
    onSelectCells?.([
      {
        markId: `genotype-length:${key}`,
        shorterDelta: cell.shorter_delta,
        longerDelta: cell.longer_delta,
        pairs: cell.selectedPairs,
      },
    ])
  }

  return (
    <>
      <PlotCard data-plot-card="total-length-genotype" data-testid="genotype-length-card">
        <h3>Genotype length distribution</h3>
        <p aria-live="polite">
          <strong>
            Biallelic genotypes for {counted(totalPeople, 'individual', 'individuals')}
          </strong>
        </p>
        <HeatmapFigure role="region" aria-label="Genotype length distribution plot" tabIndex={0}>
          <MeasuredWidth>
            {(svgWidth) => {
              // The SVG scales with the card, so axis text is sized in SVG units that render at
              // AXIS_LABEL_FONT_PX on screen. A measured width of 0 (first render, jsdom) uses 1:1.
              const svgUnitsPerPixel = svgWidth > 0 ? heatmapWidth / svgWidth : 1
              const axisFontSize = AXIS_LABEL_FONT_PX * svgUnitsPerPixel
              // Tabular digits are about 0.62em wide.
              const longestAxisValueLabelWidth = longestAxisValueLabelLength * 0.62 * axisFontSize
              const yAxisTitleX = 0.8 * axisFontSize + 4 * svgUnitsPerPixel
              const yTickLabelGap = 7 * svgUnitsPerPixel
              const heatmapLeft =
                yAxisTitleX +
                0.25 * axisFontSize +
                8 * svgUnitsPerPixel +
                longestAxisValueLabelWidth +
                yTickLabelGap
              const xTickLabelOffset = axisFontSize + 5 * svgUnitsPerPixel
              // x tick labels are rotated 48 degrees and end at their anchor point, so they reach
              // width * sin(48) below it, plus a little for the glyphs' descent.
              const heatmapBottom =
                xTickLabelOffset +
                longestAxisValueLabelWidth * 0.74 +
                axisFontSize * 0.25 +
                4 * svgUnitsPerPixel +
                axisFontSize +
                8 * svgUnitsPerPixel
              const plotSize = Math.min(
                heatmapWidth - heatmapLeft - heatmapRight,
                heatmapHeight - heatmapTop - heatmapBottom
              )
              const band = plotSize / Math.max(1, values.length)
              const xFor = (value: number) => heatmapLeft + (valueIndex.get(value) || 0) * band
              const yFor = (value: number) =>
                heatmapTop + (values.length - 1 - (valueIndex.get(value) || 0)) * band
              // Neighboring x labels are rotated 48 degrees, so they need about 1.5 font sizes of
              // horizontal room to clear each other; the y labels need less, so one spacing fits both.
              const minimumAxisLabelSpacing = 1.5 * axisFontSize
              // People counts in the squares: one size for the plot, also short enough to fit the
              // square's height. When squares are too small even for the minimum size, the counts
              // are left to the squares' tooltips.
              const bandPx = band / svgUnitsPerPixel
              const longestCellLabelLength = Math.max(
                1,
                ...cells.map((cell) => String(cell.selectedPeople).length)
              )
              const cellLabelFontPx = Math.min(
                0.6 * bandPx,
                countLabelFontPx(bandPx, longestCellLabelLength)
              )
              const cellLabelFontSize = cellLabelFontPx * svgUnitsPerPixel
              const cellLabelsFit =
                cellLabelFontPx >= COUNT_LABEL_MIN_FONT_PX &&
                longestCellLabelLength * 0.6 * cellLabelFontPx <= 0.9 * bandPx
              const axisValues = axisValueCandidates
                .reduce<number[]>(
                  (placed, value) =>
                    placed.every(
                      (other) =>
                        Math.abs(valueIndex.get(value)! - valueIndex.get(other)!) * band >=
                        minimumAxisLabelSpacing
                    )
                      ? [...placed, value]
                      : placed,
                  []
                )
                .sort((left, right) => left - right)
              return (
                <HeatmapSizer>
                  <HeatmapSvg
                    viewBox={`0 0 ${heatmapWidth} ${heatmapHeight}`}
                    {...brush.containerProps}
                    role="group"
                    aria-label={`Genotype distribution by ${
                      lengthAxisMode === 'absolute'
                        ? 'represented allele length'
                        : 'change from REF'
                    }`}
                  >
                    <title>
                      Genotype distribution by longer and shorter{' '}
                      {lengthAxisMode === 'absolute'
                        ? 'represented allele length'
                        : 'change from REF'}
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
                      <g key={shorter}>
                        {values.map((longer) => {
                          const cell = byCoordinate.get(`${shorter}/${longer}`)
                          const key = `${shorter}/${longer}`
                          const markId = `genotype-length:${key}`
                          const mark = brushMarks.find((candidate) => candidate.id === markId)
                          const selected = Boolean(
                            cell && (activeMarkIds.has(markId) || brush.previewMarkIds.has(markId))
                          )
                          const intensity = cell
                            ? Math.log(cell.selectedPeople + 1) / Math.log(maxPeople + 1)
                            : 0
                          let cellFill = cell ? LONG_READ_PRIMARY_PLOT_COLOR : '#f5f7f8'
                          let cellFillOpacity = cell ? 0.15 + 0.85 * intensity : 1
                          if (selected) {
                            cellFill = '#e9781c'
                            cellFillOpacity = 1
                          }
                          const cellTextFill = !selected && intensity > 0.78 ? '#fff' : '#111'
                          return (
                            <React.Fragment key={key}>
                              <rect
                                x={xFor(longer) + 1}
                                y={yFor(shorter) + 1}
                                width={Math.max(1, band - 2)}
                                height={Math.max(1, band - 2)}
                                rx={Math.min(2, band / 8)}
                                fill={cellFill}
                                fillOpacity={cellFillOpacity}
                                stroke={selected ? '#6f3508' : '#fff'}
                                strokeWidth={selected ? 2 : 1}
                                pointerEvents="none"
                                aria-hidden="true"
                              />
                              {cell && cellLabelsFit && (
                                <text
                                  x={xFor(longer) + band / 2}
                                  y={yFor(shorter) + band / 2 + 0.35 * cellLabelFontSize}
                                  fill={cellTextFill}
                                  fontSize={cellLabelFontSize}
                                  textAnchor="middle"
                                  pointerEvents="none"
                                  aria-hidden="true"
                                >
                                  {cell.selectedPeople}
                                </text>
                              )}
                              {cell && (
                                <rect
                                  role="button"
                                  tabIndex={0}
                                  aria-pressed={selected}
                                  aria-label={`${lengthAxisLabel(
                                    longer,
                                    lengthAxisMode,
                                    representedRefLength
                                  )} longer allele, ${lengthAxisLabel(
                                    shorter,
                                    lengthAxisMode,
                                    representedRefLength
                                  )} shorter allele: ${cell.selectedPeople} ${
                                    cell.selectedPeople === 1 ? 'person' : 'people'
                                  }; filter the source-ALT index to this square`}
                                  data-testid="genotype-length-cell-target"
                                  data-discrete-brush-id={markId}
                                  x={xFor(longer) + band / 2 - 24}
                                  y={yFor(shorter) + band / 2 - 24}
                                  width={48}
                                  height={48}
                                  rx={2}
                                  fill="transparent"
                                  stroke="transparent"
                                  cursor="pointer"
                                  onClick={(event) => {
                                    if (!mark || !brush.markProps(mark).onClick(event)) {
                                      selectCell(cell, key)
                                    }
                                  }}
                                  onKeyDown={(event) => {
                                    if (mark && brush.markProps(mark).onKeyDown(event)) return
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault()
                                      selectCell(cell, key)
                                    }
                                  }}
                                >
                                  <title>
                                    {lengthAxisLabel(longer, lengthAxisMode, representedRefLength)}{' '}
                                    ×{' '}
                                    {lengthAxisLabel(shorter, lengthAxisMode, representedRefLength)}
                                    : {counted(cell.selectedPeople, 'person', 'people')}
                                  </title>
                                </rect>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </g>
                    ))}
                    {selectedRange && (
                      <rect
                        aria-hidden="true"
                        data-testid="genotype-length-selection-boundary"
                        x={xFor(selectedRange.minimumLonger) + 1}
                        y={yFor(selectedRange.maximumShorter) + 1}
                        width={
                          xFor(selectedRange.maximumLonger) -
                          xFor(selectedRange.minimumLonger) +
                          band -
                          2
                        }
                        height={
                          yFor(selectedRange.minimumShorter) -
                          yFor(selectedRange.maximumShorter) +
                          band -
                          2
                        }
                        fill="none"
                        stroke="#6f3508"
                        strokeWidth={3}
                        pointerEvents="none"
                      />
                    )}
                    {axisValues.map((value) => (
                      <React.Fragment key={value}>
                        <text
                          x={xFor(value) + band / 2}
                          y={heatmapTop + plotSize + xTickLabelOffset}
                          fill="#566168"
                          fontSize={axisFontSize}
                          textAnchor="end"
                          transform={`rotate(-48 ${xFor(value) + band / 2} ${
                            heatmapTop + plotSize + xTickLabelOffset
                          })`}
                        >
                          {axisValueLabel(value)}
                        </text>
                        <text
                          x={heatmapLeft - yTickLabelGap}
                          y={yFor(value) + band / 2 + 0.35 * axisFontSize}
                          fill="#566168"
                          fontSize={axisFontSize}
                          textAnchor="end"
                        >
                          {axisValueLabel(value)}
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
                      y={heatmapTop + plotSize + heatmapBottom - 8 * svgUnitsPerPixel}
                      fill="#566168"
                      fontSize={axisFontSize}
                      textAnchor="middle"
                    >
                      {lengthAxisTitle('Long Allele', lengthAxisMode)}
                    </text>
                    <text
                      x={yAxisTitleX}
                      y={heatmapTop + plotSize / 2}
                      fill="#566168"
                      fontSize={axisFontSize}
                      textAnchor="middle"
                      transform={`rotate(-90 ${yAxisTitleX} ${heatmapTop + plotSize / 2})`}
                    >
                      {lengthAxisTitle('Short Allele', lengthAxisMode)}
                    </text>
                  </HeatmapSvg>
                </HeatmapSizer>
              )
            }}
          </MeasuredWidth>
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
            <span>More people</span>
          </IntensityKey>
        </HeatmapFigure>
      </PlotCard>
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
  padding: 0.65em 0.8em;
  border: 1px solid #d8dee2;
  border-radius: 4px;
  margin: 0;
  background: #fbfcfd;
  color: #566168;
`

const indexColumns = 'minmax(150px, 1.3fr) minmax(120px, 1.4fr) 96px 90px 64px 50px 70px 68px'
const narrowIndexColumns = 'minmax(160px, 1fr) 68px'
const compactIndexColumns = 'minmax(115px, 1fr) 62px'

const SourceIdIndexCell = styled.code`
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 11px;
  white-space: normal;
`

const IndexTitle = styled.header`
  display: flex;
  flex-wrap: wrap;
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
  min-height: 44px;
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
    .lr-tr-index-represented-length,
    .lr-tr-index-length-change,
    .lr-tr-index-purity,
    .lr-tr-index-ac,
    .lr-tr-index-af {
      display: none;
    }
  }

  @media (max-width: 420px) {
    grid-template-columns: ${compactIndexColumns};
    column-gap: 0.4em;
    height: 52px;
    padding: 0 0.35em;
    line-height: 1.1;
  }
`

const IndexRow = styled.div<{ selected: boolean }>`
  /* stylelint-disable no-descending-specificity -- generated row classes isolate index cells. */
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
    .lr-tr-index-represented-length,
    .lr-tr-index-length-change,
    .lr-tr-index-purity,
    .lr-tr-index-ac,
    .lr-tr-index-af {
      display: none;
    }

    .lr-tr-index-source-id {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  @media (max-width: 420px) {
    grid-template-columns: ${compactIndexColumns};
    column-gap: 0.4em;
    padding: 0 0.35em;
  }
  /* stylelint-enable no-descending-specificity */
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

const ExactAlleleMotifPreview = ({
  allele,
  motifs,
  excludeValidatedSharedPadding = false,
}: {
  allele: LongReadTrAllele
  motifs: string[]
  excludeValidatedSharedPadding?: boolean
}) => {
  if (!allele.ref || !allele.alt || !excludeValidatedSharedPadding) {
    return (
      <span aria-label={`${alleleLabel(allele.variant_id)} motif preview unavailable`}>
        Unavailable
      </span>
    )
  }
  const preview = exactStoredMotifPreview({
    ref: allele.ref,
    alt: allele.alt,
    motifs,
    excludeValidatedSharedPadding,
  })
  if (preview.status !== 'available') {
    return (
      <span aria-label={`${alleleLabel(allele.variant_id)} motif preview unavailable`}>
        Unavailable
      </span>
    )
  }
  const totalBases = Math.max(1, preview.representedSequence.length)
  const countSummary = exactStoredMotifCountSummary(preview, motifs)
  let offset = 0
  return (
    <MotifPreview
      role="img"
      aria-label={`${alleleLabel(
        allele.variant_id
      )} exact stored-motif string preview; ${countSummary}`}
      viewBox={`0 0 ${totalBases} 18`}
      preserveAspectRatio="none"
    >
      {preview.segments.map((segment, segmentIndex) => {
        const start = offset
        offset += segment.sequence.length
        return (
          <rect
            // Sequence order is the stable identity for repeated literal motif occurrences.
            // eslint-disable-next-line react/no-array-index-key
            key={segmentIndex}
            x={start}
            y={0}
            width={segment.sequence.length}
            height={18}
            fill={
              segment.type === 'motif' ? motifColor(motifs[segment.motifIndex], motifs) : '#333'
            }
            data-motif-unit={segment.type === 'motif' ? 'true' : undefined}
            data-sequence-match={segment.type === 'motif' ? 'motif' : 'unmatched'}
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

type ExactAlleleSortKey = 'representedLength' | 'lengthChange' | 'purity' | 'ac' | 'af'
type ExactAlleleSortDirection = 'ascending' | 'descending'

type ExactAlleleIndexRowData = {
  alleles: LongReadTrAllele[]
  motifs: string[]
  selectedAllele?: string
  selectedDivision?: string | null
  navigation: AlleleNavigation
  excludeValidatedSharedPadding: boolean
  representedRefLength: number | null
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
  const lengthChange = allele.length == null ? '—' : signed(allele.length)
  const representedLength =
    allele.length == null || data.representedRefLength == null
      ? '—'
      : (data.representedRefLength + allele.length).toLocaleString()
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
      aria-label={`Source ALT ${allele.alt_index}; source ID ${allele.variant_id}; represented length ${representedLength}; change from REF ${lengthChange}; purity ${purity}; AC ${ac}; AF ${af}`}
      aria-rowindex={index + 2}
      title={allele.variant_id}
    >
      <SourceIdIndexCell className="lr-tr-index-source-id" role="cell">
        {allele.variant_id}
      </SourceIdIndexCell>
      <span className="lr-tr-index-preview" role="cell">
        <ExactAlleleMotifPreview
          allele={allele}
          motifs={data.motifs}
          excludeValidatedSharedPadding={data.excludeValidatedSharedPadding}
        />
      </span>
      <NumericIndexCell className="lr-tr-index-represented-length" role="cell">
        {representedLength}
      </NumericIndexCell>
      <NumericIndexCell className="lr-tr-index-length-change" role="cell">
        {lengthChange}
      </NumericIndexCell>
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
          aria-label={`Details for ${altLabel}`}
        >
          Details
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
  sequenceCardinality,
  sourceRecordOrder = [],
  excludeValidatedSharedPadding = false,
  lengthAxisMode = 'delta',
  representedRefLength = null,
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
  sequenceCardinality?: LongReadTrSequenceCardinality
  sourceRecordOrder?: string[]
  excludeValidatedSharedPadding?: boolean
  lengthAxisMode?: LengthAxisMode
  representedRefLength?: number | null
}) => {
  const [sortKey, setSortKey] = useState<ExactAlleleSortKey>('ac')
  const [sortDirection, setSortDirection] = useState<ExactAlleleSortDirection>('descending')
  const sortedAlleles = useMemo(() => {
    const sortValue = (allele: LongReadTrAllele): number | null | undefined => {
      if (sortKey === 'representedLength') {
        return representedRefLength == null || allele.length == null
          ? null
          : representedRefLength + allele.length
      }
      if (sortKey === 'lengthChange') return allele.length
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
      const leftRecordOrder = sourceRecordOrder.indexOf(left.source_variant_id)
      const rightRecordOrder = sourceRecordOrder.indexOf(right.source_variant_id)
      const sourceComparison =
        (leftRecordOrder < 0 ? Number.MAX_SAFE_INTEGER : leftRecordOrder) -
        (rightRecordOrder < 0 ? Number.MAX_SAFE_INTEGER : rightRecordOrder)
      return sourceComparison || left.alt_index - right.alt_index
    })
  }, [alleles, representedRefLength, selectedDivision, sortDirection, sortKey, sourceRecordOrder])
  const changeSort = (nextKey: ExactAlleleSortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'ascending' ? 'descending' : 'ascending'))
      return
    }
    setSortKey(nextKey)
    setSortDirection('descending')
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
    excludeValidatedSharedPadding,
    representedRefLength,
  }
  const hasMissingIndexSequence = alleles.some((allele) => !allele.ref || !allele.alt)
  const previewUnavailableMessage =
    hasMissingIndexSequence && !sequencesAvailable
      ? `Motif previews are unavailable because ${unavailableReason(sequencesUnavailableReason)}.`
      : null
  const identityCount = sequenceCardinality?.source_alt_identity_count ?? totalExactAlts
  let heading = counted(identityCount, 'source ALT allele', 'source ALT alleles')
  if (filterDescription) {
    heading = `${alleles.length.toLocaleString()} of ${counted(
      identityCount,
      'source ALT allele',
      'source ALT alleles'
    )} — ${filterDescription}`
  } else if (filteredDelta != null) {
    heading = `${alleles.length.toLocaleString()} of ${counted(
      identityCount,
      'source ALT allele',
      'source ALT alleles'
    )} at ${lengthAxisLabel(filteredDelta, lengthAxisMode, representedRefLength)}`
  }
  return (
    <IndexSection aria-labelledby="lr-tr-index-heading">
      <IndexTitle aria-live="polite">
        <HeadingWithHelp>
          <h3 id="lr-tr-index-heading" ref={headingRef} tabIndex={-1}>
            {heading}
          </h3>
          <ExactAlleleIndexHelp />
        </HeadingWithHelp>
        {(filteredDelta != null || filterDescription) && (
          <ClearIndexFilter type="button" onClick={onClearFilter}>
            Show all source ALT alleles
          </ClearIndexFilter>
        )}
      </IndexTitle>
      {(filteredDelta != null || filterDescription) && alleles.length === 0 && (
        <p role="status">No source ALT alleles match this plot selection in the current slice.</p>
      )}
      {previewUnavailableMessage && <p role="status">{previewUnavailableMessage}</p>}
      <AlleleBrowserGrid data-testid="lr-tr-exact-allele-browser">
        <IndexPane
          role="table"
          aria-label="Source ALT allele index"
          aria-rowcount={alleles.length + 1}
        >
          <IndexHeader role="row" aria-rowindex={1}>
            <span role="columnheader">Source ID</span>
            <span className="lr-tr-index-preview" role="columnheader">
              Motifs
            </span>
            {sortHeader(
              'representedLength',
              'Represented length (bp)',
              'lr-tr-index-represented-length',
              true
            )}
            {sortHeader('lengthChange', 'Change from REF (bp)', 'lr-tr-index-length-change', true)}
            {sortHeader('purity', 'Purity', 'lr-tr-index-purity', true)}
            {sortHeader('ac', 'AC', 'lr-tr-index-ac', true)}
            {sortHeader('af', 'AF', 'lr-tr-index-af', true)}
            <span role="columnheader">Details</span>
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
                ? 'Details for the selected ALT are unavailable.'
                : 'No sequence details shown. Choose Details in a row to view its sequence and aggregate annotations.'}
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

const HighlightedExactSequence = styled.div`
  overflow: auto;
  max-height: 220px;
  padding: 0.9em;
  border: 1px solid #d8dee2;
  border-radius: 3px;
  background: #fff;
`

const ExactStoredMotifSequence = ({
  segments,
  motifs,
  ariaLabel,
}: {
  segments: ExactStoredMotifSegment[]
  motifs: string[]
  ariaLabel: string
}) => (
  <div aria-label={ariaLabel} style={{ userSelect: 'text' }}>
    {segments.map((segment, segmentIndex) => {
      const label =
        segment.type === 'motif'
          ? `${motifs[segment.motifIndex]}, exact stored-motif string occurrence`
          : `${segment.sequence.length} unmatched ${
              segment.sequence.length === 1 ? 'base' : 'bases'
            }`
      const color =
        segment.type === 'motif' ? motifColor(motifs[segment.motifIndex], motifs) : '#333'
      const followsMotif = segmentIndex > 0 && segments[segmentIndex - 1].type === 'motif'
      return (
        <span
          // Source sequence order is stable and repeated literal occurrences remain distinct.
          // eslint-disable-next-line react/no-array-index-key
          key={segmentIndex}
          data-sequence-role={segment.type}
          aria-label={label}
        >
          {segment.sequence.split('').map((base, baseIndex) => {
            let borderRadius: string | number = 0
            if (baseIndex === 0) borderRadius = '2px 0 0 2px'
            else if (baseIndex === segment.sequence.length - 1) borderRadius = '0 2px 2px 0'
            const hasMotifSeparator = segment.type === 'motif' && followsMotif && baseIndex === 0
            return (
              <span
                // Base offset within one stable source segment is deterministic.
                // eslint-disable-next-line react/no-array-index-key
                key={baseIndex}
                data-sequence-match={segment.type === 'motif' ? 'motif' : 'unmatched'}
                data-motif-visual-separator={hasMotifSeparator ? 'true' : undefined}
                aria-label={segment.type === 'unmatched' ? `${base}, unmatched base` : undefined}
                style={{
                  display: 'inline-block',
                  width: 8,
                  // Visual separation only; no characters are inserted into the source sequence.
                  marginLeft: hasMotifSeparator ? 2 : 0,
                  borderRadius,
                  background: color,
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  lineHeight: '14px',
                  textAlign: 'center',
                }}
              >
                {base}
              </span>
            )
          })}
        </span>
      )
    })}
  </div>
)

const SelectedExactSequence = ({
  allele,
  motifs,
  excludeValidatedSharedPadding,
}: {
  allele: LongReadTrSelectedAllele
  motifs: string[]
  excludeValidatedSharedPadding: boolean
}) => {
  const preview = exactStoredMotifPreview({
    ref: allele.ref,
    alt: allele.alt,
    motifs,
    excludeValidatedSharedPadding,
  })
  const sequenceLabel = alleleLabel(allele.variant_id)
  const exactSequence = (
    <Sequence aria-label={`Exact copyable source sequence for ${sequenceLabel}`}>
      {allele.alt}
    </Sequence>
  )
  if (!excludeValidatedSharedPadding || preview.status !== 'available') return exactSequence

  const countSummary = exactStoredMotifCountSummary(preview, motifs)
  return (
    <>
      {exactSequence}
      <p style={{ marginBottom: 4 }}>
        <strong>Stored-motif matches</strong>
      </p>
      <HighlightedExactSequence>
        <ExactStoredMotifSequence
          segments={preview.segments}
          motifs={motifs}
          ariaLabel={`Exact stored-motif string preview for ${sequenceLabel}; ${countSummary}`}
        />
      </HighlightedExactSequence>
      <ScrollTable>
        <table aria-label="Exact motif match summary">
          <thead>
            <tr>
              <th scope="col">Motif</th>
              <th scope="col">Exact occurrences</th>
              <th scope="col">Matched bases</th>
            </tr>
          </thead>
          <tbody>
            {motifs.map((motif, motifIndex) => (
              <tr
                // Stored vocabulary position distinguishes intentional duplicate motif strings.
                // eslint-disable-next-line react/no-array-index-key
                key={`${motif}-${motifIndex}`}
              >
                <th scope="row">
                  <code>{motif}</code>
                </th>
                <td>{preview.occurrenceCounts[motifIndex].toLocaleString()}</td>
                <td>{preview.matchedBases[motifIndex].toLocaleString()}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Unmatched</th>
              <td>—</td>
              <td>{preview.unmatchedBases.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </ScrollTable>
    </>
  )
}

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

export const SelectedExactAlleleDetail = React.forwardRef<
  HTMLElement,
  {
    allele: LongReadTrSelectedAllele
    motifs: string[]
    representedLength?: LongReadTrRepresentedLength
  }
>(({ allele, motifs, representedLength }, ref) => (
  <SelectedDetail
    ref={ref}
    tabIndex={-1}
    aria-labelledby="lr-tr-selected-detail-heading"
    data-testid="lr-tr-selected-detail"
  >
    <HeadingWithHelp>
      <h3 id="lr-tr-selected-detail-heading">{allele.variant_id}</h3>
      <SelectedAlleleHelp />
    </HeadingWithHelp>
    <SelectedDetailGrid>
      <div>
        <p>
          {representedLength?.status === 'AVAILABLE_EXACT' &&
          representedLength.represented_ref_length_bp != null &&
          allele.length != null ? (
            <>
              <strong>
                {(representedLength.represented_ref_length_bp + allele.length).toLocaleString()} bp
                represented
              </strong>{' '}
              ({signed(allele.length)} bp vs REF)
            </>
          ) : (
            <strong>
              {allele.length == null
                ? 'Change from REF unavailable'
                : `${signed(allele.length)} bp vs REF`}
            </strong>
          )}{' '}
          · Stored {motifs.length === 1 ? 'motif' : 'motifs'}{' '}
          <code>{motifs.length ? motifs.join(', ') : 'unavailable'}</code>
        </p>
        <p style={{ marginBottom: 4 }}>
          <strong>Source ALT sequence</strong>
        </p>
        <SelectedExactSequence
          allele={allele}
          motifs={motifs}
          excludeValidatedSharedPadding={
            representedLength?.status === 'AVAILABLE_EXACT' &&
            representedLength.reconciliation_status === 'RECONCILED' &&
            representedLength.anchor_rule === 'VCF_SHARED_LEFT_PADDING_BASE_V1'
          }
        />
      </div>
      <ScrollTable role="region" aria-label="Selected exact ALT summary table" tabIndex={0}>
        <table>
          <tbody>
            <tr>
              <th scope="row">Total allele length change (ALT − REF, bp)</th>
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
          </tbody>
        </table>
      </ScrollTable>
    </SelectedDetailGrid>
  </SelectedDetail>
))

SelectedExactAlleleDetail.displayName = 'SelectedExactAlleleDetail'

export { Panel, signed, unavailableReason }
