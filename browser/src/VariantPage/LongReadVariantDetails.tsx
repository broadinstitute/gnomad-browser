import React, { useState } from 'react'

import InfoButton from '../help/InfoButton'
import { LongReadDetails } from './VariantPage'
import { Section } from './VariantPage'
import ControlSection from './ControlSection'
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
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'
import ShortTandemRepeatColorBySelect from '../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect'
import ShortTandemRepeatScaleSelect from '../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect'
import ShortTandemRepeatPopulationOptions from '../ShortTandemRepeatPage/ShortTandemRepeatPopulationOptions'
import ShortTandemRepeatAttributes from '../ShortTandemRepeatPage/ShortTandemRepeatAttributes'
import Link from '../Link'

type Props = {
  variantId: string
  longReadDetails: LongReadDetails
  ref_allele: string
}

const colorByFn: ColorByFn<AlleleSizeDistributionCohort> = (cohort, colorBy) => {
  if (colorBy === 'sex') {
    return cohort.sex
  }
  if (colorBy === 'population') {
    return cohort.ancestry_group
  }
  return null
}

const LongReadVariantDetails = ({ variantId, longReadDetails, ref_allele }: Props) => {
  const {
    allele_size_distribution,
    max_repunits,
    main_reference_region,
    enveloping_tr_id,
    motifs,
  } = longReadDetails

  return (
    <>
      {main_reference_region && (
        <Section>
          <h2>Tandem Repeat Reference Region</h2>
          <ShortTandemRepeatAttributes
            reference_repeat_unit={ref_allele}
            repeat_units={[{ repeat_unit: ref_allele, classification: 'unknown' }]}
            main_reference_region={main_reference_region}
          />
        </Section>
      )}

      {allele_size_distribution && max_repunits && (
        <Section>
          <AlleleSizeDistributionSection
            variantId={variantId}
            alleleSizeDistribution={allele_size_distribution}
            maxRepunits={max_repunits}
          />
        </Section>
      )}

      {enveloping_tr_id && (
        <Section>
          <h2>Enveloping Tandem Repeat</h2>
          <p>
            This variant falls within a tandem repeat region.{' '}
            <Link
              to={`/variant/${enveloping_tr_id}?dataset=gnomad_r4`}
              preserveSelectedDataset={false}
            >
              View parent TR: {enveloping_tr_id}
            </Link>
          </p>
        </Section>
      )}
    </>
  )
}

const AlleleSizeDistributionSection = ({
  variantId,
  alleleSizeDistribution,
  maxRepunits,
}: {
  variantId: string
  alleleSizeDistribution: AlleleSizeDistributionCohort[]
  maxRepunits: number
}) => {
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

  const populations = allPopulations(alleleSizeDistribution)

  return (
    <>
      <h2>
        Allele Size Distribution <InfoButton topic="str-allele-size-distribution" />
      </h2>
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

export default LongReadVariantDetails
