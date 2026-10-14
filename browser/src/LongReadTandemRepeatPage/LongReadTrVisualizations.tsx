import React, { RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  RepeatCountPlots,
  WholeRecordAlleleLandscapeData,
  WholeRecordGenotypeLandscapeData,
} from './types'
import {
  exactStoredMotifCountSummary,
  exactStoredMotifPreview,
  ExactStoredMotifSegment,
} from './exactStoredMotifPreview'
import { longestPureMotifRun, referenceRepeatSequence } from './referenceSequencePurity'
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

// One control drives both landscape plots. The bp measures use the exact source length
// products; the repeat measures use whichever admitted repeat-unit product a plot has.
export type LandscapeMeasure = 'bp-absolute' | 'bp-delta' | 'repeats-absolute' | 'repeats-delta'

// The repeat measures show the precomputed repeat-count histograms, which give each allele's
// longest pure run, when a locus has them, and exact motif counts otherwise.
const landscapeMeasureLabel = (measure: LandscapeMeasure, repeatsAreLongestPureRun: boolean) => {
  if (measure === 'bp-absolute') return 'ALT allele size (bp)'
  if (measure === 'bp-delta') return 'ALT − REF allele size (bp)'
  const repeatSize = repeatsAreLongestPureRun ? 'longest pure run' : 'size'
  if (measure === 'repeats-absolute') return `ALT allele ${repeatSize} (repeats)`
  return `ALT − REF allele ${repeatSize} (repeats)`
}

const measuresLength = (measure: LandscapeMeasure) =>
  measure === 'bp-absolute' || measure === 'bp-delta'

// The exact-motif measurement with every unit count expressed relative to the REF's.
const primaryMotifMeasurementRelativeToReference = (
  measurement: PrimaryMotifMeasurementData,
  referenceUnits: number
): PrimaryMotifMeasurementData => ({
  ...measurement,
  bins: measurement.bins.map((bin) => ({
    ...bin,
    exact_units: bin.exact_units - referenceUnits,
  })),
  genotype: {
    ...measurement.genotype,
    cells: measurement.genotype.cells.map((cell) => ({
      ...cell,
      shorter_exact_units: cell.shorter_exact_units - referenceUnits,
      longer_exact_units: cell.longer_exact_units - referenceUnits,
    })),
  },
})

// The repeat-count histograms with every repeat count expressed relative to the REF's.
const repeatCountPlotsRelativeToReference = (
  plots: RepeatCountPlots,
  referenceUnits: number
): RepeatCountPlots => ({
  ...plots,
  max_repunits: plots.max_repunits == null ? null : plots.max_repunits - referenceUnits,
  allele_size_distribution: plots.allele_size_distribution.map((cohort: any) => ({
    ...cohort,
    distribution: cohort.distribution.map((item: any) => ({
      ...item,
      repunit_count: item.repunit_count - referenceUnits,
    })),
  })),
  genotype_distribution: plots.genotype_distribution.map((cohort: any) => ({
    ...cohort,
    distribution: cohort.distribution.map((item: any) => ({
      ...item,
      short_allele_repunit_count: item.short_allele_repunit_count - referenceUnits,
      long_allele_repunit_count: item.long_allele_repunit_count - referenceUnits,
    })),
  })),
})

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
  BOUND_EXCEEDED: 'the result is too large to display safely',
  EXACT_ALLELE_SEQUENCE_ANCHOR_NOT_RECONCILABLE:
    'the complete REF and ALT sequences do not share one validated VCF anchor',
  EXACT_ALT_LIMIT_EXCEEDED:
    'the locus has more alternate alleles than this view can display safely',
  // The source VCF carries AP_allele only on records with several ALT alleles, and no locus
  // mixes one-ALT and several-ALT records, so this is the only way a locus ends up without it.
  NO_ALIGNED_SOURCE_AP_ALLELE:
    'the source VCF reports purity only for records with more than one ALT allele',
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
      selected bar again, press Escape, or use <strong>Show all ALT alleles</strong> to clear.
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
          'Each plot has its own allele size measure menu at the bottom of its card, offering only the measures that plot can draw: the ALT allele size or its change from REF, in base pairs or in repeat units. Purity is measured from each exact ALT sequence, so the purity plot uses base pairs only. '}
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
  const { components } = locus
  const region = locusRegionWithSourceRefSpan(locus)
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
// No gap, so the y axis line meets the x axis line at the corner, as in the genotype heatmap.
const HISTOGRAM_COLUMN_GAP = 0
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
  margin: 1.8em 0 1.2em;
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

