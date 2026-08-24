import React, { useMemo, useState } from 'react'

import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import InfoButton from '../help/InfoButton'
import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import ControlSection from '../VariantPage/ControlSection'
import ShortTandemRepeatAlleleSizeDistributionPlot, {
  AlleleSizeDistributionCohort,
  ColorBy,
  PopulationDisplayConfig,
  ScaleType,
} from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionPlot from '../ShortTandemRepeatPage/ShortTandemRepeatGenotypeDistributionPlot'
import {
  consolidateAlleleSizeDistributions,
  ColorByFn,
} from '../ShortTandemRepeatPage/shortTandemRepeatHelpers'
import {
  allPopulations,
  logScaleAllowed,
  Sex,
} from '../ShortTandemRepeatPage/ShortTandemRepeatPage'
import ShortTandemRepeatColorBySelect from '../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect'
import ShortTandemRepeatScaleSelect from '../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect'
import ShortTandemRepeatPopulationOptions from '../ShortTandemRepeatPage/ShortTandemRepeatPopulationOptions'
import { longReadAncestryGroupDisplayName } from './longReadAncestryGroups'

export type GenotypeDistributionCohort = {
  ancestry_group: string
  sex: Sex
  short_allele_repunit: string
  long_allele_repunit: string
  distribution: {
    short_allele_repunit_count: number
    long_allele_repunit_count: number
    frequency: number
  }[]
}

type HeadingLevel = 'h2' | 'h3' | 'h4'

type CalledCountDistributions = {
  alleleSizeDistribution: AlleleSizeDistributionCohort[]
  genotypeDistribution: GenotypeDistributionCohort[]
}

export const observedRepeatDomain = (values: number[]): [number, number] => {
  const observed = values.filter((value) => Number.isFinite(value) && value >= 0)
  if (observed.length === 0) return [0, 0]
  const minObserved = Math.floor(Math.min(...observed))
  const maxObserved = Math.ceil(Math.max(...observed))
  return [Math.max(0, minObserved - 1), maxObserved + 1]
}

export const genotypeCountExtent = (
  distribution: GenotypeDistributionCohort['distribution']
): [number, number] => {
  const counts = new Map<string, number>()
  distribution.forEach((item) => {
    const key = `${item.short_allele_repunit_count}/${item.long_allele_repunit_count}`
    counts.set(key, (counts.get(key) || 0) + item.frequency)
  })
  const nonzero = [...counts.values()].filter((count) => count > 0)
  return nonzero.length === 0 ? [0, 0] : [Math.min(...nonzero), Math.max(...nonzero)]
}

export const selectedCalledCounts = (
  distributions: CalledCountDistributions,
  selectedPopulation: PopulationId | null,
  selectedSex: Sex | null
) => {
  const inSelectedStratum = (cohort: { ancestry_group: string; sex: Sex }) =>
    (selectedPopulation === null || cohort.ancestry_group === selectedPopulation) &&
    (selectedSex === null || cohort.sex === selectedSex)

  return {
    calledAlleles: distributions.alleleSizeDistribution
      .filter(inSelectedStratum)
      .flatMap((cohort) => cohort.distribution)
      .reduce((sum, bin) => sum + bin.frequency, 0),
    calledDiploidGenotypes: distributions.genotypeDistribution
      .filter(inSelectedStratum)
      .flatMap((cohort) => cohort.distribution)
      .reduce((sum, bin) => sum + bin.frequency, 0),
  }
}

const CalledDenominators = ({
  alleleSizeDistribution,
  genotypeDistribution,
  selectedPopulation,
  selectedSex,
  kind,
}: CalledCountDistributions & {
  selectedPopulation: PopulationId | null
  selectedSex: Sex | null
  kind: 'alleles' | 'genotypes'
}) => {
  const counts = selectedCalledCounts(
    { alleleSizeDistribution, genotypeDistribution },
    selectedPopulation,
    selectedSex
  )
  return (
    <p aria-live="polite">
      <strong>
        {kind === 'alleles'
          ? `${counts.calledAlleles.toLocaleString()} called chromosome copies in this view.`
          : `${counts.calledDiploidGenotypes.toLocaleString()} individuals with complete diploid genotypes in this view.`}
      </strong>{' '}
      Counts include called observations only. No-call denominator unavailable for this admitted
      histogram.
    </p>
  )
}

