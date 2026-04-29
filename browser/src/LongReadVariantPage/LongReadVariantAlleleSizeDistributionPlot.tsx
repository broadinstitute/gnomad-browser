import React, { useState } from 'react'
import ShortTandemRepeatAlleleSizeDistributionPlot, {
  AlleleSizeDistributionCohort,
  ColorBy,
  ScaleType,
} from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import {
  consolidateAlleleSizeDistributions,
  ColorByFn,
} from '../ShortTandemRepeatPage/shortTandemRepeatHelpers'
import {
  allPopulations,
  logScaleAllowed,
  Sex,
} from '../ShortTandemRepeatPage/ShortTandemRepeatPage'
import { LongReadVariant } from './LongReadVariantPage'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'
import ControlSection from '../VariantPage/ControlSection'
import ShortTandemRepeatPopulationOptions from '../ShortTandemRepeatPage/ShortTandemRepeatPopulationOptions'
import ShortTandemRepeatColorBySelect from '../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect'
import ShortTandemRepeatScaleSelect from '../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect'

const colorByFn: ColorByFn<AlleleSizeDistributionCohort> = (cohort, colorBy) => {
  if (colorBy === 'sex') {
    return cohort.sex
  }
  if (colorBy === 'population') {
    return cohort.ancestry_group
  }
  return null
}

type Props = {
  variant: LongReadVariant
}

const LongReadVariantAlleleSizeDistributionPlot = ({ variant }: Props) => {
  const { allele_size_distribution } = variant
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleType>('linear')
  const [selectedColorBy, rawSetSelectedColorBy] = useState<ColorBy | null>(null)

  const setSelectedColorBy = (newColorBy: ColorBy | null) => {
    if (selectedScaleType === 'log' && !logScaleAllowed(newColorBy)) {
      setSelectedScaleType('linear')
    }
    rawSetSelectedColorBy(newColorBy)
  }

  if (!allele_size_distribution) {
    return null
  }

  const populations = allPopulations(allele_size_distribution)

  return (
    <>
      <section>
        <ShortTandemRepeatAlleleSizeDistributionPlot
          maxRepeats={100}
          alleleSizeDistribution={consolidateAlleleSizeDistributions(
            allele_size_distribution,
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
      </section>
      <ControlSection style={{ marginTop: '0.5em' }}>
        <ShortTandemRepeatPopulationOptions
          id={`${variant.variant_id}-repeat-counts`}
          populations={populations}
          selectedPopulation={selectedPopulation}
          selectedSex={selectedSex}
          setSelectedPopulation={setSelectedPopulation}
          setSelectedSex={setSelectedSex}
        />
        <ShortTandemRepeatColorBySelect
          id={`${variant.variant_id}-color-by`}
          selectedColorBy={selectedColorBy}
          setSelectedColorBy={setSelectedColorBy}
          setSelectedScaleType={setSelectedScaleType}
          allowedColorBys={['sex', 'population']}
        />
        <ShortTandemRepeatScaleSelect
          id={variant.variant_id}
          selectedScaleType={selectedScaleType}
          setSelectedScaleType={setSelectedScaleType}
          selectedColorBy={selectedColorBy}
        />
      </ControlSection>
    </>
  )
  {
    /*TK get max in there*/
  }
  {
    /* TK de-squish */
  }
}

export default LongReadVariantAlleleSizeDistributionPlot
