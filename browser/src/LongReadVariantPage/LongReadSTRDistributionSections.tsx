import React, { useMemo, useState } from 'react'

import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import InfoButton from '../help/InfoButton'
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
}: CalledCountDistributions & {
  selectedPopulation: PopulationId | null
  selectedSex: Sex | null
}) => {
  const counts = selectedCalledCounts(
    { alleleSizeDistribution, genotypeDistribution },
    selectedPopulation,
    selectedSex
  )
  return (
    <p aria-live="polite">
      <strong>
        {counts.calledAlleles.toLocaleString()} called alleles;{' '}
        {counts.calledDiploidGenotypes.toLocaleString()} complete two-allele genotypes.
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
}: {
  variantId: string
  alleleSizeDistribution: AlleleSizeDistributionCohort[]
  maxRepunits: number
  repeatUnit?: string
  headingLevel?: HeadingLevel
  heading?: string
  compact?: boolean
  calledCountDistributions?: CalledCountDistributions
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
          maxRepeats={maxRepunits}
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
}: {
  variantId: string
  genotypeDistribution: GenotypeDistributionCohort[]
  repeatUnit?: string
  headingLevel?: HeadingLevel
  heading?: string
  compact?: boolean
  calledCountDistributions?: CalledCountDistributions
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
  const populations = [
    ...new Set(genotypeDistribution.map((cohort) => cohort.ancestry_group as PopulationId)),
  ].sort()

  return (
    <>
      <Heading>
        {heading} <InfoButton topic="str-genotype-distribution" />
      </Heading>
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
          maxRepeats={[maxLongAllele, maxShortAllele]}
          genotypeDistribution={selectedDistribution}
          xRanges={[]}
          yRanges={[]}
          onSelectBin={() => {}}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
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
        />
      )}
    </>
  )
}