export const longReadAlleleSizeColorBy: ColorByFn<AlleleSizeDistributionCohort> = (
  cohort,
  colorBy
) => {
  if (colorBy === 'sex') return cohort.sex
  if (colorBy === 'population') return cohort.ancestry_group
  return null
}

// Raw ancestry IDs remain the plot's data/filter keys. This adapter only adds
// LR-specific labels and colors so both legacy `oth` and current `rmi` display
// as Remaining individuals without changing shared short-read semantics.
export const longReadPopulationDisplayConfig: PopulationDisplayConfig = {
  additionalLegendKeys: ['rmi'],
  labels: { oth: 'Remaining individuals', rmi: 'Remaining individuals' },
  colors: { oth: '#ABB8B9', rmi: '#ABB8B9' },
}

export const LongReadAlleleSizeDistributionSection = ({
  variantId,
  alleleSizeDistribution,
  maxRepunits,
  repeatUnit,
  headingLevel = 'h2',
  heading = 'Allele Size Distribution',
  compact = false,
  calledCountDistributions,
  focusObservedDomain = false,
}: {
  variantId: string
  alleleSizeDistribution: AlleleSizeDistributionCohort[]
  maxRepunits: number
  repeatUnit?: string
  headingLevel?: HeadingLevel
  heading?: string
  compact?: boolean
  calledCountDistributions?: CalledCountDistributions
  focusObservedDomain?: boolean
}) => {
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleType>('linear')
  const [selectedColorBy, rawSetSelectedColorBy] = useState<ColorBy | null>(null)
  const Heading = headingLevel

  const setSelectedColorBy = (newColorBy: ColorBy | null) => {
    if (selectedScaleType === 'log' && !logScaleAllowed(newColorBy)) {
      setSelectedScaleType('linear')
    }
    rawSetSelectedColorBy(newColorBy)
  }

  const populations = allPopulations(alleleSizeDistribution)
  const observedDomain = observedRepeatDomain(
    alleleSizeDistribution.flatMap((cohort) =>
      cohort.distribution.map((item) => item.repunit_count)
    )
  )
  const [minRepeats, plotMaxRepeats] = focusObservedDomain ? observedDomain : [0, maxRepunits]

  return (
    <>
      <Heading>
        {heading} <InfoButton topic="str-allele-size-distribution" />
      </Heading>
      {/* The responsive plot wrapper uses height: 100%. Give it an explicit
          containing height so its SVG participates in document flow instead
          of overlapping the controls and the next expanded-row section. */}
      <div style={{ height: 300 }}>
        <ShortTandemRepeatAlleleSizeDistributionPlot
          minRepeats={minRepeats}
          maxRepeats={plotMaxRepeats}
          alleleSizeDistribution={consolidateAlleleSizeDistributions(
            alleleSizeDistribution,
            longReadAlleleSizeColorBy,
            selectedPopulation,
            selectedSex,
            selectedColorBy,
            null,
            null
          )}
          colorBy={selectedColorBy}
          repeatUnitLength={null}
          repeatUnit={repeatUnit}
          scaleType={selectedScaleType}
          populationDisplayConfig={longReadPopulationDisplayConfig}
          baseColor={LONG_READ_PRIMARY_PLOT_COLOR}
        />
      </div>
      <ControlSection
        style={
          compact
            ? {
                marginTop: '0.5em',
                justifyContent: 'flex-start',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px 16px',
              }
            : { marginTop: '0.5em' }
        }
      >
        <ShortTandemRepeatPopulationOptions
          id={`${variantId}-repeat-counts`}
          populations={populations}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
          ancestryGroupName={longReadAncestryGroupDisplayName}
        />
        <ShortTandemRepeatColorBySelect
          id={`${variantId}-color-by`}
          selectedColorBy={selectedColorBy}
          setSelectedColorBy={setSelectedColorBy}
          setSelectedScaleType={setSelectedScaleType}
          allowedColorBys={['sex', 'population']}
        />
        <ShortTandemRepeatScaleSelect
          id={variantId}
          selectedScaleType={selectedScaleType}
          setSelectedScaleType={setSelectedScaleType}
          selectedColorBy={selectedColorBy}
        />
      </ControlSection>
      {calledCountDistributions && (
        <CalledDenominators
          {...calledCountDistributions}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          kind="alleles"
        />
      )}
    </>
  )
}