// Narrowest a bar may get to fit every bin in the card before the plot scrolls instead.
const MIN_FITTED_BAR_WIDTH = 12

// Bars widen or narrow to fill the plot, so every bin shows without scrolling, in the same slots
// as the purity plot, but never beyond MAX_PLOT_BAR_WIDTH_PX. Only bins too many to fit at
// MIN_FITTED_BAR_WIDTH keep their natural width and scroll horizontally. A measured width of 0
// (the initial render, and jsdom) keeps the natural width.
const filledBarWidth = (measuredWidth: number, binCount: number, layout: HistogramLayout) => {
  const naturalBarWidth = Math.min(layout.barWidth, MAX_PLOT_BAR_WIDTH_PX)
  if (!measuredWidth || !binCount) return naturalBarWidth
  const usableWidth =
    measuredWidth -
    HISTOGRAM_Y_COLUMN_WIDTH -
    HISTOGRAM_COLUMN_GAP -
    HISTOGRAM_SIDE_PADDING * 2 -
    (binCount - 1) * layout.gap
  const fittedBarWidth = Math.min(MAX_PLOT_BAR_WIDTH_PX, Math.floor(usableWidth / binCount))
  return fittedBarWidth >= MIN_FITTED_BAR_WIDTH ? fittedBarWidth : naturalBarWidth
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
  display: flex;
  justify-content: center;
  align-items: flex-end;
  box-sizing: border-box;
  gap: ${(props) => props.$gap}px;
  height: ${(props) => props.$height}px;
  border-bottom: 1px solid ${PLOT_AXIS_LINE_COLOR};
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
    ancestry_groups: [
      ...new Set(cells.flatMap((cell) => cell.pairs.map((pair) => pair.ancestry_group))),
    ],
    sexes: [...new Set(cells.flatMap((cell) => cell.pairs.map((pair) => pair.sex)))],
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

// The text of an allele size axis tick: the size itself, or its change from REF.
const lengthAxisTickLabel = (delta: number, mode: LengthAxisMode, referenceSize: number | null) =>
  mode === 'absolute' ? lengthAxisValue(delta, mode, referenceSize).toLocaleString() : signed(delta)

// On-screen width of a tick label; tabular digits are about 0.62em wide.
const tickLabelWidth = (label: string) => label.length * AXIS_LABEL_FONT_PX * 0.62
// Least space between neighboring tick labels.
const TICK_LABEL_GAP = 6

// Ticks for an axis with one slot per allele size. Every size gets a label when the labels
// fit; otherwise some are left out, always keeping the ends, 0 and the selected size.
export const histogramDeltaAxisTicks = (
  deltas: number[],
  barWidth: number,
  gap: number,
  selectedDelta: number | null,
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

  if (selectedDelta != null) {
    const selectedIndex = deltas.indexOf(selectedDelta)
    if (selectedIndex >= 0) required.set(selectedDelta, centerForIndex(selectedIndex))
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

// The 44 px button's focus outline reaches 25 px from its center. Keep that full keyboard
// target (and the largest 26 px AC mark) inside the y range at every data-domain boundary.
// Horizontally, points sit in the allele length histogram's slots.
export const PURITY_POINT_CLEARANCE = 25
export const PURITY_MAX_JITTER = 32

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
  plotHeight,
  slotDeltas = [],
  selectedAllele,
  activeMarkIds,
  onSelectPoints,
  onClear,
  lengthAxisMode = 'delta',
  representedRefLength = null,
  alleleAxisLabel = 'Allele',
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
  alleleAxisLabel?: string
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
  const domainSpan = domainMaximum - domainMinimum
  const purityTicks = [domainMinimum, domainMinimum + domainSpan / 2, domainMaximum]
  const decimals = purityTickDecimals(purityTicks, domainMinimum, domainMaximum)
  const overlapCounts = allPoints.reduce((counts, point) => {
    const key = `${point.delta}\u0000${point.motif_purity}`
    counts.set(key, (counts.get(key) || 0) + 1)
    return counts
  }, new Map<string, number>())
  // Each point's sideways offset among the points at its exact size and purity. It is worked out
  // here rather than while drawing, because MeasuredWidth redraws the plot below on every width
  // measurement, and a counter advanced while drawing would keep counting across those redraws.
  const overlapIndexByKey = new Map<string, number>()
  const overlapOffsetByAlleleId = new Map(
    allPoints.map((point) => {
      const key = `${point.delta}\u0000${point.motif_purity}`
      const overlapIndex = overlapIndexByKey.get(key) || 0
      overlapIndexByKey.set(key, overlapIndex + 1)
      return [point.allele_id, purityOverlapOffset(overlapIndex, overlapCounts.get(key) || 1)]
    })
  )
  const coincidentPoints = [...overlapCounts.values()].some((count) => count > 1)
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
      {coincidentPoints && (
        <PlotNoteAbovePlot>
          Note: Overlapping points are separated slightly for visibility.
        </PlotNoteAbovePlot>
      )}
      <HistogramSizer data-x-axis-aligned-plot="true">
        <MeasuredWidth>
          {(measuredWidth) => {
            const plotWidth = Math.max(
              0,
              measuredWidth - HISTOGRAM_Y_COLUMN_WIDTH - HISTOGRAM_COLUMN_GAP
            )
            // The bp histogram's bar geometry, centered the same way, so each point sits under
            // its bar. When those bars would not fit (the histogram then scrolls), the slots
            // share the plot width equally instead.
            const histogramLayout = histogramLayoutForBinCount(deltas.length)
            const histogramBarWidth = filledBarWidth(measuredWidth, deltas.length, histogramLayout)
            const histogramContentWidth =
              deltas.length * histogramBarWidth + (deltas.length - 1) * histogramLayout.gap
            const followsHistogram = histogramContentWidth <= plotWidth - 2 * HISTOGRAM_SIDE_PADDING
            const slotWidth = followsHistogram
              ? histogramBarWidth
              : Math.max(0, plotWidth - 2 * HISTOGRAM_SIDE_PADDING) / deltas.length
            const slotGap = followsHistogram ? histogramLayout.gap : 0
            const slotsLeft = followsHistogram
              ? (plotWidth - histogramContentWidth) / 2
              : HISTOGRAM_SIDE_PADDING
            // Before the first width measurement the equal-slot rule is applied in CSS.
            const slotCenter = (delta: number) =>
              measuredWidth > 0
                ? `${slotsLeft + slotIndex.get(delta)! * (slotWidth + slotGap) + slotWidth / 2}px`
                : slotCenterCss(delta)
            const xAxisTicks = histogramDeltaAxisTicks(deltas, slotWidth, slotGap, null, (delta) =>
              lengthAxisTickLabel(delta, lengthAxisMode, representedRefLength)
            )
            const xAxisHeight =
              AXIS_LABEL_FONT_PX +
              15 +
              Math.max(0, ...xAxisTicks.map((tick) => tick.lane)) * HISTOGRAM_X_TICK_LANE_HEIGHT
            return (
              <>
                <HistogramChartWithXAxisTitle>
                  <HistogramYScale aria-hidden="true" $height={plotHeight} style={{ marginTop: 0 }}>
                    <AxisTitle>Purity</AxisTitle>
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
                            borderTop: '1px solid #e2e6e8',
                          }}
                        />
                      ))}
                      {referencePoint && (
                        <PurityReferencePoint
                          role="img"
                          aria-label={`REF allele: purity ${referencePoint.motif_purity.toFixed(
                            4
                          )}, ${calledAlleleCopies(referencePoint.called_alleles)}`}
                          title={`REF allele: purity ${referencePoint.motif_purity.toFixed(
                            4
                          )}, AC ${referencePoint.called_alleles}`}
                          data-testid="purity-reference-point"
                          $diameter={purityPointDiameter(
                            referencePoint.called_alleles,
                            minimumCalledAlleles,
                            maximumCalledAlleles
                          )}
                          style={{
                            left: slotCenter(referencePoint.delta),
                            bottom: purityTickBottom(referencePoint.motif_purity),
                            transform: `translate(calc(-50% + ${
                              overlapOffsetByAlleleId.get(REFERENCE_PURITY_POINT_ID) || 0
                            }px), 50%)`,
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
                        const overlapOffset = overlapOffsetByAlleleId.get(point.allele_id) || 0
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
                            )}, purity ${point.motif_purity.toFixed(4)}, AC ${
                              point.called_alleles
                            }`}
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
                      aria-label={`${lengthAxisTitle(alleleAxisLabel, lengthAxisMode)} axis`}
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
                  {lengthAxisTitle(alleleAxisLabel, lengthAxisMode)}
                </HistogramXAxisTitle>
              </>
            )
          }}
        </MeasuredWidth>
      </HistogramSizer>
    </>
  )
}

const RepeatCountPlotCard = ({
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
  lengthAxisControl = null,
}: {
  motifs: string[]
  selectedMotifIndex: number
  bins: ExactStoredMotifDistributionBin[]
  activeMarkIds: Set<string>
  onSelectMotifIndex: (motifIndex: number) => void
  onSelectBins: (bins: ExactStoredMotifDistributionBin[]) => void
  onClear: () => void
  // The plot's own Length axis menu, drawn at the bottom of the card.
  lengthAxisControl?: React.ReactNode
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
  // A repeat measure uses the precomputed repeat-count histograms when a plot admits them, drawn
  // with the length plots, and the exact-motif product otherwise.
  const repeatViewFor = (choices: DistributionView[]) => {
    if (choices.includes('repeat-count')) return 'repeat-count' as const
    if (choices.includes('exact-motif')) return 'exact-motif' as const
    return null
  }
  const referenceUnits = referenceRepeatUnits(
    presentation?.locus_type === 'ISOLATED_REPEAT',
    primaryMotif,
    representedRefLength
  )
  // On a variation cluster page each allele spans the whole cluster, not one repeat.
  const alleleAxisLabel =
    presentation?.locus_type === 'VARIATION_CLUSTER' ? 'Cluster Allele' : 'Allele'
  // The precomputed repeat-count histograms size each allele by its longest pure run of the
  // motif, so the REF sits at its own longest pure run. It is left unknown when the histogram
  // holds fewer alleles at that size than there are REF alleles, which would mean the two
  // sources disagree about the REF.
  const referenceLongestPureRun = admittedRepeatCountPlots
    ? longestPureMotifRun(
        referenceRepeatSequence(alleles[0]?.ref),
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
  // in that unit is known.
  const measureChoicesFor = (choices: DistributionView[]) => {
    const repeatView = repeatViewFor(choices)
    const repeatReferenceKnown =
      (repeatView === 'repeat-count' ? histogramReferenceUnits : referenceUnits) != null
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
  const showControlSection =
    showLegacyFilterControls || showContractAncestryControl || showContractSexControl
  const lengthAxisName =
    alleleLengthAxisMode === 'absolute' ? 'Represented allele length (bp)' : 'Change from REF (bp)'
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
  // The REF size on the histogram's axis. When the REF's longest pure run is unknown it is null
  // and sizes were not offset, so each size reads as its own longest pure run.
  const histogramReferenceSize = repeatCountHistogram
    ? histogramReferenceUnits
    : representedRefLength
  const lengthStyleHistogramShown =
    selectedAlleleDistributionView === 'length' || Boolean(repeatCountHistogram)
  // The change-from-REF repeat measure reuses the admitted unit products with every count
  // expressed relative to the reference unit count, separately for each plot's own measure.
  const shiftAlleleRepeatUnits = alleleMeasure === 'repeats-delta' && referenceUnits != null
  const shiftGenotypeRepeatUnits = genotypeMeasure === 'repeats-delta' && referenceUnits != null
  const allelePrimaryMotifMeasurement = useMemo(
    () =>
      admittedPrimaryMotifMeasurement && shiftAlleleRepeatUnits
        ? primaryMotifMeasurementRelativeToReference(
            admittedPrimaryMotifMeasurement,
            referenceUnits as number
          )
        : admittedPrimaryMotifMeasurement,
    [admittedPrimaryMotifMeasurement, referenceUnits, shiftAlleleRepeatUnits]
  )
  const genotypePrimaryMotifMeasurement = useMemo(
    () =>
      admittedPrimaryMotifGenotype && shiftGenotypeRepeatUnits
        ? primaryMotifMeasurementRelativeToReference(
            admittedPrimaryMotifGenotype,
            referenceUnits as number
          )
        : admittedPrimaryMotifGenotype,
    [admittedPrimaryMotifGenotype, referenceUnits, shiftGenotypeRepeatUnits]
  )
  const alleleRepeatCountPlots = useMemo(
    () =>
      admittedRepeatCountPlots && shiftAlleleRepeatUnits
        ? repeatCountPlotsRelativeToReference(admittedRepeatCountPlots, referenceUnits as number)
        : admittedRepeatCountPlots,
    [admittedRepeatCountPlots, referenceUnits, shiftAlleleRepeatUnits]
  )
  const genotypeRepeatCountPlots = useMemo(
    () =>
      admittedRepeatCountPlots && shiftGenotypeRepeatUnits
        ? repeatCountPlotsRelativeToReference(admittedRepeatCountPlots, referenceUnits as number)
        : admittedRepeatCountPlots,
    [admittedRepeatCountPlots, referenceUnits, shiftGenotypeRepeatUnits]
  )
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
  const selectedDelta =
    activeIndexSelection?.origin === 'total-length' && activeIndexSelection.markIds.length === 1
      ? activeIndexSelection.singleDelta ?? null
      : null
  const selectedBin = histogramBins.find((bin) => bin.delta === selectedDelta)
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
    activateIndexSelection({
      scope,
      origin: 'total-length',
      markIds: ordered.map((bin) => `total-length:${bin.delta}`),
      alleleIds: uniqueIds(ordered.flatMap((bin) => bin.allele_ids)),
      singleDelta: ordered.length === 1 ? ordered[0].delta : undefined,
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
    activateIndexSelection({
      scope,
      origin: 'motif-occurrence',
      markIds: ordered.map((bin) => `motif-occurrence:${motifIndex}:${bin.occurrence_count}`),
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
  const filterIndexToGenotypeCells = (
    selectedCells: Array<{
      markId: string
      shorterDelta: number
      longerDelta: number
      pairs: ExactGenotypePair[]
    }>
  ) => {
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
    distributionChoices: DistributionView[],
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
                {landscapeMeasureLabel(
                  choice,
                  repeatViewFor(distributionChoices) === 'repeat-count'
                )}
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
    alleleDistributionChoices,
    selectAlleleMeasure
  )
  const genotypeLengthAxisControl = lengthAxisControl(
    'Genotype length distribution',
    genotypeMeasure,
    genotypeMeasureChoices,
    genotypeDistributionChoices,
    selectGenotypeMeasure
  )
  const purityLengthAxisControl = lengthAxisControl(
    'Repeat sequence purity',
    purityMeasure,
    purityMeasureChoices,
    ['length'],
    setRequestedPurityMeasure
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
        <PlotGrid
          ref={plotGridRef}
          $plotCount={visiblePlotCount}
          data-plot-count={visiblePlotCount}
          data-testid="whole-record-allele-plot-grid"
        >
          {selectedAlleleDistributionView === 'repeat-count' && alleleRepeatCountPlots && (
            <RepeatCountPlotCard
              variantId={repeatCountVariantId}
              repeatCountPlots={alleleRepeatCountPlots}
              kind="allele"
              lengthAxisControl={alleleLengthAxisControl}
            />
          )}
          {selectedAlleleDistributionView === 'exact-motif' && allelePrimaryMotifMeasurement && (
            <PrimaryMotifAllelePlotCard
              measurement={allelePrimaryMotifMeasurement}
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
              selectedPopulation={selectedPopulation}
              selectedSex={selectedSex}
              lengthAxisMode={genotypeLengthAxisMode}
              representedRefLength={representedRefLength}
              alleleAxisLabel={alleleAxisLabel}
              lengthAxisControl={genotypeLengthAxisControl}
            />
          )}
          {selectedGenotypeDistributionView === 'repeat-count' && genotypeRepeatCountPlots && (
            <RepeatCountPlotCard
              variantId={repeatCountVariantId}
              repeatCountPlots={genotypeRepeatCountPlots}
              kind="genotype"
              lengthAxisControl={genotypeLengthAxisControl}
            />
          )}
          {selectedGenotypeDistributionView === 'exact-motif' &&
            genotypePrimaryMotifMeasurement && (
              <PrimaryMotifGenotypeCells
                measurement={genotypePrimaryMotifMeasurement}
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
    if (!filterContract) return binCount(bin, selectedPopulation, selectedSex)
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
        <AllelicLandscapeHelp
          showRepeatCountControls={Boolean(admittedRepeatCountPlots)}
          showLengthAxisControl={Boolean(
            alleleLengthAxisControl || genotypeLengthAxisControl || purityLengthAxisControl
          )}
          showAncestryControl={showLegacyFilterControls || showContractAncestryControl}
          showSexControl={showLegacyFilterControls || showContractSexControl}
          showHistogramDisplayControl={showHistogramDisplayControl}
          primaryMotifMeasurement={admittedPrimaryMotifMeasurement}
        />
      </HeadingWithHelp>
      {showControlSection && (
        <LandscapeControls role="group" aria-label="Allelic Landscape controls">
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
              {lengthStyleHistogramShown && (
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
      {!landscape.stratified_available && !filterContract && (
        <p role="status">
          Stratified controls are unavailable:{' '}
          {unavailableReason(landscape.stratified_unavailable_reason)}.
        </p>
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
              lengthAxisControl={alleleLengthAxisControl}
            />
          )}
        {selectedAlleleDistributionView === 'exact-motif' &&
          !admittedMotifDistribution &&
          allelePrimaryMotifMeasurement && (
            <PrimaryMotifAllelePlotCard
              measurement={allelePrimaryMotifMeasurement}
              lengthAxisControl={alleleLengthAxisControl}
            />
          )}
        {lengthStyleHistogramShown && (
          <PlotCard data-plot-card="total-length-histogram">
            <h3>Allele length distribution</h3>
            <p aria-live="polite">
              <strong>Sizes of {counted(totalInView, 'allele', 'alleles')}.</strong>
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
                const barWidth = filledBarWidth(
                  measuredWidth,
                  histogramBins.length,
                  histogramLayout
                )
                const histogramContentWidth =
                  histogramBins.length * barWidth +
                  Math.max(0, histogramBins.length - 1) * histogramLayout.gap
                const histogramScrollableWidth = histogramContentWidth + HISTOGRAM_SIDE_PADDING * 2
                const deltaAxisTicks = histogramDeltaAxisTicks(
                  histogramBins.map((bin) => bin.delta),
                  barWidth,
                  histogramLayout.gap,
                  selectedBin?.delta ?? null,
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
                            data-x-axis-line="true"
                            $height={histogramLayout.height}
                            $gap={histogramLayout.gap}
                            {...totalLengthBrush.containerProps}
                          >
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
                              let barTitle = [
                                lengthLabel,
                                referenceOnly || referenceCount > 0 ? referenceCopiesText : null,
                                referenceOnly ? null : calledAlleleCopies(count, true),
                                referenceOnly ? null : exactAltSequences(bin.exact_alt_count),
                              ]
                                .filter(Boolean)
                                .join(' · ')
                              // Repeat-count bars carry no allele ids, so they only report counts.
                              if (repeatCountHistogram && !referenceOnly) {
                                ariaLabel = `${lengthLabel}; ${counted(
                                  count,
                                  'allele',
                                  'alleles'
                                )} in this view`
                                barTitle = `${lengthLabel} · ${counted(count, 'allele', 'alleles')}`
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
                                      referenceOnly || repeatCountHistogram
                                        ? barTitle
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
                      {lengthAxisTitle(alleleAxisLabel, alleleLengthAxisMode, histogramUnit)}
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
            selectedPopulation={selectedPopulation}
            selectedSex={selectedSex}
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
            alleleAxisLabel={alleleAxisLabel}
            onPlotHeightChange={setGenotypePlotHeightPx}
            lengthAxisControl={genotypeLengthAxisControl}
          />
        )}
        {selectedGenotypeDistributionView === 'exact-motif' && genotypePrimaryMotifMeasurement && (
          <PrimaryMotifGenotypeCells
            measurement={genotypePrimaryMotifMeasurement}
            lengthAxisControl={genotypeLengthAxisControl}
          />
        )}
        <PlotCard data-plot-card="motif-purity">
          <h3>Repeat sequence purity</h3>
          {landscape.purity_available && (
            <p aria-live="polite">
              <strong>Purity of {counted(purityAllelesInView, 'allele', 'alleles')}.</strong>
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
              alleleAxisLabel={alleleAxisLabel}
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
  unit = 'bp',
  referenceSizeKnown = true,
  cellsClickable = true,
  alleleAxisLabel = 'Allele',
  onPlotHeightChange,
  lengthAxisControl = null,
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
  unit?: LengthUnit
  // False when the sizes are not relative to a known REF size, so 0 is not the REF size.
  referenceSizeKnown?: boolean
  // False for the repeat-count histograms, which carry no allele ids to filter the source-ALT
  // index by; their squares then only show their counts on hover.
  cellsClickable?: boolean
  // "Cluster Allele" on a variation cluster page, where each allele spans the whole cluster.
  alleleAxisLabel?: string
  // Receives the on-screen height in pixels of the square of cells, so the other plots can match.
  onPlotHeightChange?: (heightPx: number) => void
  // The plot's own Length axis menu, drawn at the bottom of the card.
  lengthAxisControl?: React.ReactNode
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
              // Squares are never wider than the histogram's widest bar; with few sizes the grid
              // of squares sits centered in the plot, whose axes keep their full length.
              const band = Math.min(
                plotSize / Math.max(1, values.length),
                MAX_PLOT_BAR_WIDTH_PX * svgUnitsPerPixel
              )
              const gridInset = (plotSize - band * values.length) / 2
              const xFor = (value: number) =>
                heatmapLeft + gridInset + (valueIndex.get(value) || 0) * band
              const yFor = (value: number) =>
                heatmapTop + gridInset + (values.length - 1 - (valueIndex.get(value) || 0)) * band
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
                    <title>
                      Genotype distribution by longer and shorter{' '}
                      {lengthAxisMode === 'absolute'
                        ? 'represented allele length'
                        : 'change from REF'}
                    </title>
                    {referenceSizeKnown && valueIndex.has(0) && (
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
                      {lengthAxisTitle(`Long ${alleleAxisLabel}`, lengthAxisMode, unit)}
                    </text>
                    <text
                      x={yAxisTitleX}
                      y={heatmapTop + plotSize / 2}
                      fill="#566168"
                      fontSize={axisFontSize}
                      textAnchor="middle"
                      transform={`rotate(-90 ${yAxisTitleX} ${heatmapTop + plotSize / 2})`}
                    >
                      {lengthAxisTitle(`Short ${alleleAxisLabel}`, lengthAxisMode, unit)}
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
  const previewUnavailableMessage =
    hasMissingIndexSequence && !sequencesAvailable
      ? `Motif previews are unavailable because ${unavailableReason(sequencesUnavailableReason)}.`
      : null
  const identityCount = sequenceCardinality?.source_alt_identity_count ?? totalExactAlts
  const heading = filtered
    ? `${alleles.length.toLocaleString()} of ${identityCount.toLocaleString()} non-reference alleles selected`
    : 'Allele Details'
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
      {filtered && alleles.length === 0 && (
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
                  <code>{motif}</code>
                </th>
                <td>{preview.occurrenceCounts[motifIndex].toLocaleString()}</td>
                <td>{preview.matchedBases[motifIndex].toLocaleString()}</td>
              </tr>
            ))}
            {/* Bases outside any exact motif copy; they are not repeats, so only their bp. */}
            <tr>
              <th scope="row">Other</th>
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
              <th scope="row">Allele frequency</th>
              <td>
                {allele.freq.all.ac.toLocaleString()} / {allele.freq.all.an.toLocaleString()} (
                {(allele.freq.all.af * 100).toPrecision(4)}%)
              </td>
            </tr>
            <tr>
              <th scope="row">Allele sequence purity</th>
              <td>{allele.motif_purity == null ? '—' : allele.motif_purity.toFixed(2)}</td>
            </tr>
            {/* Tandem repeat alleles carry no major consequence or CADD score in the source data,
                so only phyloP is shown. */}
            <tr>
              <th scope="row">phyloP</th>
              <td>{allele.phylop == null ? '—' : allele.phylop}</td>
            </tr>
          </tbody>
        </table>
      </ScrollTable>
    </SelectedDetailGrid>
  </SelectedDetail>
))

SelectedExactAlleleDetail.displayName = 'SelectedExactAlleleDetail'

export { Panel, signed, unavailableReason }
