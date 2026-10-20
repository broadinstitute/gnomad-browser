import React, { RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { FixedSizeList } from 'react-window'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { scaleLinear } from 'd3-scale'
import { ExternalLink, Modal, Select } from '@gnomad/ui'
import {
  MAX_MOTIF_LENGTH_TO_PRINT_IN_FULL,
  repeatCopyText,
  shortenLongMotifToItsEnds,
} from '@gnomad/dataset-metadata/longReadTrLocusPresentation'

import Link from '../Link'
import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import ShortTandemRepeatColorBySelect from '../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect'
import ShortTandemRepeatScaleSelect from '../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect'
import {
  ColorBy,
  ScaleType,
} from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import { logScaleAllowed } from '../ShortTandemRepeatPage/ShortTandemRepeatPage'
import {
  LongReadAlleleSizeDistributionSection,
  LongReadGenotypeDistributionSection,
} from '../LongReadVariantPage/LongReadSTRDistributionSections'
import HaplotypeHelpButton, { ModalZIndexFix } from '../Haplotypes/HelpButton'
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
  RepeatCountPlots,
  WholeRecordAlleleLandscapeData,
  WholeRecordGenotypeLandscapeData,
} from './types'
import {
  exactStoredMotifCountSummary,
  exactStoredMotifPreview,
  ExactStoredMotifSegment,
} from './exactStoredMotifPreview'
import {
  longestPureMotifRun,
  referenceRepeatSequence,
  sharedPaddingBaseValidated,
} from './referenceSequencePurity'
import {
  exactStoredMotifDistribution,
  ExactStoredMotifDistributionBin,
} from './exactStoredMotifDistribution'
import { DiscreteBrushMark, useDiscretePlotBrush } from './discretePlotBrush'
import { repeatPlotAvailable } from './SourceContextHistogram'
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

const ExactReferenceOutlineKey = styled.span`
  display: inline-block;
  box-sizing: border-box;
  width: 2.2em;
  height: 1em;
  border: 2px dotted #111;
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

/**
 * Pixels to add above each plot so that the x axes of plots side by side in one row of the plot
 * grid sit level with the lowest of them. Each plot gives the top of its card, which identifies
 * its row, and the page position of its x axis with nothing added.
 */
export const xAxisAlignmentPaddings = (plots: { cardTop: number; xAxisY: number }[]) => {
  const lowestXAxisYByRow = new Map<number, number>()
  plots.forEach(({ cardTop, xAxisY }) => {
    lowestXAxisYByRow.set(cardTop, Math.max(lowestXAxisYByRow.get(cardTop) ?? xAxisY, xAxisY))
  })
  return plots.map(({ cardTop, xAxisY }) => lowestXAxisYByRow.get(cardTop)! - xAxisY)
}

/**
 * Lines up the x axes of the plots in each row of a plot grid by adding space above the higher
 * ones. A plot takes part by marking the element to push down with data-x-axis-aligned-plot,
 * and an element inside it whose bottom edge is the x axis with data-x-axis-line. The plots'
 * heights depend on their cards' widths and on text that wraps, so this measures them after
 * layout and again whenever one of them resizes.
 */
const useAlignedPlotXAxes = (gridRef: RefObject<HTMLElement>) => {
  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return undefined
    const align = () => {
      const plots = Array.from(grid.querySelectorAll<HTMLElement>('[data-x-axis-aligned-plot]'))
      plots.forEach((plot) => {
        // eslint-disable-next-line no-param-reassign
        plot.style.paddingTop = ''
      })
      const measuredPlots = plots.flatMap((plot) => {
        const card = plot.closest('[data-plot-card]')
        const xAxisLine = plot.querySelector('[data-x-axis-line]')
        if (!card || !xAxisLine) return []
        return [
          {
            plot,
            cardTop: Math.round(card.getBoundingClientRect().top),
            xAxisY: xAxisLine.getBoundingClientRect().bottom,
          },
        ]
      })
      xAxisAlignmentPaddings(measuredPlots).forEach((padding, index) => {
        // Sub-pixel differences are rounding, not misalignment.
        if (padding >= 1) measuredPlots[index].plot.style.paddingTop = `${padding}px`
      })
    }
    align()
    if (typeof ResizeObserver === 'undefined') return undefined
    // Padding does not change an element's content box, so aligning does not retrigger this.
    const observer = new ResizeObserver(align)
    grid.querySelectorAll('[data-x-axis-aligned-plot]').forEach((plot) => observer.observe(plot))
    // The heatmap redraws its axis lines inside an SVG whose box keeps its size, for example
    // once it has measured its width, so the moving lines are watched directly.
    const axisLineObserver = new MutationObserver(align)
    axisLineObserver.observe(grid, {
      subtree: true,
      attributes: true,
      attributeFilter: ['y1', 'y2'],
    })
    return () => {
      observer.disconnect()
      axisLineObserver.disconnect()
    }
  })
}

const PlotCard = styled.div`
  position: relative;
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

// Each plot's Length axis menu sits at the bottom of its card, so the menus of cards in one row
// line up whatever each plot's height.
const PlotLengthAxisControl = styled(LengthAxisControl)`
  position: absolute;
  right: 1em;
  bottom: 1em;
  left: 1em;
  white-space: nowrap;

  /* The label stays on one line; in a narrow card the menu narrows instead. */
  select {
    min-width: 0;
    flex: 0 1 auto;
  }
`

// Keeps room at the bottom of the card for the Length axis menu placed there.
const PlotLengthAxisControlSpace = styled.div`
  height: 2.5em;
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

// Each landscape plot has its own measure menu, offering only the measures that plot can draw.
// The bp measures use the exact source length products; the repeat measures use whichever
// admitted repeat-unit product a plot has.
export type LandscapeMeasure = 'bp-absolute' | 'bp-delta' | 'repeats-absolute' | 'repeats-delta'

// The repeat measures show each allele's longest pure run: from the precomputed repeat-count
// histograms when a locus has them, and from the exact ALT sequences otherwise.
const landscapeMeasureLabel = (measure: LandscapeMeasure) => {
  if (measure === 'bp-absolute') return 'ALT allele size (bp)'
  if (measure === 'bp-delta') return 'ALT − REF allele size (bp)'
  if (measure === 'repeats-absolute') return 'ALT allele longest pure run (repeats)'
  return 'ALT − REF allele longest pure run (repeats)'
}

const measuresLength = (measure: LandscapeMeasure) =>
  measure === 'bp-absolute' || measure === 'bp-delta'

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

// Allele sizes are drawn in bp, or, for the precomputed repeat-count histograms, as each
// allele's longest pure run: its most consecutive exact copies of the motif.
type LengthUnit = 'bp' | 'longest-pure-run'

const lengthAxisLabel = (
  delta: number,
  mode: LengthAxisMode,
  representedRefLength: number | null,
  unit: LengthUnit = 'bp'
) => {
  const absolute = mode === 'absolute' && representedRefLength != null
  if (unit === 'bp') {
    return absolute
      ? `${(representedRefLength + delta).toLocaleString()} bp (${signed(delta)} bp vs REF)`
      : `${signed(delta)} bp vs REF`
  }
  // Without a known REF size, sizes are plain longest-pure-run counts, not changes from REF.
  if (mode === 'absolute' && representedRefLength == null) {
    return `${delta.toLocaleString()} copies in longest pure run`
  }
  return absolute
    ? `${(representedRefLength + delta).toLocaleString()} copies in longest pure run (${signed(
        delta
      )} vs REF)`
    : `${signed(delta)} copies in longest pure run vs REF`
}

// Axis title for an allele size axis, e.g. "Long Allele (bp)" or "Allele (longest pure run)".
const lengthAxisTitle = (allele: string, mode: LengthAxisMode, unit: LengthUnit = 'bp') => {
  const measure = unit === 'bp' ? 'bp' : 'longest pure run'
  return `${allele} (${mode === 'absolute' ? measure : `${measure} minus REF`})`
}

const counted = (count: number, singular: string, plural: string) =>
  `${count.toLocaleString()} ${count === 1 ? singular : plural}`

const calledAlleleCopies = (count: number, nonReference = false) =>
  counted(
    count,
    `called ${nonReference ? 'non-reference ' : ''}allele copy`,
    `called ${nonReference ? 'non-reference ' : ''}allele copies`
  )

const exactAltSequences = (count: number) =>
  counted(count, 'distinct ALT allele', 'distinct ALT alleles')
const UNAVAILABLE_REASON_COPY: Record<string, string> = {
  ADMITTED_HISTOGRAM_COULD_NOT_BE_VALIDATED:
    'the cohort-specific repeat-count source could not be validated',
  ALLELE_INDEX_SEQUENCE_BYTE_BOUND_EXCEEDED: 'the allele sequences are too large to preview safely',
  ALT_COUNT_EXCEEDS_2500: 'the locus has more than 2,500 ALT alleles, more than this page can show',
  BOUND_EXCEEDED: 'the result is too large to display safely',
  // HGSVC/HPRC purity is read from the per-person calls; AoU's comes from the source VCF.
  CARRIER_CALLS_NOT_AVAILABLE: 'the per-person calls for this cohort are not loaded',
  CARRIER_PURITY_ROW_BOUND_EXCEEDED: 'the locus has too many carriers to read purity from safely',
  EXACT_ALLELE_SEQUENCE_ANCHOR_NOT_RECONCILABLE:
    'the complete REF and ALT sequences do not share one validated VCF anchor',
  EXACT_ALT_LIMIT_EXCEEDED:
    'the locus has more alternate alleles than this view can display safely',
  // AoU purity comes from the source VCF's AP_allele, which it writes only on records with
  // several ALT alleles.
  NO_ALIGNED_SOURCE_AP_ALLELE:
    'the source VCF reports purity only for records with more than one ALT allele',
  NO_CARRIER_PURITY_MATCHED_TO_AN_ALLELE:
    "no carrier's purity value could be matched to an ALT allele",
  NO_METADATA: 'the source does not include the required metadata',
  NOT_AVAILABLE: 'the source does not provide these data',
  SELECTED_ALLELE_DETAIL_BYTE_BOUND_EXCEEDED:
    'the selected allele sequence is too large to display safely',
}

// All of Us releases no per-person calls; for HGSVC/HPRC the same reason means they were not loaded.
const unavailableReason = (reason: string | null | undefined, cohort?: string) =>
  (reason === 'CARRIER_CALLS_NOT_AVAILABLE' && cohort === 'aou'
    ? 'the per-person calls for this cohort are not releasable'
    : reason && UNAVAILABLE_REASON_COPY[reason]) || 'the required source data are unavailable'

const AllelicLandscapeHelp = ({
  showRepeatCountControls = false,
  sourceContext = false,
  repeatMeasureOffered = false,
  showLengthAxisControl = false,
  showAncestryControl = false,
  showSexControl = false,
  showHistogramDisplayControl = false,
  primaryMotifMeasurement,
}: {
  showRepeatCountControls?: boolean
  sourceContext?: boolean
  // Whether some plot offers a repeats measure.
  repeatMeasureOffered?: boolean
  showLengthAxisControl?: boolean
  showAncestryControl?: boolean
  showSexControl?: boolean
  showHistogramDisplayControl?: boolean
  primaryMotifMeasurement?: PrimaryMotifMeasurementData
}) => {
  const showControlsNote =
    showLengthAxisControl || showAncestryControl || showSexControl || showHistogramDisplayControl
  const showPrimaryMotif = Boolean(
    primaryMotifMeasurement && primaryMotifMeasurementAvailable(primaryMotifMeasurement)
  )
  return (
    <HaplotypeHelpButton title="Allelic Landscape">
      <p style={{ marginTop: 0 }}>
        These plots summarize the alleles observed at this locus. Selecting part of a plot filters
        the Allele Details Table below to the matching ALT alleles, and clicking{' '}
        <strong>Details</strong> in a table row shows that allele&apos;s sequence.
      </p>
      <h4>Allele length distribution</h4>
      <p>
        Each bar counts alleles of the same size. Alleles that exactly match the reference sequence
        are shown in orange. Click a bar, drag across bars, or use Shift+arrow keys to select a
        range, and press Escape or click <strong>Show all ALT alleles</strong> to clear the
        selection.
      </p>
      {repeatMeasureOffered && (
        <>
          <h4>{sourceContext ? 'Repeat sizes' : 'Repeat counts'}</h4>
          <p>
            {sourceContext
              ? 'Bars show measured allele sizes in source units, and squares count size pairs. Pairs are not phased, and an n/n pair may stand for one or two observed alleles.'
              : "Switching a plot's allele size measure from base pairs to repeats will display each allele's longest pure run of the motif: the largest number of consecutive repeat copies."}
            {!sourceContext &&
              showPrimaryMotif &&
              ' Some plots instead show the reviewed primary-motif measurement described below, which counts every exact copy of the motif across the whole allele and cannot filter the table.'}
            {showRepeatCountControls &&
              ' Each repeat-count card has its own ancestry, sex, color and scale controls.'}
          </p>
        </>
      )}
      {showPrimaryMotif && primaryMotifMeasurement && (
        <>
          <h4>Reviewed exact primary-motif product</h4>
          <p>
            When a plot has no precomputed repeat counts, its repeats measure uses the fixed,
            reviewed primary motif <strong>{primaryMotifMeasurement.motif}</strong>: always for the
            genotype plot, and for the allele plot when it cannot count longest pure runs in the ALT
            sequences. Each value counts exact, non-overlapping copies of that motif across the
            whole REF or ALT allele. This is a whole-record research measurement, not a component
            repeat count, total length change, source MC/LPS value, short-read estimate, diagnostic
            result, or clinical classification.
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
      <h4>Genotype length distribution</h4>
      <p>
        Each square counts the number of people with one pair of allele sizes, the shorter allele on
        one axis and the longer allele on the other. Only people with both alleles called are
        counted. Click a square or select by dragging to filter the table to those people&apos;s ALT
        alleles.
      </p>
      <h4>Repeat sequence purity</h4>
      <p style={showControlsNote ? undefined : { marginBottom: 0 }}>
        Each point represents one ALT allele sequence reported by TRGT, placed by its size and by
        its repeat sequence purity. Purity is the fraction of the allele&apos;s bases that match
        perfect copies of the motif. The size of a point is based on its allele count, which is the
        number of genotyped chromosomes that carry this allele sequence. The REF allele is drawn in
        orange. Click on a point or select by dragging to filter the table below.
      </p>
      {showControlsNote && (
        <p style={{ marginBottom: 0 }}>
          {showLengthAxisControl &&
            "The menu at the bottom of each plot switches the plot's axes from the ALT allele's total size to its size minus the size of the REF allele, in base pairs or, where available, in repeats of the longest pure run. "}
          {(showAncestryControl || showSexControl) &&
            `The ${[showAncestryControl ? 'ancestry' : null, showSexControl ? 'sex' : null]
              .filter(Boolean)
              .join(' and ')} ${
              showAncestryControl && showSexControl ? 'filters apply' : 'filter applies'
            } to every plot that can be split that way. `}
          {showHistogramDisplayControl &&
            'The color and scale controls apply only to the allele length distribution.'}
        </p>
      )}
    </HaplotypeHelpButton>
  )
}

const ExactAlleleIndexHelp = () => (
  <HaplotypeHelpButton title="Allele Details Table">
    <p style={{ marginTop: 0, marginBottom: 0 }}>
      Each row is one ALT allele observed at this locus, with its sequence, its size and change in
      size from REF in base pairs, its repeat sequence purity as reported by TRGT, and its allele
      count (AC) and frequency (AF). The colored sequence preview highlights copies of the annotated
      motif(s). Selecting scatter plot points or histogram bars in the plots above filters this
      table, while clicking <strong>Show all ALT alleles</strong> clears those filters. To sort the
      table, click a column heading. Click the <strong>Details</strong> button to see an
      allele&apos;s full sequence below.
    </p>
  </HaplotypeHelpButton>
)

const SelectedAlleleHelp = () => (
  <HaplotypeHelpButton title="ALT Allele Details">
    <p style={{ marginTop: 0, marginBottom: 0 }}>
      The sequence of a single ALT allele as reported by TRGT at this locus.
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

/**
 * The interval a locus page describes: its components, widened to the source record's REF span
 * when the API supplies one. The catalog genotyped some clusters under the id of their main
 * repeat, so their REF reaches beyond that repeat.
 */
export const locusRegionWithSourceRefSpan = (locus: LongReadTrLocus) => {
  const { region, bounds } = locus
  if (
    bounds?.source_ref_span_status !== 'AVAILABLE_EXACT' ||
    bounds.source_ref_span_start0 == null ||
    bounds.source_ref_span_end0 == null
  ) {
    return region
  }
  const start0 = Math.min(region.start0, bounds.source_ref_span_start0)
  const end0 = Math.max(region.end0, bounds.source_ref_span_end0)
  return { ...region, start0, end0, size: end0 - start0 }
}

// The dialog a component box opens, in larger text than the page. A long motif wraps so it can
// be read and selected.
const ComponentDetails = styled.div`
  font-size: 18px;
  line-height: 1.5;

  p {
    margin: 0 0 0.6em;
  }

  code {
    font-size: inherit;
    overflow-wrap: anywhere;
  }
