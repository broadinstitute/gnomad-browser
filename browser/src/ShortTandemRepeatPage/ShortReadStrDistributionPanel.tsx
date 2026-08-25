import React, { useMemo, useState } from 'react'
import styled from 'styled-components'

import { Button, Select } from '@gnomad/ui'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import ControlSection from '../VariantPage/ControlSection'
import ShortTandemRepeatAlleleSizeDistributionPlot, {
  ColorBy,
  ScaleType,
} from './ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatColorBySelect from './ShortTandemRepeatColorBySelect'
import ShortTandemRepeatGenotypeDistributionPlot from './ShortTandemRepeatGenotypeDistributionPlot'
import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'
import ShortTandemRepeatScaleSelect from './ShortTandemRepeatScaleSelect'
import {
  selectShortReadAlleleSizeDistribution,
  selectShortReadGenotypeDistribution,
} from './shortTandemRepeatHelpers'
import {
  allPopulations,
  GenotypeDistributionCohort,
  logScaleAllowed,
  PlotRange,
  Sex,
  V3AlleleSizeDistributionCohort,
} from './ShortTandemRepeatPage'

export type ShortReadDiseaseRange = {
  name: string
  symbol: string
  repeat_size_classifications: {
    classification: string
    min: number | null
    max: number | null
  }[]
  notes: string | null
}

export type ShortReadDistributionPart<T> = {
  status: 'AVAILABLE' | 'UNAVAILABLE'
  reason_code: string | null
  distributions: T[]
}

const PlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr)); /* stylelint-disable-line unit-whitelist */
  gap: clamp(20px, 2vw, 32px);
  margin-top: 1.25em;

  @media (max-width: 800px) {
    grid-template-columns: minmax(0, 1fr); /* stylelint-disable-line unit-whitelist */
  }
`

const PlotCard = styled.section`
  min-width: 0;
  padding: 1em;
  border: 1px solid #bdd7a8;
  border-radius: 6px;
  background: #fff;
`

const AllelePlotFrame = styled.div`
  width: 100%;
  height: 320px;
`

const GenotypePlotFrame = styled.div`
  width: 100%;
  max-width: 460px;
  aspect-ratio: 1 / 1;
`

const SharedControls = styled.div`
  padding: 0.85em;
  border: 1px solid #d5e6c7;
  border-radius: 6px;
  background: #f8fcf5;
`

const DiseaseControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75em;
  margin-top: 1em;
`

const RangeContext = styled.div`
  padding: 0.65em 0.8em;
  border-left: 4px solid #73ab3d;
  margin-top: 0.75em;
  background: #f8fcf5;

  p:last-child,
  ul:last-child {
    margin-bottom: 0;
  }
`

const UnavailableCard = ({ kind, reasonCode }: { kind: string; reasonCode: string | null }) => (
  <PlotCard data-distribution-status="unavailable" data-reason-code={reasonCode || undefined}>
    <h3>{kind}</h3>
    <p role="status">
      The short-read {kind.toLowerCase()} is unavailable independently; no values were inferred or
      substituted.
    </p>
  </PlotCard>
)

const rangeText = ({
  classification,
  min,
  max,
}: ShortReadDiseaseRange['repeat_size_classifications'][number]) => {
  if (min == null && max == null) return `${classification}: source limits not provided`
  if (min == null) return `${classification} ≤ ${max}`
  if (max == null) return `${classification} ≥ ${min}`
  return `${classification} ${min}–${max}`
}

const plotRanges = (disease: ShortReadDiseaseRange | undefined): PlotRange[] =>
  (disease?.repeat_size_classifications || [])
    .filter(({ min, max }) => min != null || max != null)
    .map(({ classification, min, max }) => ({
      label: classification,
      start: min == null ? 0 : min,
      stop: max == null ? Infinity : max + 1,
    }))

const selectedTotals = (
  alleleDistributions: V3AlleleSizeDistributionCohort[],
  genotypeDistributions: GenotypeDistributionCohort[],
  selectedPopulation: PopulationId | null,
  selectedSex: Sex | null
) => {
  const selected = (cohort: { ancestry_group: string; sex: Sex }) =>
    (selectedPopulation === null || cohort.ancestry_group === selectedPopulation) &&
    (selectedSex === null || cohort.sex === selectedSex)

  return {
    alleleCopies: alleleDistributions
      .filter(selected)
      .flatMap((cohort) => cohort.distribution)
      .reduce((sum, bin) => sum + bin.frequency, 0),
    people: genotypeDistributions
      .filter(selected)
      .flatMap((cohort) => cohort.distribution)
      .reduce((sum, cell) => sum + cell.frequency, 0),
  }
}

