import React, { useMemo, useState } from 'react'

import { Table } from './VariantOccurrenceTable'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import InfoButton from '../help/InfoButton'
import Link from '../Link'
import ControlSection from './ControlSection'
import { LongReadDetails, Section } from './VariantPage'
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
import ShortTandemRepeatAttributes from '../ShortTandemRepeatPage/ShortTandemRepeatAttributes'

type Props = {
  variantId: string
  chrom: string
  pos: number
  longReadDetails: LongReadDetails
  ref_allele: string
}

type GenotypeDistributionCohort = NonNullable<LongReadDetails['genotype_distribution']>[number]

const colorByFn: ColorByFn<AlleleSizeDistributionCohort> = (cohort, colorBy) => {
  if (colorBy === 'sex') {
    return cohort.sex
  }
  if (colorBy === 'population') {
    return cohort.ancestry_group
  }
  return null
}

const formatAlleleType = (alleleType: string | null) => {
  if (!alleleType) return '—'
  const labels: Record<string, string> = {
    del: 'Deletion',
    dup: 'Duplication',
    ins: 'Insertion',
    snv: 'Single-nucleotide variant',
    trv: 'Tandem-repeat variant',
  }
  return labels[alleleType.toLowerCase()] || alleleType.toUpperCase()
}

const LongReadVariantDetails = ({ variantId, chrom, pos, longReadDetails, ref_allele }: Props) => {
  const {
    allele_size_distribution,
    end,
    enveloped_ids,
    enveloping_tr_id,
    genotype_distribution,
    length,
    main_reference_region,
    max_repunits,
    motifs,
    short_read_match_id,
    short_read_match_source,
    short_read_match_type,
    sv_consequences,
  } = longReadDetails

  const repeatUnits = motifs && motifs.length > 0 ? motifs : [ref_allele]

  return (
    <>
      <Section>
        <h2>Long-Read Variant Details</h2>
        <Table>
          <tbody>
            <tr>
              <th scope="row">Allele type</th>
              <td>{formatAlleleType(longReadDetails.allele_type)}</td>
            </tr>
            <tr>
              <th scope="row">Position</th>
              <td>
                {chrom}:{pos.toLocaleString()}
                {end != null && end !== pos ? `–${end.toLocaleString()}` : ''}
              </td>
            </tr>
            {length != null && (
              <tr>
                <th scope="row">Allele length</th>
                <td>{Math.abs(length).toLocaleString()} bp</td>
              </tr>
            )}
            {motifs && motifs.length > 0 && (
              <tr>
                <th scope="row">Repeat motif{motifs.length === 1 ? '' : 's'}</th>
                <td>{motifs.join(', ')}</td>
              </tr>
            )}
            {sv_consequences && sv_consequences.length > 0 && (
              <tr>
                <th scope="row">Structural consequences</th>
                <td>{sv_consequences.join(', ')}</td>
              </tr>
            )}
            {short_read_match_id && (
              <tr>
                <th scope="row">Short-read match</th>
                <td>
                  <Link
                    to={`/variant/${short_read_match_id}?dataset=gnomad_r4`}
                    preserveSelectedDataset={false}
                  >
                    View {short_read_match_id} in gnomAD v4 short reads
                  </Link>
                  {(short_read_match_type || short_read_match_source) && (
                    <span>
                      {' '}
                      ({[short_read_match_type, short_read_match_source].filter(Boolean).join(', ')}
                      )
                    </span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Section>

      {main_reference_region && (
        <Section>
          <h2>Tandem Repeat Reference Region</h2>
          <ShortTandemRepeatAttributes
            reference_repeat_unit={repeatUnits[0]}
            repeat_units={repeatUnits.map((repeatUnit) => ({
              repeat_unit: repeatUnit,
              classification: 'unknown',
            }))}
            main_reference_region={main_reference_region}
          />
        </Section>
      )}

      {allele_size_distribution && max_repunits != null && (
        <Section>
          <AlleleSizeDistributionSection
            variantId={variantId}
            alleleSizeDistribution={allele_size_distribution}
            maxRepunits={max_repunits}
          />
        </Section>
      )}

      {genotype_distribution && genotype_distribution.length > 0 && (
        <Section>
          <GenotypeDistributionSection
            variantId={variantId}
            genotypeDistribution={genotype_distribution}
          />
        </Section>
      )}

      {enveloping_tr_id && (
        <Section>
          <h2>Enveloping Tandem Repeat</h2>
          <p>
            This variant falls within a tandem-repeat region.{' '}
            <Link
              to={`/variant/${enveloping_tr_id}?dataset=gnomad_r4_lr`}
              preserveSelectedDataset={false}
            >
              View parent TR: {enveloping_tr_id}
            </Link>
          </p>
        </Section>
      )}

      {enveloped_ids && enveloped_ids.length > 0 && (
        <Section>
          <h2>Overlapping Variant Calls</h2>
          <p>
            These variants were independently called within this repeat region and may reflect the
            same repeat-length event.
          </p>
          <ul>
            {enveloped_ids.map((id) => (
              <li key={id}>
                <Link to={`/variant/${id}?dataset=gnomad_r4_lr`} preserveSelectedDataset={false}>
                  {id}
                </Link>
              </li>
            ))}
          </ul>
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

const GenotypeDistributionSection = ({
  variantId,
  genotypeDistribution,
}: {
  variantId: string
  genotypeDistribution: GenotypeDistributionCohort[]
}) => {
  const [selectedPopulation, setSelectedPopulation] = useState<PopulationId | null>(null)
  const [selectedSex, setSelectedSex] = useState<Sex | null>(null)

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
      <h2>
        Genotype Distribution <InfoButton topic="str-genotype-distribution" />
      </h2>
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

export default LongReadVariantDetails