`

// A component box, which opens a dialog with the component's coordinates and full motif.
const ComponentButton = styled.g`
  cursor: pointer;
  outline: none;

  &:focus-visible rect {
    stroke: #111;
    stroke-width: 3px;
    stroke-dasharray: none;
  }
`

export const LongReadTrComponentTrack = ({
  locus,
  exactReferenceComponentIndex = null,
}: {
  locus: LongReadTrLocus
  exactReferenceComponentIndex?: number | null
}) => {
  const { components } = locus
  const [openComponentIndex, setOpenComponentIndex] = useState<number | null>(null)
  const openComponent = openComponentIndex == null ? undefined : components[openComponentIndex]
  const region = locusRegionWithSourceRefSpan(locus)
  const hasAuthorizedExactReferenceOutline =
    exactReferenceComponentIndex != null &&
    exactReferenceComponentIndex >= 0 &&
    exactReferenceComponentIndex < components.length
  const lanes = componentLanes(components)
  const laneCount = Math.max(1, ...lanes.map((lane) => lane + 1))
  const width = 1000
  const left = 80
  const plotWidth = 880
  const x = (position: number) =>
    left + ((position - region.start0) / Math.max(1, region.end0 - region.start0)) * plotWidth

  return (
    <Panel aria-labelledby="lr-tr-components-heading">
      <HeadingWithHelp>
        <h2 id="lr-tr-components-heading">VC Reference Region</h2>
        <HaplotypeHelpButton title="VC Reference Region">
          <p style={{ marginTop: 0, marginBottom: 0 }}>
            Variation clusters (VCs) are wider polymorphic regions surrounding some tandem repeats
            in the human genome. VCs were defined by surveying the sequence flanking each tandem
            repeat in the TRExplorer catalog and measuring the polymorphism observed there within
            100 PacBio HiFi samples from the Human Pangenome Reference Consortium (see{' '}
            <ExternalLink href="https://pubmed.ncbi.nlm.nih.gov/42025159/">
              Weisburd, Dolzhenko et al. 2026
            </ExternalLink>
            ). Variation within a VC can pose both technical and conceptual challenges to the
            interpretation of repeat copy numbers, particularly where multiple similar tandem
            repeats occur in close proximity. Therefore, it is often better to genotype and analyze
            a variation cluster as a single locus, rather than looking at the repeat copy numbers of
            each embedded tandem repeat in isolation. gnomAD-LR uses TRGT to genotype each VC as a
            single locus, so allele sizes on this page are lengths of the whole VC.
          </p>
        </HaplotypeHelpButton>
      </HeadingWithHelp>
      {/* Above the track, like the allele length histogram's legend above its plot. */}
      {hasAuthorizedExactReferenceOutline && (
        <PlotLegendAbovePlot aria-label="Variation cluster reference region legend">
          <ExactReferenceOutlineKey
            aria-hidden="true"
            style={{
              background: motifColor(
                components[exactReferenceComponentIndex as number].motif,
                locus.motifs
              ),
            }}
          />
          <span>Known disease-associated tandem repeat</span>
        </PlotLegendAbovePlot>
      )}
      <HorizontalPlotScroller
        role="region"
        aria-label="Scrollable variation cluster reference region"
        tabIndex={0}
      >
        <svg
          viewBox={`0 0 ${width} ${85 + laneCount * 54}`}
          style={{ display: 'block', minWidth: 700, width: '100%' }}
          // A group, not an image, so its component buttons stay reachable.
          role="group"
          aria-label={`${
            components.length
          } ordered components of the variation cluster reference region in ${laneCount} coordinate lanes${
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
            const label = `Component ${index + 1}, ${component.motif}, chr${
              component.chrom
            }:${component.start0.toLocaleString()}–${component.end0.toLocaleString()}, ${
              component.end0 - component.start0
            } bp`
            // A long motif shows only its ends and its length, as in the page's Motif row.
            const motifLabel =
              component.motif.length > MAX_MOTIF_LENGTH_TO_PRINT_IN_FULL
                ? `${shortenLongMotifToItsEnds(component.motif)} (${component.motif.length} bp)`
                : component.motif
            // Bold 11 px text takes about 7 units per character in this viewBox.
            const compactLabel = componentWidth < Math.max(44, motifLabel.length * 7 + 8)
            const exactReferenceMatch =
              hasAuthorizedExactReferenceOutline && index === exactReferenceComponentIndex
            // The hover text names the outlined component the way the legend does.
            const accessibleLabel = exactReferenceMatch
              ? `${label}; known disease-associated tandem repeat`
              : label
            return (
              <ComponentButton
                // Source component order is identity-bearing, including exact duplicate components.
                // eslint-disable-next-line react/no-array-index-key
                key={`${component.start0}-${component.end0}-${component.motif}-${index}`}
                role="button"
                tabIndex={0}
                aria-label={accessibleLabel}
                aria-haspopup="dialog"
                onClick={() => setOpenComponentIndex(index)}
                onKeyDown={(event: React.KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setOpenComponentIndex(index)
                  }
                }}
              >
                <rect
                  x={x(component.start0)}
                  y={y}
                  width={componentWidth}
                  height={28}
                  rx={3}
                  fill={motifColor(component.motif, locus.motifs)}
                  data-component-motif={component.motif}
                  data-motif-color={motifColor(component.motif, locus.motifs)}
                  // A thin dotted outline, like the legend's 2px CSS dotted border.
                  stroke={exactReferenceMatch ? '#111' : undefined}
                  strokeWidth={exactReferenceMatch ? 2 : undefined}
                  strokeDasharray={exactReferenceMatch ? '2 2' : undefined}
                  data-exact-reference-component-match={exactReferenceMatch ? 'true' : undefined}
                >
                  <title>{accessibleLabel}</title>
                </rect>
                {/* A box too narrow for its motif shows no text; hovering shows its details. */}
                {!compactLabel && (
                  <>
                    <text
                      x={x(component.start0) + componentWidth / 2}
                      y={y + 19}
                      fill="#fff"
                      fontSize={11}
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {motifLabel}
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
                  </>
                )}
              </ComponentButton>
            )
          })}
          <text x={left} y={60 + laneCount * 54} fill="#4f5960" fontSize={11}>
            chr{region.chrom}:{region.start0.toLocaleString()}
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
      {openComponent && (
        <>
          <ModalZIndexFix />
          <Modal
            title={`Variation Cluster: Tandem Repeat #${(openComponentIndex as number) + 1}`}
            size="large"
            onRequestClose={() => setOpenComponentIndex(null)}
          >
            <ComponentDetails>
              <p>
                <strong>Motif:</strong> <code>{openComponent.motif}</code>
                {/* A short motif's size is plain from the motif itself. */}
                {openComponent.motif.length > 6 && ` (${openComponent.motif.length} bp)`}
                {/* Its copies in the reference region, as in the long-read variant table rows. */}
                {` x ${repeatCopyText(
                  openComponent.end0 - openComponent.start0,
                  openComponent.motif.length
                )}`}
              </p>
              <p>
                <strong>Reference Region:</strong> chr{openComponent.chrom}:
                {openComponent.start0.toLocaleString()}–{openComponent.end0.toLocaleString()} (
                {(openComponent.end0 - openComponent.start0).toLocaleString()} bp)
              </p>
            </ComponentDetails>
          </Modal>
        </>
      )}
    </Panel>
  )
}

// The first column holds the rotated axis title and the y tick labels, so it is wide
// enough to keep the title inside the plot card rather than in the card's padding.
const HISTOGRAM_Y_COLUMN_WIDTH = 76
// No gap, so the y axis line meets the x axis line at the corner, as in the genotype heatmap.
const HISTOGRAM_COLUMN_GAP = 0
// Space between the right end of a plot's x axis and the card's padding, so the plot does not run
// up to the card's edge.
const HISTOGRAM_RIGHT_MARGIN = 16
// Widest a histogram bar or a genotype heatmap square may be, in on-screen pixels. With few
// sizes the bars and squares keep this width and sit centered in the plot.
const MAX_PLOT_BAR_WIDTH_PX = 45
// The axis line color of the genotype heatmap, which the other plots' axes share.
const PLOT_AXIS_LINE_COLOR = '#89939a'
// The selected allele's row and Details button are outlined in the browser's focus ring blue,
// which outlines the selected allele panel once it takes focus.
const SELECTED_ALLELE_OUTLINE_COLOR = '#2870f5'
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
  margin: 1.8em ${HISTOGRAM_RIGHT_MARGIN}px 1.2em 0;
`

// flow-root keeps the chart's top margin inside this box, so the space that x axis alignment
// adds above it moves the chart by exactly that much instead of also unmerging the margins.
const HistogramSizer = styled.div`
  display: flow-root;
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

// Natural bar width, gap and plot height for an allele size histogram with this many bars. The
// purity plot uses the same layout, so its points sit under the histogram's bars.
const histogramLayoutForBinCount = (binCount: number): HistogramLayout => {
  if (binCount <= 3) return { barWidth: 48, gap: 10, height: 190 }
  if (binCount <= 12) return { barWidth: 34, gap: 6, height: 220 }
  if (binCount <= 40) return { barWidth: 24, gap: 3, height: 240 }
  return { barWidth: 24, gap: 2, height: 260 }
}

// Narrowest a bar may be and keep its gaps; narrower bars touch, so the gaps' width goes to them.
const MIN_BAR_WIDTH_WITH_GAPS = 3

// Bar width and gap for a histogram with this many bars. Bars widen or narrow to fill the plot, in
// the same slots as the purity plot, so every bar shows without scrolling, but never beyond
// MAX_PLOT_BAR_WIDTH_PX. A measured width of 0 (the initial render, and jsdom) keeps the natural
// width.
const fittedHistogramBars = (measuredWidth: number, binCount: number, layout: HistogramLayout) => {
  const naturalBarWidth = Math.min(layout.barWidth, MAX_PLOT_BAR_WIDTH_PX)
  if (!measuredWidth || !binCount) return { barWidth: naturalBarWidth, gap: layout.gap }
  const usableWidth =
    measuredWidth -
    HISTOGRAM_Y_COLUMN_WIDTH -
    HISTOGRAM_COLUMN_GAP -
    HISTOGRAM_RIGHT_MARGIN -
    HISTOGRAM_SIDE_PADDING * 2
  const barWidthWithGaps = Math.floor((usableWidth - (binCount - 1) * layout.gap) / binCount)
  if (barWidthWithGaps >= MIN_BAR_WIDTH_WITH_GAPS) {
    return { barWidth: Math.min(MAX_PLOT_BAR_WIDTH_PX, barWidthWithGaps), gap: layout.gap }
  }
  // At least 1px, so in a card too narrow even for that the plot scrolls.
  return { barWidth: Math.max(1, usableWidth / binCount), gap: 0 }
}

const HistogramYScale = styled.div<{ $height: number }>`
  position: relative;
  height: ${(props) => props.$height}px;
  margin-top: ${HISTOGRAM_BAR_LABEL_HEADROOM}px;
  border-right: 1px solid ${PLOT_AXIS_LINE_COLOR};
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

// Its bottom border is the x axis line, so the line spans the whole plot width and meets the
// y axis line at the corner.
const Histogram = styled.div<{ $height: number; $gap: number }>`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  box-sizing: border-box;
  gap: ${(props) => props.$gap}px;
  height: ${(props) => props.$height}px;
  border-bottom: 1px solid ${PLOT_AXIS_LINE_COLOR};
`

// The color of the light horizontal lines at a plot's y ticks.
const PLOT_GRID_LINE_COLOR = '#e2e6e8'

// A horizontal line across a histogram at one y tick, drawn before the bars so they cover it.
const HistogramGridLine = styled.span`
  position: absolute;
  right: 0;
  left: 0;
  border-top: 1px solid ${PLOT_GRID_LINE_COLOR};
  pointer-events: none;
`

// Space between a y tick label and the y axis line.
const AXIS_TICK_LABEL_RIGHT_GAP = 5

const AxisTick = styled.span`
  position: absolute;
  right: ${AXIS_TICK_LABEL_RIGHT_GAP}px;
  transform: translateY(50%);
  color: #566168;
  font-size: ${AXIS_LABEL_FONT_PX}px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

// Placed with yAxisTitleLeft.
const AxisTitle = styled.span<{ $left: number }>`
  position: absolute;
  top: 50%;
  left: ${(props) => props.$left}px;
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
  // The gap to each neighboring bar.
  $gap: number
  $fill?: string
  $selectedFill?: string
}>`
  position: relative;
  /* Exactly $width wide, with no minimum, because the x ticks and purity dots are placed for
     that width. */
  flex: 0 0 ${(props) => props.$width}px;
  max-width: ${(props) => Math.max(48, props.$width)}px;
  height: ${(props) => props.$height}%;
  min-height: ${(props) => (props.$hasValue ? '3px' : '1px')};
  padding: 0;
  /* A selected bar keeps its border widths, and the rest of its dark ring is an inset shadow, so
     selecting never widens a bar narrower than the ring and moves it off its tick. */
  border: ${(props) => {
    if (!props.$hasValue) return '0'
    return `1px solid ${props.$selected ? '#222' : props.$fill || LONG_READ_PRIMARY_PLOT_COLOR}`
  }};
  border-bottom: ${(props) => {
    if (props.$selected) return '1px solid #222'
    return props.$hasValue
      ? `1px solid ${props.$fill || LONG_READ_PRIMARY_PLOT_COLOR}`
      : '1px solid #89939a'
  }};
  box-shadow: ${(props) => (props.$selected ? 'inset 0 0 0 2px #222' : 'none')};
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

  /* The click area spans the bar and half the gap on each side, and no further, so a click never
     lands on a neighboring bar. It is at least 44px tall, so short bars are easy to hit. */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: ${(props) => props.$width + props.$gap}px;
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
  padding-right: ${HISTOGRAM_RIGHT_MARGIN}px;
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
    background: ${PLOT_AXIS_LINE_COLOR};
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
    border-color: ${SELECTED_ALLELE_OUTLINE_COLOR};
    background: #fff;
    box-shadow: inset 0 0 0 1px ${SELECTED_ALLELE_OUTLINE_COLOR};
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