export const selectGenotypeDistribution = (
  cohorts: GenotypeDistributionCohort[],
  selectedPopulation: PopulationId | null,
  selectedSex: Sex | null
) =>
  cohorts
    .filter(
      (cohort) =>
        (selectedPopulation === null || cohort.ancestry_group === selectedPopulation) &&
        (selectedSex === null || cohort.sex === selectedSex)
    )
    .flatMap((cohort) => cohort.distribution)

export const LongReadGenotypeDistributionSection = ({
  variantId,
  genotypeDistribution,
  repeatUnit,
  headingLevel = 'h2',
  heading = 'Genotype Distribution',
  compact = false,
  calledCountDistributions,
  focusObservedDomain = false,
  explainGenotypes = false,
}: {
  variantId: string
  genotypeDistribution: GenotypeDistributionCohort[]
  repeatUnit?: string
  headingLevel?: HeadingLevel
  heading?: string
  compact?: boolean
  calledCountDistributions?: CalledCountDistributions
  focusObservedDomain?: boolean
  explainGenotypes?: boolean
}) => {
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)
  const Heading = headingLevel

  const selectedDistribution = useMemo(
    () => selectGenotypeDistribution(genotypeDistribution, selectedPopulation, selectedSex),
    [genotypeDistribution, selectedPopulation, selectedSex]
  )
  const allItems = genotypeDistribution.flatMap((cohort) => cohort.distribution)
  const maxLongAllele = Math.max(0, ...allItems.map((item) => item.long_allele_repunit_count))
  const maxShortAllele = Math.max(0, ...allItems.map((item) => item.short_allele_repunit_count))
  const longDomain = observedRepeatDomain(allItems.map((item) => item.long_allele_repunit_count))
  const shortDomain = observedRepeatDomain(allItems.map((item) => item.short_allele_repunit_count))
  const [minimumCount, maximumCount] = genotypeCountExtent(selectedDistribution)
  const populations = [
    ...new Set(genotypeDistribution.map((cohort) => cohort.ancestry_group as PopulationId)),
  ].sort()

  return (
    <>
      <Heading>
        {heading} <InfoButton topic="str-genotype-distribution" />
      </Heading>
      {explainGenotypes && (
        <p>
          Each square is a shorter/longer allele pair. Its count is the number of individuals with
          that diploid genotype; darker squares represent more individuals. Hover a square for its
          exact repeat pair and count.
        </p>
      )}
      <div
        style={{
          width: '100%',
          maxWidth: compact ? 320 : undefined,
          maxHeight: compact ? 320 : 500,
          aspectRatio: '1 / 1',
        }}
      >
        <ShortTandemRepeatGenotypeDistributionPlot
          axisLabels={
            repeatUnit
              ? [`longer ${repeatUnit} allele`, `shorter ${repeatUnit} allele`]
              : ['longer allele', 'shorter allele']
          }
          minRepeats={focusObservedDomain ? [longDomain[0], shortDomain[0]] : [0, 0]}
          maxRepeats={
            focusObservedDomain ? [longDomain[1], shortDomain[1]] : [maxLongAllele, maxShortAllele]
          }
          genotypeDistribution={selectedDistribution}
          xRanges={[]}
          yRanges={[]}
          onSelectBin={() => {}}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          baseColor={LONG_READ_PRIMARY_PLOT_COLOR}
        />
      </div>
      {explainGenotypes && maximumCount > 0 && (
        <p
          aria-label={`Genotype count legend: ${minimumCount.toLocaleString()} to ${maximumCount.toLocaleString()} individuals`}
        >
          <strong>Count intensity:</strong> lighter = {minimumCount.toLocaleString()}, darker ={' '}
          {maximumCount.toLocaleString()} individual{maximumCount === 1 ? '' : 's'} in the selected
          view.
        </p>
      )}
      <ControlSection
        style={
          compact
            ? {
                marginTop: '0.5em',
                justifyContent: 'flex-start',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px 16px',
              }
            : { marginTop: '0.5em' }
        }
      >
        <ShortTandemRepeatPopulationOptions
          id={`${variantId}-genotype-distribution`}
          populations={populations}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
          ancestryGroupName={longReadAncestryGroupDisplayName}
        />
      </ControlSection>
      {calledCountDistributions && (
        <CalledDenominators
          {...calledCountDistributions}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          kind="genotypes"
        />
      )}
    </>
  )
}