const ShortReadStrDistributionPanel = ({
  id,
  motif,
  diseases,
  allele,
  genotype,
}: {
  id: string
  motif: string
  diseases: ShortReadDiseaseRange[]
  allele: ShortReadDistributionPart<V3AlleleSizeDistributionCohort>
  genotype: ShortReadDistributionPart<GenotypeDistributionCohort>
}) => {
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)
  const [selectedScaleType, setSelectedScaleType] = useState<ScaleType>('linear')
  const [selectedColorBy, rawSetSelectedColorBy] = useState<ColorBy | null>(null)
  const [selectedDiseaseName, setSelectedDiseaseName] = useState(
    diseases.length === 1 ? diseases[0].name : ''
  )

  const setSelectedColorBy = (newColorBy: ColorBy | null) => {
    if (selectedScaleType === 'log' && !logScaleAllowed(newColorBy)) {
      setSelectedScaleType('linear')
    }
    rawSetSelectedColorBy(newColorBy)
  }

  const safeId = id.replace(/[^A-Za-z0-9_-]/g, '-')
  const admittedAlleleDistributions = allele.distributions.filter(
    (cohort) => cohort.repunit === motif
  )
  const admittedGenotypeDistributions = genotype.distributions.filter(
    (cohort) => cohort.short_allele_repunit === motif && cohort.long_allele_repunit === motif
  )
  const alleleAvailable = allele.status === 'AVAILABLE' && admittedAlleleDistributions.length > 0
  const genotypeAvailable =
    genotype.status === 'AVAILABLE' && admittedGenotypeDistributions.length > 0
  const populations = allPopulations(admittedAlleleDistributions).concat(
    admittedGenotypeDistributions.map((cohort) => cohort.ancestry_group as PopulationId)
  )
  const uniquePopulations = [...new Set(populations)].sort()
  const selectedDisease = diseases.find((disease) => disease.name === selectedDiseaseName)
  const ranges = plotRanges(selectedDisease)
  const totals = selectedTotals(
    admittedAlleleDistributions,
    admittedGenotypeDistributions,
    selectedPopulation,
    selectedSex
  )

  const selectedAlleles = useMemo(
    () =>
      selectShortReadAlleleSizeDistribution(admittedAlleleDistributions, {
        selectedPopulation,
        selectedSex,
        selectedColorBy,
        selectedRepeatUnit: motif,
      }),
    [admittedAlleleDistributions, motif, selectedColorBy, selectedPopulation, selectedSex]
  )
  const selectedGenotypes = useMemo(
    () =>
      selectShortReadGenotypeDistribution(admittedGenotypeDistributions, {
        selectedPopulation,
        selectedSex,
        selectedRepeatUnits: [motif, motif],
      }),
    [admittedGenotypeDistributions, motif, selectedPopulation, selectedSex]
  )
  const maxAlleleRepeats = Math.max(
    0,
    ...admittedAlleleDistributions.flatMap((cohort) =>
      cohort.distribution.map((item) => item.repunit_count)
    )
  )
  const maxGenotypeRepeats = admittedGenotypeDistributions.flatMap((cohort) => cohort.distribution)
  const maxLongAllele = Math.max(
    0,
    ...maxGenotypeRepeats.map((item) => item.long_allele_repunit_count)
  )
  const maxShortAllele = Math.max(
    0,
    ...maxGenotypeRepeats.map((item) => item.short_allele_repunit_count)
  )

  return (
    <div data-testid="short-read-distribution-panel">
      <SharedControls aria-label="Short-read cohort filters">
        <strong>Short-read cohort controls</strong>
        {(alleleAvailable || genotypeAvailable) && (
          <ControlSection style={{ marginTop: '0.5em' }}>
            <ShortTandemRepeatPopulationOptions
              id={`${safeId}-reference-cohort`}
              populations={uniquePopulations}
              selectedPopulation={selectedPopulation}
              selectedSex={selectedSex}
              setSelectedPopulation={setSelectedPopulation}
              setSelectedSex={setSelectedSex}
            />
          </ControlSection>
        )}
        <p aria-live="polite">
          <strong>
            {alleleAvailable
              ? `${totals.alleleCopies.toLocaleString()} short-read allele copies`
              : 'Short-read allele-copy total unavailable'}
          </strong>{' '}
          and{' '}
          <strong>
            {genotypeAvailable
              ? `${totals.people.toLocaleString()} people`
              : 'Short-read people total unavailable'}
          </strong>{' '}
          in the selected view.
        </p>
      </SharedControls>

      {(alleleAvailable || genotypeAvailable) && (
        <DiseaseControls>
          <label htmlFor={`${safeId}-catalog-ranges`}>
            Catalog ranges:{' '}
            <Select
              id={`${safeId}-catalog-ranges`}
              aria-label="Short-read catalog ranges"
              value={selectedDiseaseName}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedDiseaseName(event.target.value)
              }
            >
              <option value="">No ranges</option>
              {diseases.map((disease) => (
                <option key={disease.name} value={disease.name}>
                  {disease.name} ({disease.symbol})
                </option>
              ))}
            </Select>
          </label>
          {selectedDisease && (
            <Button type="button" onClick={() => setSelectedDiseaseName('')}>
              Hide ranges
            </Button>
          )}
        </DiseaseControls>
      )}

      {selectedDisease && (alleleAvailable || genotypeAvailable) && (
        <RangeContext data-testid="short-read-catalog-range-context">
          <p>
            <strong>Catalog context for {selectedDisease.name} only.</strong> These source ranges
            annotate the short-read repeat-count plots below and never classify LR observations.
          </p>
          <ul>
            {selectedDisease.repeat_size_classifications.map((classification) => (
              <li
                key={`${classification.classification}:${classification.min}:${classification.max}`}
              >
                {rangeText(classification)}
              </li>
            ))}
          </ul>
          {selectedDisease.notes && (
            <p>
              <strong>Catalog note:</strong> {selectedDisease.notes}
            </p>
          )}
        </RangeContext>
      )}

      <PlotGrid data-testid="short-read-distribution-grid">
        {alleleAvailable ? (
          <PlotCard data-distribution-status="available">
            <h3>Short-read allele repeat-count distribution — {motif}</h3>
            <AllelePlotFrame>
              <ShortTandemRepeatAlleleSizeDistributionPlot
                maxRepeats={maxAlleleRepeats}
                alleleSizeDistribution={selectedAlleles}
                colorBy={selectedColorBy}
                repeatUnitLength={motif.length}
                repeatUnit={motif}
                ranges={ranges}
                scaleType={selectedScaleType}
              />
            </AllelePlotFrame>
            <ControlSection style={{ marginTop: '0.5em' }}>
              <ShortTandemRepeatColorBySelect
                id={`${safeId}-reference-cohort`}
                selectedColorBy={selectedColorBy}
                setSelectedColorBy={setSelectedColorBy}
                setSelectedScaleType={setSelectedScaleType}
              />
              <ShortTandemRepeatScaleSelect
                id={`${safeId}-reference-cohort`}
                selectedScaleType={selectedScaleType}
                setSelectedScaleType={setSelectedScaleType}
                selectedColorBy={selectedColorBy}
              />
            </ControlSection>
            <p>
              <strong>{totals.alleleCopies.toLocaleString()} allele copies</strong> in this
              short-read view.
            </p>
          </PlotCard>
        ) : (
          <UnavailableCard
            kind="Allele-copy distribution"
            reasonCode={allele.reason_code || 'EXACT_MOTIF_ROWS_UNAVAILABLE'}
          />
        )}

        {genotypeAvailable ? (
          <PlotCard data-distribution-status="available">
            <h3>
              Short-read genotype repeat-count distribution — {motif}/{motif}
            </h3>
            <GenotypePlotFrame>
              <ShortTandemRepeatGenotypeDistributionPlot
                axisLabels={[`longer ${motif} allele`, `shorter ${motif} allele`]}
                maxRepeats={[maxLongAllele, maxShortAllele]}
                genotypeDistribution={selectedGenotypes}
                xRanges={ranges}
                yRanges={ranges}
                selectedPopulation={selectedPopulation}
                selectedSex={selectedSex}
              />
            </GenotypePlotFrame>
            <p>
              <strong>{totals.people.toLocaleString()} people</strong> in this short-read view.
            </p>
          </PlotCard>
        ) : (
          <UnavailableCard
            kind="Genotype distribution"
            reasonCode={genotype.reason_code || 'EXACT_MOTIF_PAIR_ROWS_UNAVAILABLE'}
          />
        )}
      </PlotGrid>
    </div>
  )
}

export default ShortReadStrDistributionPanel