// A table of a few short cells, only as wide as its content.
const CompactScrollTable = styled(ScrollTable)`
  padding: 7px 0;

  table {
    width: auto;
  }

  th,
  td {
    padding: 0.3em 1.5em 0.3em 0.5em;
  }

  /* Counts line up on their last digit, under their column titles. */
  td,
  th[scope='col']:not(:first-child) {
    text-align: right;
  }
`

const stackSourceKey = (stack: AlleleBin['stacks'][number]) => {
  if (stack.ancestry_group && stack.sex) return `${stack.ancestry_group}_${stack.sex}`
  return stack.ancestry_group || stack.sex
}

// Colorblind-safe (Okabe-Ito) pair for the allele length histogram: ALT allele sizes in blue and
// the REF allele size in orange, with a dark navy for selected bars so selection never reads as REF.
const ALT_ALLELE_SIZE_BAR_COLOR = '#0072b2'
const REF_ALLELE_SIZE_BAR_COLOR = '#e69f00'
const SELECTED_ALLELE_SIZE_BAR_COLOR = '#003f63'

// A legend line between a plot card's heading and its plot, like the allele length histogram's.
const PlotLegendAbovePlot = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

// A note about how to read a plot, under its legend and above the plot.
const PlotNoteAbovePlot = styled.p`
  color: #566168;
  font-size: 12px;
`

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

// The bar at the REF size that holds no ALT copies: it carries only the REF copies, which are
// counted from the separate REF bin.
const isReferenceOnlyBin = (bin: AlleleBin) => bin.delta === 0 && bin.called_alleles === 0

// The precomputed repeat-count histograms have one row per ancestry and sex group. The length
// plots also expect ancestry-only and sex-only stacks, so those are summed from the groups.
const stacksFromAncestrySexGroups = (
  groups: { ancestry_group: string; sex: string; called_alleles: number }[]
): AlleleBin['stacks'] => {
  const totals = new Map<string, AlleleBin['stacks'][number]>()
  const add = (ancestryGroup: string | null, sex: string | null, count: number) => {
    const key = `${ancestryGroup || ''}\u0000${sex || ''}`
    const stack = totals.get(key) || { ancestry_group: ancestryGroup, sex, called_alleles: 0 }
    stack.called_alleles += count
    totals.set(key, stack)
  }
  groups.forEach((group) => {
    add(group.ancestry_group, group.sex, group.called_alleles)
    add(group.ancestry_group, null, group.called_alleles)
    add(null, group.sex, group.called_alleles)
  })
  return [...totals.values()]
}

// Rows of a repeat-count histogram for the plots' own repeat unit. A locus with several motifs
// has rows for each; the length-style plots show only the primary one.
const rowsForRepeatUnit = <Row,>(
  rows: Row[],
  repeatUnit: string | null,
  rowRepeatUnits: (row: Row) => (string | null)[]
) =>
  repeatUnit == null
    ? rows
    : rows.filter((row) => rowRepeatUnits(row).every((unit) => unit === repeatUnit))

// Alleles of every ancestry and sex group at one size of the precomputed allele histogram.
const repeatCountHistogramAllelesAt = (repeatCountPlots: RepeatCountPlots, size: number) =>
  rowsForRepeatUnit(
    repeatCountPlots.allele_size_distribution,
    repeatCountPlots.repeat_unit,
    (row) => [row.repunit]
  ).reduce(
    (sum, row) =>
      sum +
      row.distribution
        .filter((item: { repunit_count: number }) => item.repunit_count === size)
        .reduce((rowSum: number, item: { frequency: number }) => rowSum + item.frequency, 0),
    0
  )

// The precomputed repeat-count allele histogram as length-plot bins, with each size given as
// repeats relative to referenceUnits (0 when the REF repeat count is unknown). The histogram
// does not say which alleles are REF, so every allele at the REF repeat count goes into the
// REF bar; it is not split into REF and same-size ALT alleles. No bin carries allele ids, so
// these bars cannot filter the source-ALT index.
export const repeatCountHistogramBins = (
  repeatCountPlots: RepeatCountPlots,
  referenceUnits: number | null
): { bins: AlleleBin[]; referenceBin: AlleleBin } => {
  const groupsByCount = new Map<
    number,
    { ancestry_group: string; sex: string; called_alleles: number }[]
  >()
  rowsForRepeatUnit(
    repeatCountPlots.allele_size_distribution,
    repeatCountPlots.repeat_unit,
    (row) => [row.repunit]
  ).forEach((row) => {
    row.distribution.forEach((item: { repunit_count: number; frequency: number }) => {
      const groups = groupsByCount.get(item.repunit_count) || []
      groups.push({
        ancestry_group: row.ancestry_group,
        sex: row.sex,
        called_alleles: item.frequency,
      })
      groupsByCount.set(item.repunit_count, groups)
    })
  })
  const offset = referenceUnits ?? 0
  const sizeBins = [...groupsByCount]
    .map(([repeatCount, groups]) => ({
      delta: repeatCount - offset,
      called_alleles: groups.reduce((sum, group) => sum + group.called_alleles, 0),
      exact_alt_count: 0,
      allele_ids: [],
      stacks: stacksFromAncestrySexGroups(groups),
    }))
    .sort((left, right) => left.delta - right.delta)
  const referenceSizeBin =
    referenceUnits == null ? undefined : sizeBins.find((bin) => bin.delta === 0)
  return {
    bins: sizeBins.map((bin) =>
      bin === referenceSizeBin ? { ...bin, called_alleles: 0, stacks: [] } : bin
    ),
    referenceBin: referenceSizeBin || {
      delta: 0,
      called_alleles: 0,
      exact_alt_count: 0,
      allele_ids: [],
      stacks: [],
    },
  }
}

// The precomputed repeat-count genotype histogram as genotype-plot cells, with sizes as repeats
// relative to referenceUnits. Each ancestry and sex group becomes one pair entry, so the plot's
// ancestry and sex filters apply as they do to the length data.
export const repeatCountGenotypeLandscape = (
  repeatCountPlots: RepeatCountPlots,
  referenceUnits: number | null
): WholeRecordGenotypeLandscapeData => {
  const offset = referenceUnits ?? 0
  const cellsByKey = new Map<string, GenotypeCell>()
  rowsForRepeatUnit(repeatCountPlots.genotype_distribution, repeatCountPlots.repeat_unit, (row) => [
    row.short_allele_repunit,
    row.long_allele_repunit,
  ]).forEach((row) => {
    row.distribution.forEach(
      (item: {
        short_allele_repunit_count: number
        long_allele_repunit_count: number
        frequency: number
      }) => {
        const shorterDelta = item.short_allele_repunit_count - offset
        const longerDelta = item.long_allele_repunit_count - offset
        const key = `${shorterDelta}/${longerDelta}`
        const cell = cellsByKey.get(key) || {
          shorter_delta: shorterDelta,
          longer_delta: longerDelta,
          people: 0,
          pairs: [],
        }
        cell.people += item.frequency
        cell.pairs.push({
          shorter_allele_id: String(item.short_allele_repunit_count),
          longer_allele_id: String(item.long_allele_repunit_count),
          ancestry_group: row.ancestry_group,
          sex: row.sex,
          people: item.frequency,
          phased_people: 0,
          unphased_people: item.frequency,
        })
        cellsByKey.set(key, cell)
      }
    )
  })
  const cells = [...cellsByKey.values()]
  return {
    status: 'AVAILABLE',
    reason_code: null,
    unit: 'WHOLE_RECORD_DELTA_BP',
    reference_allele_id: null,
    called_samples: cells.reduce((sum, cell) => sum + cell.people, 0),
    called_alleles: null,
    cells,
  }
}

const groupSupportsVisiblePlots = (
  group: LongReadTrFilterGroup,
  genotypeLandscapeVisible: boolean
) =>
  group.shared_available &&
  group.available_in_frequency &&
  group.source_frequency_keys.length > 0 &&
  (!genotypeLandscapeVisible ||
    (group.available_in_genotype && group.source_metadata_keys.length > 0))

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

// Linear ticks are round numbers: about four steps of 1, 2 or 5 times a power of ten (at least
// 1), up to the top of the axis. The top stays at the largest count, which only gets a tick of
// its own when it is a multiple of the step.
export const histogramTicks = (maxCount: number, scale: ScaleType) => {
  if (scale === 'log') {
    const ticks = [0]
    for (let value = 1; value <= maxCount; value *= 10) ticks.push(value)
    if (maxCount > 0 && ticks[ticks.length - 1] !== maxCount) ticks.push(maxCount)
    return ticks
  }
  const domainMax = scaleCap(scale) || Math.max(1, maxCount)
  const roughStep = domainMax / 4
  const powerOfTen = 10 ** Math.floor(Math.log10(roughStep))
  const roughStepInPowersOfTen = roughStep / powerOfTen
  let step = powerOfTen
  if (roughStepInPowersOfTen >= Math.sqrt(50)) step = 10 * powerOfTen
  else if (roughStepInPowersOfTen >= Math.sqrt(10)) step = 5 * powerOfTen
  else if (roughStepInPowersOfTen >= Math.sqrt(2)) step = 2 * powerOfTen
  step = Math.max(1, step)
  return Array.from({ length: Math.floor(domainMax / step) + 1 }, (_, index) => index * step)
}

type HistogramDeltaTick = {
  delta: number
  lane: number
  left: number
}

// The text of an allele size axis tick: the size itself, or its change from REF.
const lengthAxisTickLabel = (delta: number, mode: LengthAxisMode, referenceSize: number | null) =>
  mode === 'absolute' ? lengthAxisValue(delta, mode, referenceSize).toLocaleString() : signed(delta)

// On-screen width of a tick label; tabular digits are about 0.62em wide.
const tickLabelWidth = (label: string) => label.length * AXIS_LABEL_FONT_PX * 0.62
// Least space between neighboring tick labels.
const TICK_LABEL_GAP = 6

// Where a y axis title's center sits, from the left edge of the y column: a gap left of the widest
// tick label, so the title stays close to the axis. The column keeps its width, so plots placed
// with it still line up, and any room left over falls outside the title.
const yAxisTitleLeft = (tickLabels: string[]) =>
  Math.max(
    AXIS_LABEL_FONT_PX / 2 + 2,
    HISTOGRAM_Y_COLUMN_WIDTH -
      AXIS_TICK_LABEL_RIGHT_GAP -
      Math.max(0, ...tickLabels.map(tickLabelWidth)) -
      TICK_LABEL_GAP -
      AXIS_LABEL_FONT_PX / 2
  )

// Ticks for an axis with one slot per allele size. Every size gets a label when the labels
// fit; otherwise some are left out, always keeping the ends and 0. Picking bars does not change
// the ticks, so the labels stay put.
export const histogramDeltaAxisTicks = (
  deltas: number[],
  barWidth: number,
  gap: number,
  tickLabel: (delta: number) => string = signed
): HistogramDeltaTick[] => {
  if (!deltas.length) return []
  const labelWidth = (delta: number) => tickLabelWidth(tickLabel(delta))

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

  const chosen = [...required].map(([delta, left]) => ({ delta, left }))
  const collides = (delta: number, left: number) =>
    chosen.some(
      (tick) =>
        Math.abs(tick.left - left) <
        (labelWidth(tick.delta) + labelWidth(delta)) / 2 + TICK_LABEL_GAP
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
      const tickLeft = tick.left - labelWidth(tick.delta) / 2
      let lane = laneEnds.findIndex((end) => tickLeft >= end + TICK_LABEL_GAP)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = tick.left + labelWidth(tick.delta) / 2
      return { ...tick, lane }
    })
}

const alleleLabel = (alleleId: string) => {
  const match = /~([1-9][0-9]*)$/.exec(alleleId)
  return match ? `Sequence ${match[1]}` : alleleId
}

// The click area is the visible dot and no larger: in a dense plot a wider transparent target
// would cover neighboring dots and take their clicks.
const PurityPointButton = styled.button<{ $diameter: number }>`
  position: absolute;
  display: block;
  box-sizing: border-box;
  width: ${(props) => props.$diameter}px;
  height: ${(props) => props.$diameter}px;
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
    /* The same blue as the ALT bars in the allele length histogram, with a darker outline. */
    background: ${ALT_ALLELE_SIZE_BAR_COLOR};
    box-shadow: 0 0 0 1px #004a73;
  }

  /* Navy like a selected histogram bar, so it is not mistaken for the orange REF dot. */
  &[data-selected-allele='true'] > span {
    border: 3px solid #111;
    background: ${SELECTED_ALLELE_SIZE_BAR_COLOR};
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

// The id the REF allele's purity dot is keyed by; no source ALT has it.
const REFERENCE_PURITY_POINT_ID = '__REFERENCE__'

// The REF allele's purity dot: drawn like the ALT dots, in the histogram's REF color. It is not
// a button, because the source-ALT index has no REF row to filter to.
const PurityReferencePoint = styled.span<{ $diameter: number }>`
  position: absolute;
  box-sizing: border-box;
  width: ${(props) => props.$diameter}px;
  height: ${(props) => props.$diameter}px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: ${REF_ALLELE_SIZE_BAR_COLOR};
  box-shadow: 0 0 0 1px #8a5c00;
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

// Decimals for the purity axis ticks: enough to tell them apart across the domain's span, minus
// trailing zeros that every tick has, so 1.000, 0.995 and 0.990 rather than 1.0000.
export const purityTickDecimals = (
  ticks: number[],
  domainMinimum: number,
  domainMaximum: number
) => {
  const decimals = purityDecimals(domainMinimum, domainMaximum)
  const showsEveryTickAsPrecisely = (candidateDecimals: number) =>
    ticks.every(
      (tick) => Number(tick.toFixed(candidateDecimals)) === Number(tick.toFixed(decimals))
    )
  let fewestDecimals = decimals
  while (fewestDecimals > 0 && showsEveryTickAsPrecisely(fewestDecimals - 1)) fewestDecimals -= 1
  return fewestDecimals
}

// Keeps the largest (26 px) AC dot and its focus outline, which reaches 19 px from its center,
// inside the y range at every data-domain boundary. Horizontally, points sit in the allele length
// histogram's slots.
export const PURITY_POINT_CLEARANCE = 25
export const PURITY_MAX_JITTER = 32
// Points that share an allele size and purity spread over at most this fraction of the distance
// between neighboring sizes, so each point stays closer to its own size than to the next one.
export const PURITY_OVERLAP_MAX_FRACTION_OF_SLOT = 0.8

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

// Sideways offset in pixels of the point ranked `rank` among `count` points that share an allele
// size and purity, where rank 0 has the most called alleles. That point stays on its size's
// center, and the others alternate right and left of it, at most maximumSpan / 2 pixels away.
export const purityOverlapOffset = (
  rank: number,
  count: number,
  maximumSpan = PURITY_MAX_JITTER * 2
) => {
  if (count <= 1 || rank === 0) return 0
  const stepsToEachSide = Math.ceil((count - 1) / 2)
  const step = Math.min(12, Math.min(PURITY_MAX_JITTER, maximumSpan / 2) / stepsToEachSide)
  return (rank % 2 === 1 ? 1 : -1) * Math.ceil(rank / 2) * step
}

