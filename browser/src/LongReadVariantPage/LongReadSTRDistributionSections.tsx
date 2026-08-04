import React, { useMemo, useState } from 'react'

import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import InfoButton from '../help/InfoButton'
import ControlSection from '../VariantPage/ControlSection'
import ShortTandemRepeatAlleleSizeDistributionPlot, {
  AlleleSizeDistributionCohort,
  ColorBy,
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

const colorByFn: ColorByFn<AlleleSizeDistributionCohort> = (cohort, colorBy) => {
  if (colorBy === 'sex') return cohort.sex
  if (colorBy === 'population') return cohort.ancestry_group
  return null
}

export const LongReadAlleleSizeDistributionSection = ({
  variantId,
  alleleSizeDistribution,
  maxRepunits,
  headingLevel = 'h2',
}: {
  variantId: string
  alleleSizeDistribution: AlleleSizeDistributionCohort[]
  maxRepunits: number
  headingLevel?: HeadingLevel
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
        Allele Size Distribution <InfoButton topic="str-allele-size-distribution" />
      </Heading>
      <ShortTandemRepeatAlleleSizeDistributionPlot
        maxRepeats={maxRepunits}
        alleleSizeDistribution={consolidateAlleleSizeDistributions(
          alleleSizeDistribution,
          colorByFn,
          selectedPopulation,
          selectedSex,
          selectedColorBy,
          null,
          null
        )}
        colorBy={selectedColorBy}
        repeatUnitLength={null}
        scaleType={selectedScaleType}
      />
      <ControlSection style={{ marginTop: '0.5em' }}>
        <ShortTandemRepeatPopulationOptions
          id={`${variantId}-repeat-counts`}
          populations={populations}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
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
  headingLevel = 'h2',
}: {
  variantId: string
  genotypeDistribution: GenotypeDistributionCohort[]
  headingLevel?: HeadingLevel
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
        Genotype Distribution <InfoButton topic="str-genotype-distribution" />
      </Heading>
      <ShortTandemRepeatGenotypeDistributionPlot
        axisLabels={['longer allele', 'shorter allele']}
        maxRepeats={[maxLongAllele, maxShortAllele]}
        genotypeDistribution={selectedDistribution}
        xRanges={[]}
        yRanges={[]}
        onSelectBin={() => {}}
        selectedPopulation={selectedPopulation}
        selectedSex={selectedSex}
      />
      <ControlSection style={{ marginTop: '0.5em' }}>
        <ShortTandemRepeatPopulationOptions
          id={`${variantId}-genotype-distribution`}
          populations={populations}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
        />
      </ControlSection>
    </>
  )
}