const purityPositionCss = ({ percent, pixelOffset }: ReturnType<typeof purityScalePosition>) => {
  if (pixelOffset === 0) return `${percent}%`
  const operator = pixelOffset > 0 ? '+' : '-'
  return `calc(${percent}% ${operator} ${Math.abs(pixelOffset)}px)`
}

const PurityScatter = ({
  points,
  plotHeight,
  slotDeltas = [],
  selectedAllele,
  activeMarkIds,
  onSelectPoints,
  onClear,
  lengthAxisMode = 'delta',
  representedRefLength = null,
  alleleAxisLabelPrefix = '',
  referencePurity = null,
  referenceCalledAlleles = 0,
}: {
  points: PurityPoint[]
  // The REF allele's purity and its copies in the current view, drawn as one more dot.
  referencePurity?: number | null
  referenceCalledAlleles?: number
  // Height in pixels of the plot area, the same as the allele length histogram's.
  plotHeight: number
  // The allele sizes (bp versus REF) that get a slot on the x axis: the allele length
  // histogram's bars, so each point sits under its bar.
  slotDeltas?: number[]
  selectedAllele?: string
  activeMarkIds: Set<string>
  onSelectPoints: (points: PurityPoint[]) => void
  onClear: () => void
  lengthAxisMode?: LengthAxisMode
  representedRefLength?: number | null
  alleleAxisLabelPrefix?: string
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
  // The REF allele as one more dot at the REF size, so the dots account for every allele. It is
  // not a filter button: the source-ALT index has no REF row.
  const referencePoint =
    referencePurity != null && referenceCalledAlleles > 0
      ? {
          allele_id: REFERENCE_PURITY_POINT_ID,
          delta: 0,
          motif_purity: referencePurity,
          called_alleles: referenceCalledAlleles,
        }
      : null
  // A slice with no ALT alleles still shows the REF dot that the card's allele count includes.
  if (!points.length && !referencePoint) return <p>Motif purity is unavailable.</p>
  const allPoints = referencePoint ? [...points, referencePoint] : points
  // One equal-width slot per allele size, laid out like the allele length histogram's bars.
  const deltas = Array.from(
    new Set([...slotDeltas, ...allPoints.map((point) => point.delta)])
  ).sort((left, right) => left - right)
  const slotIndex = new Map(deltas.map((delta, index) => [delta, index]))
  const slotCenterCss = (delta: number) =>
    `calc(${HISTOGRAM_SIDE_PADDING}px + ${
      (slotIndex.get(delta)! + 0.5) / deltas.length
    } * (100% - ${2 * HISTOGRAM_SIDE_PADDING}px))`
  const [domainMinimum, domainMaximum] = purityDomain(allPoints.map((point) => point.motif_purity))
  // Round values inside the domain, such as 0.90, 0.92, ... 0.98, rather than its ends.
  const purityTicks = scaleLinear().domain([domainMinimum, domainMaximum]).ticks(3)
  const decimals = purityTickDecimals(purityTicks, domainMinimum, domainMaximum)
  // Each point's rank among the points at its exact size and purity, most called alleles first,
  // so the point that stands for the most alleles is drawn on its size's center. It is worked out
  // here rather than while drawing, because MeasuredWidth redraws the plot below on every width
  // measurement.
  const overlapGroups = allPoints.reduce((groups, point) => {
    const key = `${point.delta}\u0000${point.motif_purity}`
    groups.set(key, [...(groups.get(key) || []), point])
    return groups
  }, new Map<string, PurityPoint[]>())
  const overlapPlaceByAlleleId = new Map(
    Array.from(overlapGroups.values()).flatMap((group) =>
      [...group]
        .sort((left, right) => right.called_alleles - left.called_alleles)
        .map((point, rank) => [point.allele_id, { rank, count: group.length }] as const)
    )
  )
  const minimumCalledAlleles = Math.min(...allPoints.map((point) => point.called_alleles))
  const maximumCalledAlleles = Math.max(...allPoints.map((point) => point.called_alleles))

  const purityTickBottom = (tick: number) =>
    purityPositionCss(
      purityScalePosition(tick, domainMinimum, domainMaximum, PURITY_POINT_CLEARANCE)
    )

  const alleleCountLegendMark = (calledAlleles: number) => {
    const diameter = purityPointDiameter(calledAlleles, minimumCalledAlleles, maximumCalledAlleles)
    return (
      <span
        aria-hidden="true"
        style={{
          boxSizing: 'border-box',
          width: diameter,
          height: diameter,
          borderRadius: '50%',
          background: ALT_ALLELE_SIZE_BAR_COLOR,
        }}
      />
    )
  }

  return (
    <>
      <PlotLegendAbovePlot
        aria-label={`Point size represents allele count (AC) from ${minimumCalledAlleles} to ${maximumCalledAlleles}`}
      >
        <span>Allele count (AC)</span>
        {alleleCountLegendMark(minimumCalledAlleles)}
        <span>{minimumCalledAlleles.toLocaleString()}</span>
        {minimumCalledAlleles !== maximumCalledAlleles && (
          <>
            {alleleCountLegendMark(maximumCalledAlleles)}
            <span>{maximumCalledAlleles.toLocaleString()}</span>
          </>
        )}
        {referencePoint && (
          <span style={{ marginLeft: 10 }}>
            <AlleleSizeColorSwatch aria-hidden="true" $color={REF_ALLELE_SIZE_BAR_COLOR} />
            REF allele
          </span>
        )}
      </PlotLegendAbovePlot>
      {/* Measures the full card width, as the histogram does, so the slots match its bars. */}
      <MeasuredWidth>
        {(measuredWidth) => {
          const plotWidth = Math.max(
            0,
            measuredWidth - HISTOGRAM_Y_COLUMN_WIDTH - HISTOGRAM_COLUMN_GAP - HISTOGRAM_RIGHT_MARGIN
          )
          // The bp histogram's bar geometry, centered the same way, so each point sits under
          // its bar. When those bars would not fit (the histogram then scrolls), the slots
          // share the plot width equally instead.
          const histogramLayout = histogramLayoutForBinCount(deltas.length)
          const histogramBars = fittedHistogramBars(measuredWidth, deltas.length, histogramLayout)
          const histogramContentWidth =
            deltas.length * histogramBars.barWidth + (deltas.length - 1) * histogramBars.gap
          const followsHistogram = histogramContentWidth <= plotWidth - 2 * HISTOGRAM_SIDE_PADDING
          const slotWidth = followsHistogram
            ? histogramBars.barWidth
            : Math.max(0, plotWidth - 2 * HISTOGRAM_SIDE_PADDING) / deltas.length
          const slotGap = followsHistogram ? histogramBars.gap : 0
          const slotsLeft = followsHistogram
            ? (plotWidth - histogramContentWidth) / 2
            : HISTOGRAM_SIDE_PADDING
          // Before the first width measurement the equal-slot rule is applied in CSS.
          const slotCenter = (delta: number) =>
            measuredWidth > 0
              ? `${slotsLeft + slotIndex.get(delta)! * (slotWidth + slotGap) + slotWidth / 2}px`
              : slotCenterCss(delta)
          // Points that share a size and purity spread sideways within their size's column.
          // Before the first width measurement the column width is unknown, so the spread is not
          // limited by it.
          const overlapOffsetForAllele = (alleleId: string) => {
            const overlapPlace = overlapPlaceByAlleleId.get(alleleId)
            if (!overlapPlace) return 0
            return purityOverlapOffset(
              overlapPlace.rank,
              overlapPlace.count,
              measuredWidth > 0
                ? (slotWidth + slotGap) * PURITY_OVERLAP_MAX_FRACTION_OF_SLOT
                : undefined
            )
          }
          const xAxisTicks = histogramDeltaAxisTicks(deltas, slotWidth, slotGap, (delta) =>
            lengthAxisTickLabel(delta, lengthAxisMode, representedRefLength)
          )
          const xAxisHeight =
            AXIS_LABEL_FONT_PX +
            15 +
            Math.max(0, ...xAxisTicks.map((tick) => tick.lane)) * HISTOGRAM_X_TICK_LANE_HEIGHT
          return (
            <HistogramSizer data-x-axis-aligned-plot="true">
              <HistogramChartWithXAxisTitle>
                <HistogramYScale aria-hidden="true" $height={plotHeight} style={{ marginTop: 0 }}>
                  <AxisTitle
                    $left={yAxisTitleLeft(purityTicks.map((tick) => tick.toFixed(decimals)))}
                  >
                    Purity
                  </AxisTitle>
                  {purityTicks.map((tick) => (
                    <AxisTick
                      key={tick}
                      data-testid="purity-axis-tick"
                      style={{ bottom: purityTickBottom(tick) }}
                    >
                      {tick.toFixed(decimals)}
                    </AxisTick>
                  ))}
                </HistogramYScale>
                <div style={{ minWidth: 0 }}>
                  <div
                    role="group"
                    aria-label={`${exactAltSequences(points.length)} plotted by ${
                      lengthAxisMode === 'absolute'
                        ? 'represented allele length'
                        : 'change from REF'
                    } and source-reported motif purity`}
                    data-purity-domain={`${domainMinimum.toFixed(6)}:${domainMaximum.toFixed(6)}`}
                    data-vertical-inset={PURITY_POINT_CLEARANCE}
                    data-x-axis-line="true"
                    {...brush.containerProps}
                    style={{
                      position: 'relative',
                      boxSizing: 'border-box',
                      height: plotHeight,
                      borderBottom: `1px solid ${PLOT_AXIS_LINE_COLOR}`,
                    }}
                  >
                    {purityTicks.map((tick) => (
                      <span
                        key={tick}
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          right: 0,
                          bottom: purityTickBottom(tick),
                          left: 0,
                          borderTop: `1px solid ${PLOT_GRID_LINE_COLOR}`,
                        }}
                      />
                    ))}
                    {referencePoint && (
                      <PurityReferencePoint
                        role="img"
                        aria-label={`REF allele: purity ${referencePoint.motif_purity.toFixed(
                          4
                        )}, ${calledAlleleCopies(referencePoint.called_alleles)}`}
                        title={`REF allele: purity ${referencePoint.motif_purity.toFixed(4)}, AC ${
                          referencePoint.called_alleles
                        }`}
                        data-testid="purity-reference-point"
                        $diameter={purityPointDiameter(
                          referencePoint.called_alleles,
                          minimumCalledAlleles,
                          maximumCalledAlleles
                        )}
                        style={{
                          left: slotCenter(referencePoint.delta),
                          bottom: purityTickBottom(referencePoint.motif_purity),
                          transform: `translate(calc(-50% + ${overlapOffsetForAllele(
                            REFERENCE_PURITY_POINT_ID
                          )}px), 50%)`,
                        }}
                      />
                    )}
                    {points.map((point) => {
                      const mark = brushMarks.find((candidate) => candidate.value === point)!
                      const markProps = brush.markProps(mark)
                      const pointSelected =
                        activeMarkIds.has(mark.id) || brush.previewMarkIds.has(mark.id)
                      const left = slotCenter(point.delta)
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
                      const overlapOffset = overlapOffsetForAllele(point.allele_id)
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
                  </div>
                  <HistogramXAxis
                    role="group"
                    aria-label={`${lengthAxisTitle(
                      `${alleleAxisLabelPrefix}Allele`,
                      lengthAxisMode
                    )} axis`}
                    data-testid="purity-x-axis"
                    $height={xAxisHeight}
                    $width={plotWidth}
                    style={{ width: '100%' }}
                  >
                    {xAxisTicks.map((tick) => (
                      <HistogramXTick
                        key={tick.delta}
                        data-testid="purity-x-axis-tick"
                        $lane={tick.lane}
                        $left={tick.left + slotsLeft}
                      >
                        {lengthAxisTickLabel(tick.delta, lengthAxisMode, representedRefLength)}
                      </HistogramXTick>
                    ))}
                  </HistogramXAxis>
                </div>
              </HistogramChartWithXAxisTitle>
              <HistogramXAxisTitle aria-hidden="true">
                {lengthAxisTitle(`${alleleAxisLabelPrefix}Allele`, lengthAxisMode)}
              </HistogramXAxisTitle>
            </HistogramSizer>
          )
        }}
      </MeasuredWidth>
    </>
  )
}

export const RepeatCountPlotCard = ({
  variantId,
  repeatCountPlots,
  kind,
  lengthAxisControl = null,
}: {
  variantId: string
  repeatCountPlots: LongReadTrLocus['repeat_count_plots']
  kind: 'allele' | 'genotype'
  // The plot's own Length axis menu, drawn at the bottom of the card.
  lengthAxisControl?: React.ReactNode
}) => {
  if (!repeatPlotAvailable(repeatCountPlots, kind)) return null
  const sourceContext = repeatCountPlots.status === 'AVAILABLE_SOURCE_CONTEXT'

  return (
    <PlotCard
      data-plot-card={`${kind}-repeat-count`}
      data-testid={`${kind}-repeat-count-card`}
      data-interaction-status={repeatCountPlots.interaction.interaction_status}
      role="group"
      aria-label={
        sourceContext
          ? `Static ${
              kind === 'allele' ? 'repeat-size' : 'size-pair'
            } plot and controls; does not filter the source-ALT index`
          : `Static ${kind} repeat-count plot and controls; does not filter the source-ALT index`
      }
    >
      {kind === 'allele' ? (
        <>
          <h3>{sourceContext ? 'Repeat-size distribution' : 'Allele repeat-count distribution'}</h3>
          <LongReadAlleleSizeDistributionSection
            variantId={variantId}
            alleleSizeDistribution={repeatCountPlots.allele_size_distribution}
            maxRepunits={repeatCountPlots.max_repunits || 0}
            repeatUnit={repeatCountPlots.repeat_unit || undefined}
            headingLevel="h4"
            heading={sourceContext ? 'Source-size plot' : 'Repeat-count plot'}
            compact
            focusObservedDomain
            showHelp={false}
            sourceContext={sourceContext}
            yAxisLabel={sourceContext ? 'Measured allele observations' : 'Called allele copies'}
          />
        </>
      ) : (
        <>
          <h3>{sourceContext ? 'Size-pair distribution' : 'Genotype repeat-count distribution'}</h3>
          <LongReadGenotypeDistributionSection
            variantId={variantId}
            genotypeDistribution={repeatCountPlots.genotype_distribution}
            headingLevel="h4"
            heading={sourceContext ? 'Source-size-pair plot' : 'Repeat-count plot'}
            compact
            focusObservedDomain
            showHelp={false}
            sourceContext={sourceContext}
          />
        </>
      )}
      {lengthAxisControl}
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
  plotHeight,
  lengthAxisControl = null,
}: {
  motifs: string[]
  selectedMotifIndex: number
  bins: ExactStoredMotifDistributionBin[]
  activeMarkIds: Set<string>
  onSelectMotifIndex: (motifIndex: number) => void
  onSelectBins: (bins: ExactStoredMotifDistributionBin[]) => void
  onClear: () => void
  // The height of the other plots in the row, so all of them line up.
  plotHeight: number
  // The plot's own Length axis menu, drawn at the bottom of the card.
  lengthAxisControl?: React.ReactNode
}) => {
  const motif = motifs[selectedMotifIndex]
  const brushMarks: DiscreteBrushMark<ExactStoredMotifDistributionBin>[] = bins.map((bin) => ({
    id: `motif-occurrence:${selectedMotifIndex}:${bin.longest_pure_run}`,
    x: bin.longest_pure_run,
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
        <>
          <HistogramChartWithXAxisTitle>
            <HistogramYScale aria-hidden="true" $height={plotHeight}>
              <AxisTitle $left={yAxisTitleLeft(ticks.map((tick) => tick.toLocaleString()))}>
                Called source ALT copies
              </AxisTitle>
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
              aria-label={`${motif} longest pure run histogram for whole represented source ALTs`}
              tabIndex={0}
            >
              <HistogramScrollContent style={{ width: scrollWidth }}>
                <Histogram $height={plotHeight} $gap={gap} {...brush.containerProps}>
                  {bins.map((bin, index) => {
                    const mark = brushMarks.find(
                      (candidate) => candidate.value.longest_pure_run === bin.longest_pure_run
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
                        key={bin.longest_pure_run}
                        data-discrete-brush-id={markProps['data-discrete-brush-id']}
                        type="button"
                        $height={barHeight}
                        $hasValue={bin.allele_copies > 0}
                        $width={barWidth}
                        $gap={gap}
                        // The allele length histogram's colors for ALT alleles.
                        $fill={ALT_ALLELE_SIZE_BAR_COLOR}
                        $selectedFill={SELECTED_ALLELE_SIZE_BAR_COLOR}
                        $selected={selected}
                        aria-pressed={selected}
                        aria-label={`${motif}; longest pure run of ${counted(
                          bin.longest_pure_run,
                          'copy',
                          'copies'
                        )} in each whole represented source ALT; ${counted(
                          bin.allele_copies,
                          'called source ALT copy',
                          'called source ALT copies'
                        )} in this view; ${exactAltSequences(
                          bin.allele_ids.length
                        )}; filter the source-ALT index to this bin`}
                        onClick={(event) => {
                          if (!markProps.onClick(event)) onSelectBins([bin])
                        }}
                        onKeyDown={(event) => markProps.onKeyDown(event)}
                      >
                        <BarExactCount>{bin.allele_ids.length}</BarExactCount>
                        {(selectionStart || selectionStop) && (
                          <HistogramSelectionBoundary
                            aria-hidden="true"
                            data-testid="motif-occurrence-selection-boundary"
                            $height={plotHeight}
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
                    <MotifOccurrenceTick key={bin.longest_pure_run}>
                      {bin.longest_pure_run.toLocaleString()}
                    </MotifOccurrenceTick>
                  ))}
                </MotifOccurrenceAxis>
              </HistogramScrollContent>
            </HistogramScroller>
          </HistogramChartWithXAxisTitle>
          <HistogramXAxisTitle aria-hidden="true">Longest pure run (repeats)</HistogramXAxisTitle>
        </>
      ) : (
        <p role="status">No called source ALT copies in the current frequency slice.</p>
      )}
      {lengthAxisControl}
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
  filterContract: LongReadTrFilterContract
  sourceRecordOrder?: string[]
}) => {
  const admittedRepeatCountPlots =
    repeatPlotAvailable(repeatCountPlots, 'allele') ||
    repeatPlotAvailable(repeatCountPlots, 'genotype')
      ? repeatCountPlots
      : undefined
  const admittedGenotypeLandscape =
    genotypeLandscape?.status === 'AVAILABLE' ? genotypeLandscape : undefined
  const admittedPrimaryMotifMeasurement = primaryMotifMeasurementAvailable(primaryMotifMeasurement)
    ? primaryMotifMeasurement
    : undefined
  const admittedPrimaryMotifGenotype = primaryMotifGenotypeAvailable(primaryMotifMeasurement)
    ? primaryMotifMeasurement
    : undefined
  const repeatCountVariantId = variantId || 'lr-tr-locus'
  const [selectedContractAncestryId, setSelectedContractAncestryId] = useState<string | null>(null)
  const [selectedContractSexId, setSelectedContractSexId] = useState<string | null>(null)
  const [selectedColorBy, rawSetSelectedColorBy] = useState<ColorBy | null>(null)
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleType>('linear')
  // Each plot has its own Length axis menu.
  const [requestedAlleleMeasure, setRequestedAlleleMeasure] =
    useState<LandscapeMeasure>('bp-absolute')
  const [requestedGenotypeMeasure, setRequestedGenotypeMeasure] =
    useState<LandscapeMeasure>('bp-absolute')
  const [requestedPurityMeasure, setRequestedPurityMeasure] =
    useState<LandscapeMeasure>('bp-absolute')
  const representedRefLength = representedLength?.represented_ref_length_bp ?? null
  const absoluteLengthAvailable =
    representedLength?.status === 'AVAILABLE_EXACT' &&
    representedLength.reconciliation_status === 'RECONCILED' &&
    representedRefLength != null
  const excludeValidatedSharedPadding = sharedPaddingBaseValidated(representedLength)
  const defaultMotifIndex = Math.max(0, primaryMotif ? motifs.indexOf(primaryMotif) : 0)
  const motifVocabularyKey = `${motifs.join('\u0000')}\u0001${primaryMotif || ''}`
  const [selectedMotifIndex, setSelectedMotifIndex] = useState(defaultMotifIndex)
  useEffect(() => setSelectedMotifIndex(defaultMotifIndex), [defaultMotifIndex, motifVocabularyKey])
  const contractAvailable = Boolean(
    filterContract.status !== 'UNAVAILABLE' &&
      filterContract.vocabulary_release &&
      filterContract.vocabulary_digest
  )
  const admittedAncestryGroups = useMemo(
    () =>
      contractAvailable &&
      filterContract.ancestry_mapping_status === 'APPROVED_EXACT' &&
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
      filterContract.sex_mapping_status === 'APPROVED_EXACT' &&
      filterContract.available_color_dimensions.includes('SEX')
        ? filterContract.sex_groups.filter((group) =>
            groupSupportsVisiblePlots(group, Boolean(admittedGenotypeLandscape))
          )
        : [],
    [admittedGenotypeLandscape, contractAvailable, filterContract]
  )
  const showContractAncestryControl = Boolean(
    !filterContract.ancestry_control_redundant && admittedAncestryGroups.length
  )
  const showContractSexControl = admittedSexGroups.length > 0
  const contractColorBys: ColorBy[] = [
    ...(showContractAncestryControl ? (['population'] as ColorBy[]) : []),
    ...(showContractSexControl ? (['sex'] as ColorBy[]) : []),
  ]
  const showHistogramDisplayControl = contractColorBys.length > 0
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
      (selectedColorBy === 'population' && !showContractAncestryControl) ||
      (selectedColorBy === 'sex' && !showContractSexControl)
    ) {
      rawSetSelectedColorBy(null)
    }
  }, [selectedColorBy, showContractAncestryControl, showContractSexControl])
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
  let selectedDivision: string | null = null
  if (contractSelectionActive) {
    selectedDivision =
      selectedContractFrequencyKeys.length === 1
        ? selectedContractFrequencyKeys[0]
        : '__NO_EXACT_CONTRACT_FREQUENCY_SLICE__'
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
    if (repeatPlotAvailable(admittedRepeatCountPlots, 'allele')) choices.push('repeat-count')
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
    if (repeatPlotAvailable(admittedRepeatCountPlots, 'genotype')) choices.push('repeat-count')
    if (admittedPrimaryMotifGenotype) choices.push('exact-motif')
    return choices
  }, [admittedGenotypeLandscape, admittedPrimaryMotifGenotype, admittedRepeatCountPlots])
  // A repeat measure uses the precomputed repeat-count histograms when a plot admits them, drawn
  // with the length plots, and the exact-motif product otherwise.
  const repeatViewFor = (choices: DistributionView[]) => {
    if (choices.includes('repeat-count')) return 'repeat-count' as const
    if (choices.includes('exact-motif')) return 'exact-motif' as const
    return null
  }
  // The help describes repeat measures only where some plot offers one.
  const repeatMeasureOffered = Boolean(
    repeatViewFor(alleleDistributionChoices) || repeatViewFor(genotypeDistributionChoices)
  )
  // On a variation cluster (VC) page each allele spans the whole cluster, not one repeat, so the
  // allele size axes read "VC: Allele (bp)", "VC: Long Allele (bp)" and so on.
  const alleleAxisLabelPrefix = presentation?.locus_type === 'VARIATION_CLUSTER' ? 'VC: ' : ''
  // The precomputed repeat-count histograms size each allele by its longest pure run of the
  // motif, so the REF sits at its own longest pure run. It is left unknown when the histogram
  // holds fewer alleles at that size than there are REF alleles, which would mean the two
  // sources disagree about the REF.
  const referenceLongestPureRun = admittedRepeatCountPlots
    ? longestPureMotifRun(
        referenceRepeatSequence(alleles[0]?.ref, excludeValidatedSharedPadding),
        admittedRepeatCountPlots.repeat_unit
      )
    : null
  const referenceLongestPureRunMatchesHistogram =
    admittedRepeatCountPlots != null &&
    referenceLongestPureRun != null &&
    repeatCountHistogramAllelesAt(admittedRepeatCountPlots, referenceLongestPureRun) >=
      (landscape.reference_called_alleles || 0)
  const histogramReferenceUnits = referenceLongestPureRunMatchesHistogram
    ? referenceLongestPureRun
    : null
  // The measures a plot's Length axis menu offers: bp when it has the length product, repeats
  // when it has a repeat-unit product, and each change-from-REF measure only when the REF's size
  // in that unit is known. The exact-motif plots only count units, so change from REF in repeats
  // is offered for the repeat-count histograms alone, where the REF's longest pure run is known.
  // The separate repeat-count cards, drawn when the whole-record landscape is unavailable, cannot
  // show negative counts, so change from REF needs the landscape's shared plots.
  const measureChoicesFor = (choices: DistributionView[]) => {
    const repeatView = repeatViewFor(choices)
    const repeatReferenceKnown =
      repeatView === 'repeat-count' &&
      histogramReferenceUnits != null &&
      landscape.status === 'AVAILABLE'
    const measures: LandscapeMeasure[] = []
    if (choices.includes('length') && absoluteLengthAvailable) measures.push('bp-absolute')
    if (repeatView) measures.push('repeats-absolute')
    if (choices.includes('length')) measures.push('bp-delta')
    if (repeatView && repeatReferenceKnown) measures.push('repeats-delta')
    return measures
  }
  const alleleMeasureChoices = measureChoicesFor(alleleDistributionChoices)
  const genotypeMeasureChoices = measureChoicesFor(genotypeDistributionChoices)
  // Purity comes from each exact ALT sequence, so it is only measured in bp.
  const purityMeasureChoices: LandscapeMeasure[] = absoluteLengthAvailable
    ? ['bp-absolute', 'bp-delta']
    : ['bp-delta']
  // A plot shows the requested measure when it offers it, and otherwise prefers bp over repeats.
  const measureFrom = (requested: LandscapeMeasure, choices: LandscapeMeasure[]) => {
    if (choices.includes(requested)) return requested
    return (
      choices.find((measure) => measure === 'bp-absolute') ??
      choices.find((measure) => measure === 'bp-delta') ??
      choices[0]
    )
  }
  const alleleMeasure = measureFrom(requestedAlleleMeasure, alleleMeasureChoices)
  const genotypeMeasure = measureFrom(requestedGenotypeMeasure, genotypeMeasureChoices)
  const purityMeasure = measureFrom(requestedPurityMeasure, purityMeasureChoices)
  const lengthAxisModeFor = (measure: LandscapeMeasure | undefined): LengthAxisMode =>
    measure === 'bp-absolute' || measure === 'repeats-absolute' ? 'absolute' : 'delta'
  const alleleLengthAxisMode = lengthAxisModeFor(alleleMeasure)
  const genotypeLengthAxisMode = lengthAxisModeFor(genotypeMeasure)
  const purityLengthAxisMode = lengthAxisModeFor(purityMeasure)
  const showControlSection = showContractAncestryControl || showContractSexControl
  const viewForMeasure = (
    measure: LandscapeMeasure | undefined,
    choices: DistributionView[]
  ): DistributionView | undefined => {
    if (!measure) return undefined
    return measuresLength(measure) ? 'length' : repeatViewFor(choices) || undefined
  }
  const selectedAlleleDistributionView = viewForMeasure(alleleMeasure, alleleDistributionChoices)
  const selectedGenotypeDistributionView = viewForMeasure(
    genotypeMeasure,
    genotypeDistributionChoices
  )
  // The repeat measures draw the precomputed repeat-count histograms with the same plots as the
  // bp measures, with sizes counted from the REF's longest pure run when it is known.
  const repeatCountHistogram =
    selectedAlleleDistributionView === 'repeat-count' && admittedRepeatCountPlots
      ? repeatCountHistogramBins(admittedRepeatCountPlots, histogramReferenceUnits)
      : null
  const repeatCountGenotypes =
    selectedGenotypeDistributionView === 'repeat-count' && admittedRepeatCountPlots
      ? repeatCountGenotypeLandscape(admittedRepeatCountPlots, histogramReferenceUnits)
      : null
  const histogramBins = repeatCountHistogram?.bins ?? bins
  const histogramReferenceBin = repeatCountHistogram?.referenceBin ?? referenceBin
  const histogramUnit: LengthUnit = repeatCountHistogram ? 'longest-pure-run' : 'bp'
  // The histogram's accessible name, in the measure and unit its axis shows.
  let lengthAxisName =
    alleleLengthAxisMode === 'absolute' ? 'Represented allele length (bp)' : 'Change from REF (bp)'
  if (histogramUnit === 'longest-pure-run') {
    lengthAxisName =
      alleleLengthAxisMode === 'absolute'
        ? 'Longest pure run (repeats)'
        : 'Change from REF in longest pure run (repeats)'
  }
  // The REF size on the histogram's axis. When the REF's longest pure run is unknown it is null
  // and sizes were not offset, so each size reads as its own longest pure run.
  const histogramReferenceSize = repeatCountHistogram
    ? histogramReferenceUnits
    : representedRefLength
  const lengthStyleHistogramShown =
    selectedAlleleDistributionView === 'length' || Boolean(repeatCountHistogram)
  const visiblePlotCount = 2 + (genotypeDistributionChoices.length ? 1 : 0)
  const filteredPurityPoints = (landscape.purity_points || []).flatMap((point) => {
    const allele = alleleById.get(point.allele_id)
    // An ALT the table does not list keeps the API's count of its copies. Its copies in a
    // selected ancestry or sex group are unknown, so it is then left out.
    if (!allele) return selectedDivision ? [] : [point]
    const frequencyCount = frequencyCountFor(allele)
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
  const plotGridRef = useRef<HTMLDivElement>(null)
  useAlignedPlotXAxes(plotGridRef)
  const [genotypePlotHeightPx, setGenotypePlotHeightPx] = useState<number | null>(null)
  // Changing a plot's measure can swap in a different card, which draws a new Length axis menu;
  // focus moves to that menu so a keyboard user keeps their place.
  const [lengthAxisMenuToRefocus, setLengthAxisMenuToRefocus] = useState<string | null>(null)
  useEffect(() => {
    if (!lengthAxisMenuToRefocus) return
    const menu = plotGridRef.current?.querySelector<HTMLSelectElement>(
      `select[aria-label="${lengthAxisMenuToRefocus}"]`
    )
    if (menu && document.activeElement !== menu) menu.focus()
    setLengthAxisMenuToRefocus(null)
  }, [lengthAxisMenuToRefocus])
  let selectedGenotypeAncestries: readonly string[] = []
  let selectedGenotypeSexes: readonly string[] = []
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
  // A locus with more ALT alleles than the table holds lists only its most common ones, while
  // the plots count every ALT, so a plot selection can name ALTs the table does not list.
  const selectedUnlistedAltCount = activeIndexSelection
    ? uniqueIds(
        activeIndexSelection.origin === 'genotype-length'
          ? currentGenotypeSelectionAlleleIds
          : activeIndexSelection.alleleIds
      ).filter((alleleId) => !alleleById.has(alleleId)).length
    : 0
  // A plot selection leaves focus on the plot, so Shift+Arrow and Escape keep working there; the
  // table heading is a live region that announces the new count.
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
  }
  const filterIndexToLengthBins = (selectedBins: AlleleBin[]) => {
    const ordered = [...selectedBins].sort((left, right) => left.delta - right.delta)
    if (!ordered.length) return
    activateIndexSelection({
      scope,
      origin: 'total-length',
      markIds: ordered.map((bin) => `total-length:${bin.delta}`),
      alleleIds: uniqueIds(ordered.flatMap((bin) => bin.allele_ids)),
    })
  }
  const filterIndexToMotifBins = (
    motifIndex: number,
    selectedBins: ExactStoredMotifDistributionBin[]
  ) => {
    const ordered = [...selectedBins].sort(
      (left, right) => left.longest_pure_run - right.longest_pure_run
    )
    if (!ordered.length) return
    activateIndexSelection({
      scope,
      origin: 'motif-occurrence',
      markIds: ordered.map((bin) => `motif-occurrence:${motifIndex}:${bin.longest_pure_run}`),
      alleleIds: uniqueIds(ordered.flatMap((bin) => bin.allele_ids)),
    })
  }
  const selectMotifIndex = (motifIndex: number) => {
    setSelectedMotifIndex(motifIndex)
    if (activeIndexSelection?.origin === 'motif-occurrence') setIndexSelection(null)
  }
  // Changing a plot's Length axis clears an allele index filter made in that plot when the
  // plot it was made in is replaced.
  const selectAlleleMeasure = (measure: LandscapeMeasure) => {
    setRequestedAlleleMeasure(measure)
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
  }
  const selectGenotypeMeasure = (measure: LandscapeMeasure) => {
    setRequestedGenotypeMeasure(measure)
    if (!measuresLength(measure) && activeIndexSelection?.origin === 'genotype-length') {
      setIndexSelection(null)
    }
  }
  const filterIndexToPurityPoints = (points: PurityPoint[]) => {
    if (!points.length) return
    activateIndexSelection({
      scope,
      origin: 'purity',
      markIds: points.map((point) => `purity:${point.allele_id}`),
      alleleIds: uniqueIds(points.map((point) => point.allele_id)),
    })
  }
  const filterIndexToGenotypeCells = (selectedCells: GenotypeBrushCell[]) => {
    if (!selectedCells.length) return
    const referenceId = admittedGenotypeLandscape?.reference_allele_id
    const alleleIds = uniqueIds(
      selectedCells.flatMap((cell) =>
        cell.pairs.flatMap((pair) => [pair.shorter_allele_id, pair.longer_allele_id])
      )
    ).filter((alleleId) => alleleId !== referenceId)
    activateIndexSelection({
      scope,
      origin: 'genotype-length',
      markIds: selectedCells.map((cell) => cell.markId),
      alleleIds,
    })
  }
  // Escape in a plot clears the selection and leaves focus on the plot.
  const clearIndexFilter = () => setIndexSelection(null)
  // The Show all ALT alleles button disappears once the filter is cleared, so focus moves to the
  // table heading instead of being lost.
  const showAllIndexRows = () => {
    setIndexSelection(null)
    indexHeading.current?.focus({ preventScroll: true })
  }
  useEffect(() => {
    if (previousScopeKey.current !== scopeKey) {
      previousScopeKey.current = scopeKey
      setIndexSelection(null)
    }
  }, [scopeKey])
  const totalLengthBrushMarks: DiscreteBrushMark<AlleleBin>[] = histogramBins.map((bin) => ({
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
  // A plot's own allele size measure menu, at the bottom of its card. A plot with one measure
  // has none.
  const lengthAxisControl = (
    plotTitle: string,
    measure: LandscapeMeasure | undefined,
    choices: LandscapeMeasure[],
    onSelect: (measure: LandscapeMeasure) => void
  ) =>
    measure && choices.length > 1 ? (
      <>
        <PlotLengthAxisControlSpace aria-hidden="true" />
        <PlotLengthAxisControl>
          Allele size measure:
          <Select
            aria-label={`${plotTitle} allele size measure`}
            value={measure}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              onSelect(event.target.value as LandscapeMeasure)
              if (document.activeElement === event.target) {
                setLengthAxisMenuToRefocus(`${plotTitle} allele size measure`)
              }
            }}
          >
            {choices.map((choice) => (
              <option key={choice} value={choice}>
                {landscapeMeasureLabel(choice)}
              </option>
            ))}
          </Select>
        </PlotLengthAxisControl>
      </>
    ) : null
  const alleleLengthAxisControl = lengthAxisControl(
    'Allele length distribution',
    alleleMeasure,
    alleleMeasureChoices,
    selectAlleleMeasure
  )
  const genotypeLengthAxisControl = lengthAxisControl(
    'Genotype length distribution',
    genotypeMeasure,
    genotypeMeasureChoices,
    selectGenotypeMeasure
  )
  const purityLengthAxisControl = lengthAxisControl(
    'Repeat sequence purity',
    purityMeasure,
    purityMeasureChoices,
    setRequestedPurityMeasure
  )

  if (landscape.status !== 'AVAILABLE') {
    return (
      <Panel aria-labelledby="lr-tr-allele-landscape-heading">
        <HeadingWithHelp>
          <h2 id="lr-tr-allele-landscape-heading">Allelic Landscape</h2>
          <AllelicLandscapeHelp
            showRepeatCountControls={Boolean(admittedRepeatCountPlots)}
            sourceContext={admittedRepeatCountPlots?.status === 'AVAILABLE_SOURCE_CONTEXT'}
            repeatMeasureOffered={repeatMeasureOffered}
            primaryMotifMeasurement={admittedPrimaryMotifMeasurement}
          />
        </HeadingWithHelp>
        <PlotGrid
          ref={plotGridRef}
          $plotCount={visiblePlotCount}
          data-plot-count={visiblePlotCount}
          data-testid="whole-record-allele-plot-grid"
        >
          {selectedAlleleDistributionView === 'repeat-count' && admittedRepeatCountPlots && (
            <RepeatCountPlotCard
              variantId={repeatCountVariantId}
              repeatCountPlots={admittedRepeatCountPlots}
              kind="allele"
              lengthAxisControl={alleleLengthAxisControl}
            />
          )}
          {selectedAlleleDistributionView === 'exact-motif' && admittedPrimaryMotifMeasurement && (
            <PrimaryMotifAllelePlotCard
              measurement={admittedPrimaryMotifMeasurement}
              lengthAxisControl={alleleLengthAxisControl}
            />
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
              lengthAxisMode={genotypeLengthAxisMode}
              representedRefLength={representedRefLength}
              alleleAxisLabelPrefix={alleleAxisLabelPrefix}
              lengthAxisControl={genotypeLengthAxisControl}
            />
          )}
          {selectedGenotypeDistributionView === 'repeat-count' && admittedRepeatCountPlots && (
            <RepeatCountPlotCard
              variantId={repeatCountVariantId}
              repeatCountPlots={admittedRepeatCountPlots}
              kind="genotype"
              lengthAxisControl={genotypeLengthAxisControl}
            />
          )}
          {selectedGenotypeDistributionView === 'exact-motif' && admittedPrimaryMotifGenotype && (
            <PrimaryMotifGenotypeCells
              measurement={admittedPrimaryMotifGenotype}
              lengthAxisControl={genotypeLengthAxisControl}
            />
          )}
          <PlotCard data-plot-card="motif-purity">
            <h3>Repeat sequence purity</h3>
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
    if (!contractSelectionActive) return bin.called_alleles
    return bin.stacks
      .filter(matchingContractFrequencyKeys)
      .reduce((sum, stack) => sum + stack.called_alleles, 0)
  }
  const counts = histogramBins.map(alleleCopiesInView)
  // REF copies join the bar at 0 change from REF, stacked above any ALT copies of the same size.
  const referenceCopiesInView = alleleCopiesInView(histogramReferenceBin)
  const referenceCounts = histogramBins.map((bin) => (bin.delta === 0 ? referenceCopiesInView : 0))
  const barTotals = counts.map((count, index) => count + referenceCounts[index])
  const maxCount = Math.max(0, ...barTotals)
  const yTicks = histogramTicks(maxCount, selectedScaleType)
  let colorCategories: { id: string; label: string; group: LongReadTrFilterGroup }[] = []
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
  const segmentsForBin = (bin: AlleleBin) =>
    colorCategories.map((category) => {
      const matchingStacks = bin.stacks.filter((stack) => {
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
  let histogramLayout = histogramLayoutForBinCount(histogramBins.length)
  // When the genotype heatmap is shown, the histogram and the purity plot are as tall as its
  // square of cells, so all three plots in the row have the same height.
  const genotypeHeatmapLandscape =
    repeatCountGenotypes ??
    (selectedGenotypeDistributionView === 'length' ? admittedGenotypeLandscape : undefined)
  const genotypeHeatmapShown = Boolean(genotypeHeatmapLandscape)
  if (genotypeHeatmapShown && genotypePlotHeightPx) {
    histogramLayout = { ...histogramLayout, height: genotypePlotHeightPx }
  }
  // The purity dots stand for every ALT dot's copies plus the REF dot's, when the REF's purity is
  // known. The REF copies come from the bp REF bin, not the histogram's current one: in the
  // repeats measure that also holds ALT alleles with the REF's longest pure run.
  const referenceCopiesForPurity = alleleCopiesInView(referenceBin)
  const purityAllelesInView =
    filteredPurityPoints.reduce((sum, point) => sum + point.called_alleles, 0) +
    (landscape.reference_purity != null ? referenceCopiesForPurity : 0)

  return (
    <Panel aria-labelledby="lr-tr-allele-landscape-heading">
      <HeadingWithHelp>
        <h2 id="lr-tr-allele-landscape-heading">Allelic Landscape</h2>
        {/* Repeat counts are drawn in the shared plots here, not in cards with their own
            controls, so the help does not describe card controls. */}
        <AllelicLandscapeHelp
          sourceContext={admittedRepeatCountPlots?.status === 'AVAILABLE_SOURCE_CONTEXT'}
          repeatMeasureOffered={repeatMeasureOffered}
          showLengthAxisControl={Boolean(
            alleleLengthAxisControl || genotypeLengthAxisControl || purityLengthAxisControl
          )}
          showAncestryControl={showContractAncestryControl}
          showSexControl={showContractSexControl}
          showHistogramDisplayControl={showHistogramDisplayControl}
          primaryMotifMeasurement={admittedPrimaryMotifMeasurement}
        />
      </HeadingWithHelp>
      {showControlSection && (
        <LandscapeControls role="group" aria-label="Allelic Landscape controls">
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
          {contractColorBys.length > 0 && lengthStyleHistogramShown && (
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
      {selectedColorBy && lengthStyleHistogramShown && (
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
      <PlotGrid
        ref={plotGridRef}
        $plotCount={visiblePlotCount}
        data-plot-count={visiblePlotCount}
        data-testid="whole-record-allele-plot-grid"
      >
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
              plotHeight={histogramLayout.height}
              lengthAxisControl={alleleLengthAxisControl}
            />
          )}
        {selectedAlleleDistributionView === 'exact-motif' &&
          !admittedMotifDistribution &&
          admittedPrimaryMotifMeasurement && (
            <PrimaryMotifAllelePlotCard
              measurement={admittedPrimaryMotifMeasurement}
              lengthAxisControl={alleleLengthAxisControl}
            />
          )}
        {lengthStyleHistogramShown && (
          <PlotCard data-plot-card="total-length-histogram">
            <h3>Allele length distribution</h3>
            <p aria-live="polite">
              <strong>Sizes of {counted(totalInView, 'allele', 'alleles')}</strong>
            </p>
            {histogramReferenceBin.called_alleles > 0 && (
              <p aria-label="Allele length histogram colors">
                <AlleleSizeColorSwatch aria-hidden="true" $color={REF_ALLELE_SIZE_BAR_COLOR} />
                {/* The repeat histograms cannot tell REF alleles from ALT alleles of the same
                    repeat count, so their orange bar is every allele of the REF size. */}
                {repeatCountHistogram ? 'REF size' : 'REF allele'}
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
            {clippedAt && barTotals.some((count) => count > clippedAt) && (
              <PlotNoteAbovePlot role="status">
                Bars above {clippedAt.toLocaleString()} copies are clipped; exact counts remain in
                labels and tables.
              </PlotNoteAbovePlot>
            )}
            <MeasuredWidth>
              {(measuredWidth) => {
                const { barWidth, gap: barGap } = fittedHistogramBars(
                  measuredWidth,
                  histogramBins.length,
                  histogramLayout
                )
                const histogramContentWidth =
                  histogramBins.length * barWidth + Math.max(0, histogramBins.length - 1) * barGap
                const histogramScrollableWidth = histogramContentWidth + HISTOGRAM_SIDE_PADDING * 2
                const deltaAxisTicks = histogramDeltaAxisTicks(
                  histogramBins.map((bin) => bin.delta),
                  barWidth,
                  barGap,
                  (delta) =>
                    lengthAxisTickLabel(delta, alleleLengthAxisMode, histogramReferenceSize)
                )
                const deltaAxisHeight =
                  AXIS_LABEL_FONT_PX +
                  15 +
                  Math.max(0, ...deltaAxisTicks.map((tick) => tick.lane)) *
                    HISTOGRAM_X_TICK_LANE_HEIGHT
                // A bar holding only REF copies is labeled "REF" above its count.
                const referenceOnlyBarShown = histogramBins.some(
                  (bin, index) => isReferenceOnlyBin(bin) && barTotals[index] > 0
                )
                const longestBarLabelLength = Math.max(
                  referenceOnlyBarShown ? 'REF'.length : 1,
                  ...barTotals.map((total) => total.toLocaleString().length)
                )
                const barLabelFontPx = countLabelFontPx(barWidth, longestBarLabelLength)
                // Bars too narrow for their labels, even spilling into the gaps beside them, leave
                // the counts to the bars' tooltips.
                const barLabelsFit =
                  longestBarLabelLength * 0.6 * barLabelFontPx <= barWidth + barGap
                const barLabelHeadroom = Math.ceil(
                  (referenceOnlyBarShown ? 2 : 1) * 1.2 * barLabelFontPx + 6
                )
                return (
                  <HistogramSizer data-x-axis-aligned-plot="true">
                    <HistogramChartWithXAxisTitle
                      data-bin-count={histogramBins.length}
                      data-bar-width={barWidth}
                    >
                      <HistogramYScale
                        aria-hidden="true"
                        $height={histogramLayout.height}
                        style={{ marginTop: barLabelHeadroom }}
                      >
                        <AxisTitle
                          $left={yAxisTitleLeft(yTicks.map((tick) => tick.toLocaleString()))}
                        >
                          # of alleles
                        </AxisTitle>
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
                            data-x-axis-line="true"
                            $height={histogramLayout.height}
                            $gap={barGap}
                            {...totalLengthBrush.containerProps}
                          >
                            {/* Grid lines at the y ticks above 0, where the x axis already is,
                                like the purity plot's. */}
                            {yTicks
                              .filter((tick) => tick > 0)
                              .map((tick) => (
                                <HistogramGridLine
                                  key={tick}
                                  aria-hidden="true"
                                  data-testid="histogram-grid-line"
                                  style={{
                                    bottom: `${histogramHeightPercent(
                                      tick,
                                      maxCount,
                                      selectedScaleType
                                    )}%`,
                                  }}
                                />
                              ))}
                            {histogramBins.map((bin, index) => {
                              const count = counts[index]
                              const referenceCount = referenceCounts[index]
                              const barTotal = barTotals[index]
                              const referenceOnly = isReferenceOnlyBin(bin)
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
                                alleleLengthAxisMode,
                                histogramReferenceSize,
                                histogramUnit
                              )
                              const referenceCopiesText = repeatCountHistogram
                                ? counted(
                                    referenceCount,
                                    'allele of the REF size',
                                    'alleles of the REF size'
                                  )
                                : counted(referenceCount, 'REF allele copy', 'REF allele copies')
                              const altSummary = `${calledAlleleCopies(
                                count,
                                true
                              )} in this view; ${exactAltSequences(bin.exact_alt_count)}`
                              let ariaLabel = `${lengthLabel}; ${referenceCopiesText} in this view`
                              // Repeat-count bars carry no allele ids, so they only report counts.
                              if (repeatCountHistogram && !referenceOnly) {
                                ariaLabel = `${lengthLabel}; ${counted(
                                  count,
                                  'allele',
                                  'alleles'
                                )} in this view`
                              } else if (!referenceOnly) {
                                ariaLabel = `${lengthLabel}; ${
                                  referenceCount > 0 ? `${referenceCopiesText}; ` : ''
                                }${altSummary}; filter the source-ALT index to this length bin`
                              }
                              return (
                                <BarButton
                                  key={bin.delta}
                                  data-discrete-brush-id={markProps['data-discrete-brush-id']}
                                  type="button"
                                  disabled={referenceOnly || Boolean(repeatCountHistogram)}
                                  $height={height}
                                  $hasValue={barTotal > 0}
                                  $width={barWidth}
                                  $gap={barGap}
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
                                  {barLabelsFit && (
                                    <BarExactCount style={{ fontSize: barLabelFontPx }}>
                                      {/* The label is the bar height: alleles in this view. */}
                                      {referenceOnly && (
                                        <>
                                          REF
                                          <br />
                                        </>
                                      )}
                                      {barTotal.toLocaleString()}
                                    </BarExactCount>
                                  )}
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
                                  alleleLengthAxisMode,
                                  histogramReferenceSize
                                ).toLocaleString()} ${histogramUnit === 'bp' ? 'bp' : 'copy'} tick`}
                                data-delta={tick.delta}
                                data-testid="whole-record-delta-axis-tick"
                                $lane={tick.lane}
                                $left={tick.left + HISTOGRAM_SIDE_PADDING}
                              >
                                {lengthAxisTickLabel(
                                  tick.delta,
                                  alleleLengthAxisMode,
                                  histogramReferenceSize
                                )}
                              </HistogramXTick>
                            ))}
                          </HistogramXAxis>
                        </HistogramScrollContent>
                      </HistogramScroller>
                    </HistogramChartWithXAxisTitle>
                    <HistogramXAxisTitle aria-hidden="true">
                      {lengthAxisTitle(
                        `${alleleAxisLabelPrefix}Allele`,
                        alleleLengthAxisMode,
                        histogramUnit
                      )}
                    </HistogramXAxisTitle>
                  </HistogramSizer>
                )
              }}
            </MeasuredWidth>
            {alleleLengthAxisControl}
          </PlotCard>
        )}
        {/* One heatmap element for both the bp and the repeat-count genotypes, so switching
            measures updates the same heatmap. A new one would first be drawn before measuring
            its width, and jump. The repeat-count squares carry no allele ids to filter by. */}
        {genotypeHeatmapLandscape && (
          <WholeRecordGenotypeLandscape
            landscape={genotypeHeatmapLandscape}
            cohort={scope.cohort}
            selectedPopulations={selectedGenotypeAncestries}
            selectedSexes={selectedGenotypeSexes}
            activeMarkIds={repeatCountGenotypes ? undefined : activeMarkIds}
            onSelectCells={repeatCountGenotypes ? undefined : filterIndexToGenotypeCells}
            onClear={repeatCountGenotypes ? undefined : clearIndexFilter}
            lengthAxisMode={genotypeLengthAxisMode}
            representedRefLength={
              repeatCountGenotypes ? histogramReferenceUnits : representedRefLength
            }
            unit={repeatCountGenotypes ? 'longest-pure-run' : 'bp'}
            referenceSizeKnown={repeatCountGenotypes ? histogramReferenceUnits != null : true}
            cellsClickable={!repeatCountGenotypes}
            alleleAxisLabelPrefix={alleleAxisLabelPrefix}
            onPlotHeightChange={setGenotypePlotHeightPx}
            lengthAxisControl={genotypeLengthAxisControl}
          />
        )}
        {selectedGenotypeDistributionView === 'exact-motif' && admittedPrimaryMotifGenotype && (
          <PrimaryMotifGenotypeCells
            measurement={admittedPrimaryMotifGenotype}
            lengthAxisControl={genotypeLengthAxisControl}
          />
        )}
        <PlotCard data-plot-card="motif-purity">
          <h3>Repeat sequence purity</h3>
          {landscape.purity_available && (
            <p aria-live="polite">
              <strong>Purity of {counted(purityAllelesInView, 'allele', 'alleles')}</strong>
            </p>
          )}
          {landscape.purity_available ? (
            <PurityScatter
              points={filteredPurityPoints}
              plotHeight={histogramLayout.height}
              slotDeltas={bins.map((bin) => bin.delta)}
              selectedAllele={selectedAllele}
              activeMarkIds={activeMarkIds}
              onSelectPoints={filterIndexToPurityPoints}
              onClear={clearIndexFilter}
              lengthAxisMode={purityLengthAxisMode}
              representedRefLength={representedRefLength}
              alleleAxisLabelPrefix={alleleAxisLabelPrefix}
              referencePurity={landscape.reference_purity ?? null}
              referenceCalledAlleles={referenceCopiesForPurity}
            />
          ) : (
            <p role="status">
              Purity unavailable: {unavailableReason(landscape.purity_unavailable_reason)}.
            </p>
          )}
          {landscape.purity_available && purityLengthAxisControl}
        </PlotCard>
      </PlotGrid>
      <ExactAlleleIndex
        alleles={indexedAlleles}
        totalExactAlts={landscape.exact_alt_count || alleles.length}
        listedAltCount={alleles.length}
        selectedUnlistedAltCount={selectedUnlistedAltCount}
        selectedUnlistedCountIsUpperBound={contractSelectionActive}
        filtered={activeIndexSelection != null}
        motifs={motifs}
        selectedAllele={selectedAllele}
        navigation={navigation}
        selectedAlleleDetail={selectedAlleleDetail}
        selectedDivision={selectedDivision}
        sequenceCardinality={sequenceCardinality}
        sourceRecordOrder={sourceRecordOrder}
        excludeValidatedSharedPadding={excludeValidatedSharedPadding}
        representedRefLength={representedRefLength}
        sequencesAvailable={sequencesAvailable}
        sequencesUnavailableReason={sequencesUnavailableReason}
        headingRef={indexHeading}
        onClearFilter={showAllIndexRows}
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

// Passes a plot height that is only known while drawing up to the parent, after the draw.
const ReportPlotHeight = ({
  heightPx,
  onChange,
}: {
  heightPx: number
  onChange?: (heightPx: number) => void
}) => {
  useEffect(() => {
    if (onChange) onChange(heightPx)
  }, [heightPx, onChange])
  return null
}

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

// People in the genotype plot under the given filters.
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

export type GenotypeBrushCell = {
  markId: string
  shorterDelta: number
  longerDelta: number
  // The cell's allele pairs under the current filters.
  pairs: GenotypePair[]
}

export const WholeRecordGenotypeLandscape = ({
  landscape,
  selectedPopulations = [],
  selectedSexes = [],
  activeMarkIds = new Set<string>(),
  onSelectCells,
  onClear = () => {},
  lengthAxisMode = 'delta',
  representedRefLength = null,
  unit = 'bp',
  referenceSizeKnown = true,
  cellsClickable = true,
  alleleAxisLabelPrefix = '',
  onPlotHeightChange,
  lengthAxisControl = null,
  cohort,
}: {
  landscape: WholeRecordGenotypeLandscapeData
  // The page's cohort, which decides how an unavailable landscape is explained.
  cohort?: string
  // The source metadata keys of the selected ancestry and sex groups; empty for all.
  selectedPopulations?: readonly string[]
  selectedSexes?: readonly string[]
  activeMarkIds?: Set<string>
  onSelectCells?: (cells: GenotypeBrushCell[]) => void
  onClear?: () => void
  lengthAxisMode?: LengthAxisMode
  representedRefLength?: number | null
  unit?: LengthUnit
  // False when the sizes are not relative to a known REF size, so 0 is not the REF size.
  referenceSizeKnown?: boolean
  // False for the repeat-count histograms, which carry no allele ids to filter the source-ALT
  // index by; their squares then only show their counts on hover.
  cellsClickable?: boolean
  // "VC: " on a variation cluster page, where each allele spans the whole cluster.
  alleleAxisLabelPrefix?: string
  // Receives the on-screen height in pixels of the square of cells, so the other plots can match.
  onPlotHeightChange?: (heightPx: number) => void
  // The plot's own Length axis menu, drawn at the bottom of the card.
  lengthAxisControl?: React.ReactNode
}) => {
  const sourceCells = landscape.cells || []
  const cells = sourceCells
    .map((cell) => ({
      ...cell,
      selectedPairs: filteredPairs(cell.pairs, selectedPopulations, selectedSexes),
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
          Genotype landscape unavailable: {unavailableReason(landscape.reason_code, cohort)}.
        </p>
      </PlotCard>
    )
  }

  const cellTooltip = (cell: { selectedPeople: number }, longer: number, shorter: number) =>
    `${lengthAxisLabel(longer, lengthAxisMode, representedRefLength, unit)} × ${lengthAxisLabel(
      shorter,
      lengthAxisMode,
      representedRefLength,
      unit
    )}: ${counted(cell.selectedPeople, 'person', 'people')}`
  const values = [
    ...new Set([
      ...(referenceSizeKnown ? [0] : []),
      ...sourceCells.flatMap((cell) => [cell.shorter_delta, cell.longer_delta]),
    ]),
  ].sort((a, b) => a - b)
  const maxPeople = Math.max(1, ...cells.map((cell) => cell.selectedPeople))
  const keyFor = (cell: GenotypeCell) => `${cell.shorter_delta}/${cell.longer_delta}`
  const totalPeople = genotypeLandscapePeopleCount(sourceCells, selectedPopulations, selectedSexes)
  const byCoordinate = new Map(cells.map((cell) => [keyFor(cell), cell]))
  const heatmapWidth = 720
  const heatmapHeight = 650
  const heatmapTop = 18
  const heatmapRight = 18
  const valueIndex = new Map(values.map((value, index) => [value, index]))
  // Tick candidates in priority order: REF, the two ends, then the rest. A tick is drawn only if
  // it clears the labels already placed, so labels never overlap. Picking squares does not change
  // the ticks, so the labels stay put.
  const axisValueCandidates = [
    ...new Set(
      [0, values[0], values[values.length - 1], ...values].filter((value) => valueIndex.has(value))
    ),
  ]
  const axisValueLabel = (value: number) =>
    lengthAxisTickLabel(value, lengthAxisMode, representedRefLength)
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
        <PlotLegendAbovePlot aria-label="Logarithmic people intensity legend">
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
        </PlotLegendAbovePlot>
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
              const xTickMarkLength = 5 * svgUnitsPerPixel
              const xTickLabelOffset = axisFontSize + xTickMarkLength
              // Below the x tick labels: their glyphs' descent, a gap, and the x axis title.
              const heightBelowXTickLabels =
                axisFontSize * 0.25 + 4 * svgUnitsPerPixel + axisFontSize + 8 * svgUnitsPerPixel
              const plotSizeFor = (heatmapBottom: number) =>
                Math.min(
                  heatmapWidth - heatmapLeft - heatmapRight,
                  heatmapHeight - heatmapTop - heatmapBottom
                )
              // Squares are never wider than the histogram's widest bar; with few sizes the grid
              // of squares sits centered in the plot, whose axes keep their full length.
              const bandFor = (plotSize: number) =>
                Math.min(
                  plotSize / Math.max(1, values.length),
                  MAX_PLOT_BAR_WIDTH_PX * svgUnitsPerPixel
                )
              // x tick labels lie flat, like the histogram's, when the longest one fits under a
              // square. Otherwise they are rotated 48 degrees and end at their anchor point, so they
              // reach width * sin(48) below it. Flat labels free that height for a larger plot.
              const rotatedXTickLabelsHeatmapBottom =
                xTickLabelOffset + longestAxisValueLabelWidth * 0.74 + heightBelowXTickLabels
              const xTickLabelsFlat =
                bandFor(plotSizeFor(rotatedXTickLabelsHeatmapBottom)) >=
                longestAxisValueLabelWidth + TICK_LABEL_GAP * svgUnitsPerPixel
              const heatmapBottom = xTickLabelsFlat
                ? xTickLabelOffset + heightBelowXTickLabels
                : rotatedXTickLabelsHeatmapBottom
              const plotSize = plotSizeFor(heatmapBottom)
              const band = bandFor(plotSize)
              const gridInset = (plotSize - band * values.length) / 2
              const xFor = (value: number) =>
                heatmapLeft + gridInset + (valueIndex.get(value) || 0) * band
              const yFor = (value: number) =>
                heatmapTop + gridInset + (values.length - 1 - (valueIndex.get(value) || 0)) * band
              // Rotated x labels need about 1.5 font sizes of horizontal room to clear each other,
              // and flat ones each fit under their own square; the y labels need less, so one
              // spacing fits all of them.
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
                      (other) => Math.abs(xFor(value) - xFor(other)) >= minimumAxisLabelSpacing
                    )
                      ? [...placed, value]
                      : placed,
                  []
                )
                .sort((left, right) => left - right)
              // Every square of the grid, top row first. The squares are drawn first, then the
              // REF guide lines over them, then the people counts over the lines.
              const squares = [...values].reverse().flatMap((shorter) =>
                values.map((longer) => {
                  const key = `${shorter}/${longer}`
                  const cell = byCoordinate.get(key)
                  const markId = `genotype-length:${key}`
                  return {
                    shorter,
                    longer,
                    key,
                    cell,
                    markId,
                    selected: Boolean(
                      cell && (activeMarkIds.has(markId) || brush.previewMarkIds.has(markId))
                    ),
                    intensity: cell
                      ? Math.log(cell.selectedPeople + 1) / Math.log(maxPeople + 1)
                      : 0,
                  }
                })
              )
              return (
                <HeatmapSizer data-x-axis-aligned-plot="true">
                  {svgWidth > 0 && (
                    <ReportPlotHeight
                      heightPx={Math.round(plotSize / svgUnitsPerPixel)}
                      onChange={onPlotHeightChange}
                    />
                  )}
                  <HeatmapSvg
                    viewBox={`0 0 ${heatmapWidth} ${heatmapHeight}`}
                    {...(cellsClickable ? brush.containerProps : {})}
                    role="group"
                    aria-label={`Genotype distribution by ${
                      lengthAxisMode === 'absolute'
                        ? 'represented allele length'
                        : 'change from REF'
                    }`}
                  >
                    {squares.map(({ shorter, longer, key, cell, markId, selected, intensity }) => {
                      const mark = brushMarks.find((candidate) => candidate.id === markId)
                      let cellFill = cell ? LONG_READ_PRIMARY_PLOT_COLOR : '#f5f7f8'
                      let cellFillOpacity = cell ? 0.15 + 0.85 * intensity : 1
                      // Picked squares are navy with a dark border, like picked histogram bars,
                      // so a pick never reads as the orange REF.
                      if (selected) {
                        cellFill = SELECTED_ALLELE_SIZE_BAR_COLOR
                        cellFillOpacity = 1
                      }
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
                            stroke={selected ? '#222' : '#fff'}
                            strokeWidth={selected ? 2 : 1}
                            pointerEvents="none"
                            aria-hidden="true"
                          />
                          {cell && cellsClickable && (
                            <rect
                              role="button"
                              tabIndex={0}
                              aria-pressed={selected}
                              aria-label={`${lengthAxisLabel(
                                longer,
                                lengthAxisMode,
                                representedRefLength,
                                unit
                              )} longer allele, ${lengthAxisLabel(
                                shorter,
                                lengthAxisMode,
                                representedRefLength,
                                unit
                              )} shorter allele: ${cell.selectedPeople} ${
                                cell.selectedPeople === 1 ? 'person' : 'people'
                              }; filter the source-ALT index to this square`}
                              data-testid="genotype-length-cell-target"
                              data-discrete-brush-id={markId}
                              // Exactly the square, so a click never lands on a neighbor.
                              x={xFor(longer)}
                              y={yFor(shorter)}
                              width={band}
                              height={band}
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
                              <title>{cellTooltip(cell, longer, shorter)}</title>
                            </rect>
                          )}
                          {/* Squares that cannot be clicked still show their count on hover. */}
                          {cell && !cellsClickable && (
                            <rect
                              data-testid="genotype-length-cell-tooltip"
                              x={xFor(longer) + 1}
                              y={yFor(shorter) + 1}
                              width={Math.max(1, band - 2)}
                              height={Math.max(1, band - 2)}
                              fill="transparent"
                            >
                              <title>{cellTooltip(cell, longer, shorter)}</title>
                            </rect>
                          )}
                        </React.Fragment>
                      )
                    })}
                    {/* REF guide lines cross at the center of the REF/REF square. */}
                    {referenceSizeKnown && valueIndex.has(0) && (
                      <>
                        <line
                          data-testid="genotype-length-reference-line"
                          x1={xFor(0) + band / 2}
                          y1={heatmapTop}
                          x2={xFor(0) + band / 2}
                          y2={heatmapTop + plotSize}
                          stroke="#89939a"
                          strokeDasharray="4 4"
                          pointerEvents="none"
                        />
                        <line
                          data-testid="genotype-length-reference-line"
                          x1={heatmapLeft}
                          y1={yFor(0) + band / 2}
                          x2={heatmapLeft + plotSize}
                          y2={yFor(0) + band / 2}
                          stroke="#89939a"
                          strokeDasharray="4 4"
                          pointerEvents="none"
                        />
                      </>
                    )}
                    {cellLabelsFit &&
                      squares.map(
                        ({ shorter, longer, key, cell, selected, intensity }) =>
                          cell && (
                            <text
                              key={key}
                              x={xFor(longer) + band / 2}
                              y={yFor(shorter) + band / 2 + 0.35 * cellLabelFontSize}
                              fill={selected || intensity > 0.78 ? '#fff' : '#111'}
                              fontSize={cellLabelFontSize}
                              textAnchor="middle"
                              pointerEvents="none"
                              aria-hidden="true"
                            >
                              {cell.selectedPeople}
                            </text>
                          )
                      )}
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
                        stroke="#222"
                        strokeWidth={3}
                        pointerEvents="none"
                      />
                    )}
                    {axisValues.map((value) => (
                      <React.Fragment key={value}>
                        <line
                          data-testid="genotype-length-x-tick-mark"
                          x1={xFor(value) + band / 2}
                          y1={heatmapTop + plotSize}
                          x2={xFor(value) + band / 2}
                          y2={heatmapTop + plotSize + xTickMarkLength}
                          stroke={PLOT_AXIS_LINE_COLOR}
                        />
                        <text
                          data-testid="genotype-length-x-tick-label"
                          x={xFor(value) + band / 2}
                          y={heatmapTop + plotSize + xTickLabelOffset}
                          fill="#566168"
                          fontSize={axisFontSize}
                          textAnchor={xTickLabelsFlat ? 'middle' : 'end'}
                          transform={
                            xTickLabelsFlat
                              ? undefined
                              : `rotate(-48 ${xFor(value) + band / 2} ${
                                  heatmapTop + plotSize + xTickLabelOffset
                                })`
                          }
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
                      data-x-axis-line="true"
                      x1={heatmapLeft}
                      y1={heatmapTop + plotSize}
                      x2={heatmapLeft + plotSize}
                      y2={heatmapTop + plotSize}
                      stroke={PLOT_AXIS_LINE_COLOR}
                    />
                    <line
                      x1={heatmapLeft}
                      y1={heatmapTop}
                      x2={heatmapLeft}
                      y2={heatmapTop + plotSize}
                      stroke={PLOT_AXIS_LINE_COLOR}
                    />
                    <text
                      x={heatmapLeft + plotSize / 2}
                      y={heatmapTop + plotSize + heatmapBottom - 8 * svgUnitsPerPixel}
                      fill="#566168"
                      fontSize={axisFontSize}
                      textAnchor="middle"
                    >
                      {lengthAxisTitle(`${alleleAxisLabelPrefix}Long Allele`, lengthAxisMode, unit)}
                    </text>
                    <text
                      x={yAxisTitleX}
                      y={heatmapTop + plotSize / 2}
                      fill="#566168"
                      fontSize={axisFontSize}
                      textAnchor="middle"
                      transform={`rotate(-90 ${yAxisTitleX} ${heatmapTop + plotSize / 2})`}
                    >
                      {lengthAxisTitle(
                        `${alleleAxisLabelPrefix}Short Allele`,
                        lengthAxisMode,
                        unit
                      )}
                    </text>
                  </HeatmapSvg>
                </HeatmapSizer>
              )
            }}
          </MeasuredWidth>
        </HeatmapFigure>
        {lengthAxisControl}
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
  background: #fff;
  outline: ${(props) => (props.selected ? `2px solid ${SELECTED_ALLELE_OUTLINE_COLOR}` : 'none')};
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

// Every row's allele bar is drawn inside the same frame, so one base has the same width in
// every row and a bar's length is proportional to its allele's size.
const MotifPreviewFrame = styled.div`
  width: 100%;
  max-width: 420px;
`

const MotifPreview = styled.svg`
  display: block;
  height: 18px;
  border: 1px solid #d8dee2;
  background: #fff;
`

const ExactAlleleMotifPreview = ({
  allele,
  motifs,
  excludeValidatedSharedPadding = false,
  longestAlleleBases,
}: {
  allele: LongReadTrAllele
  motifs: string[]
  excludeValidatedSharedPadding?: boolean
  // The longest allele in the table, in bases; its bar fills the frame.
  longestAlleleBases: number
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
    <MotifPreviewFrame>
      <MotifPreview
        role="img"
        aria-label={`${alleleLabel(
          allele.variant_id
        )} exact stored-motif string preview; ${countSummary}`}
        viewBox={`0 0 ${totalBases} 18`}
        preserveAspectRatio="none"
        style={{
          width: `${(100 * Math.min(1, totalBases / Math.max(1, longestAlleleBases))).toFixed(3)}%`,
        }}
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
    </MotifPreviewFrame>
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
  longestAlleleBases: number
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
  const purity = allele.motif_purity == null ? '—' : allele.motif_purity.toFixed(2)
  const frequency = exactAlleleFrequency(allele, data.selectedDivision)
  const ac = frequency ? Math.round(frequency.ac).toLocaleString() : '—'
  const af = frequency?.af == null ? 'Unavailable' : frequency.af.toPrecision(4)
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
          longestAlleleBases={data.longestAlleleBases}
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
  listedAltCount = alleles.length,
  selectedUnlistedAltCount = 0,
  selectedUnlistedCountIsUpperBound = false,
  filtered = false,
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
  representedRefLength = null,
}: {
  alleles: LongReadTrAllele[]
  totalExactAlts?: number
  // How many ALT alleles the table lists: the most common ones, when the locus has more than
  // one page of them.
  listedAltCount?: number
  // ALT alleles in the plot selection that the table does not list. With an ancestry or sex group
  // selected their copies in it are unknown, so the count is only an upper bound.
  selectedUnlistedAltCount?: number
  selectedUnlistedCountIsUpperBound?: boolean
  // Whether a plot selection has narrowed the table to some of the ALT alleles.
  filtered?: boolean
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
    // The bars draw each ALT without its VCF padding base.
    longestAlleleBases: Math.max(1, ...alleles.map((allele) => (allele.alt?.length || 1) - 1)),
  }
  const hasMissingIndexSequence = alleles.some((allele) => !allele.ref || !allele.alt)
  let previewUnavailableMessage: string | null = null
  if (hasMissingIndexSequence && !sequencesAvailable) {
    previewUnavailableMessage = `Motif previews are unavailable because ${unavailableReason(
      sequencesUnavailableReason
    )}.`
  } else if (alleles.length && !hasMissingIndexSequence && !excludeValidatedSharedPadding) {
    // The previews drop the VCF padding base, so they need REF and ALT to be known to share it.
    previewUnavailableMessage =
      'Motif previews are unavailable because the REF and ALT sequences were not validated to share their leading VCF padding base.'
  }
  const identityCount = sequenceCardinality?.source_alt_identity_count ?? totalExactAlts
  const selectedCount =
    alleles.length + (selectedUnlistedCountIsUpperBound ? 0 : selectedUnlistedAltCount)
  const heading = filtered
    ? `${selectedCount.toLocaleString()} of ${identityCount.toLocaleString()} non-reference alleles selected`
    : 'Allele Details'
  let unlistedNote: string | null = null
  if (listedAltCount > 0 && listedAltCount < identityCount) {
    unlistedNote = `The table lists the ${listedAltCount.toLocaleString()} ALT alleles with the highest allele counts (AC), out of ${identityCount.toLocaleString()}. The plots include all of them.`
    if (filtered && selectedUnlistedAltCount > 0) {
      unlistedNote += ` ${
        selectedUnlistedCountIsUpperBound ? 'Up to ' : ''
      }${selectedUnlistedAltCount.toLocaleString()} of the selected ALT alleles are not listed.`
    }
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
        {filtered && (
          <ClearIndexFilter type="button" onClick={onClearFilter}>
            Show all ALT alleles
          </ClearIndexFilter>
        )}
      </IndexTitle>
      {unlistedNote && <p role="status">{unlistedNote}</p>}
      {filtered && alleles.length === 0 && selectedUnlistedAltCount === 0 && (
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
              Allele Sequence
            </span>
            {sortHeader(
              'representedLength',
              'Allele Size (bp)',
              'lr-tr-index-represented-length',
              true
            )}
            {sortHeader(
              'lengthChange',
              'Allele Size vs REF (bp)',
              'lr-tr-index-length-change',
              true
            )}
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
                : "No sequence details shown. Click a 'Details' button in one of the rows above to view the allele's sequence and other information."}
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

// The color of bases outside any exact motif copy in an allele sequence.
const UNMATCHED_BASE_COLOR = '#333'

// A motif, or "Other" for the unmatched bases, in the motif table: white on the color its bases
// have in the allele sequence above.
const MotifTile = styled.span`
  display: inline-block;
  padding: 0 4px;
  border-radius: 2px;
  color: #fff;
  font-family: monospace;
  line-height: 1.4;
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
        segment.type === 'motif'
          ? motifColor(motifs[segment.motifIndex], motifs)
          : UNMATCHED_BASE_COLOR
      return (
        <span
          // Source sequence order is stable and repeated literal occurrences remain distinct.
          // eslint-disable-next-line react/no-array-index-key
          key={segmentIndex}
          data-sequence-role={segment.type}
          aria-label={label}
          // A motif copy moves to the next line whole rather than splitting across lines, unless
          // it is wider than the box; unmatched bases wrap anywhere.
          style={
            segment.type === 'motif' ? { display: 'inline-block', maxWidth: '100%' } : undefined
          }
        >
          {segment.sequence.split('').map((base, baseIndex) => {
            let borderRadius: string | number = 0
            if (baseIndex === 0) borderRadius = '2px 0 0 2px'
            else if (baseIndex === segment.sequence.length - 1) borderRadius = '0 2px 2px 0'
            // Every segment after the first starts with a gap. Unmatched bases form one segment
            // between motif copies, so the gaps fall before and after every motif copy.
            const hasMotifSeparator = segmentIndex > 0 && baseIndex === 0
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
  // The sequence is shown once: as motif tiles without the VCF padding base, or, when the tiles
  // cannot be drawn, as the plain source ALT string.
  if (!excludeValidatedSharedPadding || preview.status !== 'available') {
    return (
      <Sequence aria-label={`Exact copyable source sequence for ${sequenceLabel}`}>
        {allele.alt}
      </Sequence>
    )
  }

  const countSummary = exactStoredMotifCountSummary(preview, motifs)
  return (
    <>
      <HighlightedExactSequence>
        <ExactStoredMotifSequence
          segments={preview.segments}
          motifs={motifs}
          ariaLabel={`Exact stored-motif string preview for ${sequenceLabel}; ${countSummary}`}
        />
      </HighlightedExactSequence>
      <CompactScrollTable>
        <table aria-label="Exact motif match summary">
          <thead>
            <tr>
              <th scope="col">Motif</th>
              <th scope="col"># of repeats</th>
              <th scope="col"># of base pairs</th>
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
                  <MotifTile style={{ background: motifColor(motif, motifs) }}>{motif}</MotifTile>
                </th>
                <td>{preview.occurrenceCounts[motifIndex].toLocaleString()}</td>
                <td>{preview.matchedBases[motifIndex].toLocaleString()}</td>
              </tr>
            ))}
            {/* Bases outside any exact motif copy; they are not repeats, so only their bp. */}
            <tr>
              <th scope="row">
                <MotifTile style={{ background: UNMATCHED_BASE_COLOR }}>Other</MotifTile>
              </th>
              <td />
              <td>{preview.unmatchedBases.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </CompactScrollTable>
    </>
  )
}

const SelectedDetail = styled.article`
  padding: 1em;
  border: 1px solid #d8dee2;
  border-radius: 4px;
  margin: 0;
  background: #fff;
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
              </strong>{' '}
              ({signed(allele.length)} bp vs REF)
            </>
          ) : (
            <strong>
              {allele.length == null
                ? 'Change from REF unavailable'
                : `${signed(allele.length)} bp vs REF`}
            </strong>
          )}
        </p>
        <p style={{ marginBottom: 4 }}>
          <strong>ALT allele sequence</strong>
        </p>
        <SelectedExactSequence
          allele={allele}
          motifs={motifs}
          excludeValidatedSharedPadding={sharedPaddingBaseValidated(representedLength)}
        />
      </div>
    </SelectedDetailGrid>
  </SelectedDetail>
))

SelectedExactAlleleDetail.displayName = 'SelectedExactAlleleDetail'

export { Panel, signed, unavailableReason }
