import { sum } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox, Select } from '@gnomad/ui'

import gnomadV2AgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v2/ageDistribution.json'
import gnomadV3AgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v3/ageDistribution.json'
import gnomadV4AgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v4/ageDistribution.json'

import {
  DatasetId,
  isV2,
  isV3,
  isV4,
  showAllIndividualsInAgeDistributionByDefault,
} from '@gnomad/dataset-metadata/metadata'

import Legend, { StripedSwatch } from '../Legend'
import StackedHistogram from '../StackedHistogram'
import ControlSection from './ControlSection'
import { Variant } from './VariantPage'

const LegendWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1em;
`

const CheckboxWrapper = styled.div`
  label {
    display: block;
    line-height: 1.5;
  }
`

const prepareVariantData = ({
  includeExomes,
  includeGenomes,
  includeHeterozygotes,
  includeHomozygotes,
  variant,
}: any) => {
  const histogram = (variant.exome || variant.genome).age_distribution.het
  const nBins = histogram.bin_freq.length

  const exomeData = includeExomes && variant.exome ? variant.exome.age_distribution : null
  const genomeData = includeGenomes && variant.genome ? variant.genome.age_distribution : null

  return [
    [
      exomeData
        ? (includeHeterozygotes && exomeData.het ? exomeData.het.n_smaller : 0) +
          (includeHomozygotes && exomeData.hom ? exomeData.hom.n_smaller : 0)
        : 0,
      genomeData
        ? (includeHeterozygotes && genomeData.het ? genomeData.het.n_smaller : 0) +
          (includeHomozygotes && genomeData.hom ? genomeData.hom.n_smaller : 0)
        : 0,
    ],
    ...[...Array(nBins)].map((_, i) => [
      exomeData
        ? (includeHeterozygotes && exomeData.het ? exomeData.het.bin_freq[i] : 0) +
          (includeHomozygotes && exomeData.hom ? exomeData.hom.bin_freq[i] : 0)
        : 0,
      genomeData
        ? (includeHeterozygotes && genomeData.het ? genomeData.het.bin_freq[i] : 0) +
          (includeHomozygotes && genomeData.hom ? genomeData.hom.bin_freq[i] : 0)
        : 0,
    ]),
    [
      exomeData
        ? (includeHeterozygotes && exomeData.het ? exomeData.het.n_larger : 0) +
          (includeHomozygotes && exomeData.hom ? exomeData.hom.n_larger : 0)
        : 0,
      genomeData
        ? (includeHeterozygotes && genomeData.het ? genomeData.het.n_larger : 0) +
          (includeHomozygotes && genomeData.hom ? genomeData.hom.n_larger : 0)
        : 0,
    ],
  ]
}

const prepareOverallData = ({ datasetId, includeExomes, includeGenomes }: any) => {
  let overallAgeDistribution = null
  if (isV4(datasetId)) {
    overallAgeDistribution = gnomadV4AgeDistribution
  } else if (isV3(datasetId)) {
    overallAgeDistribution = gnomadV3AgeDistribution
  } else if (isV2(datasetId)) {
    overallAgeDistribution = gnomadV2AgeDistribution
  }

  if (!overallAgeDistribution) {
    return null
  }

  // @ts-expect-error
  const nBins = (overallAgeDistribution.exome || overallAgeDistribution.genome).bin_freq.length

  const exomeData =
    // @ts-expect-error
    includeExomes && overallAgeDistribution.exome ? overallAgeDistribution.exome : null
  const genomeData =
    includeGenomes && overallAgeDistribution.genome ? overallAgeDistribution.genome : null

  return [
    [exomeData ? exomeData.n_smaller : 0, genomeData ? genomeData.n_smaller : 0],
    ...[...Array(nBins)].map((_, i) => [
      exomeData ? exomeData.bin_freq[i] : 0,
      genomeData ? genomeData.bin_freq[i] : 0,
    ]),
    [exomeData ? exomeData.n_larger : 0, genomeData ? genomeData.n_larger : 0],
  ]
}

const getDefaultSelectedSequencingType = (variant: any) => {
  const hasExome = Boolean(variant.exome)
  const hasGenome = Boolean(variant.genome)

  if (hasExome && hasGenome) {
    return 'eg'
  }
  if (hasExome) {
    return 'e'
  }
  return 'g'
}

type GnomadAgeDistributionProps = {
  datasetId: DatasetId
  variant: Variant
}

const GnomadAgeDistribution = ({ datasetId, variant }: GnomadAgeDistributionProps) => {
  const [selectedSequencingType, setSelectedSequencingType] = useState(
    getDefaultSelectedSequencingType(variant)
  )

  const [includeHeterozygotes, setIncludeHeterozygotes] = useState(true)
  const [includeHomozygotes, setIncludeHomozygotes] = useState(true)

  const showVariantCarriers = includeHeterozygotes || includeHomozygotes
  const [showAllIndividuals, setShowAllIndividuals] = useState(
    showAllIndividualsInAgeDistributionByDefault(datasetId)
  )

  const hasAgeDistribution =
    (variant.exome && variant.exome.age_distribution && variant.exome.age_distribution.het) ||
    (variant.genome && variant.genome.age_distribution && variant.genome.age_distribution.het)

  if (!hasAgeDistribution) {
    return <>Age distribution not available for this variant.</>
  }

  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const binEdges = (variant.exome || variant.genome).age_distribution.het.bin_edges
  const bins = [
    `< ${binEdges[0]}`,
    ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
    `> ${binEdges[binEdges.length - 1]}`,
  ]

  const variantCarrierValues = prepareVariantData({
    includeExomes: selectedSequencingType.includes('e'),
    includeGenomes: selectedSequencingType.includes('g'),
    includeHeterozygotes,
    includeHomozygotes,
    variant,
  })

  const allIndividualsValues = prepareOverallData({
    datasetId,
    includeExomes: selectedSequencingType.includes('e'),
    includeGenomes: selectedSequencingType.includes('g'),
  })

  return (
    <div>
      <LegendWrapper>
        <Legend
          series={[
            { label: 'Exome', color: '#428bca' },
            { label: 'Genome', color: '#73ab3d' },
          ]}
        />
        {showAllIndividuals && (
          <Legend
            series={[
              { label: 'Variant carriers', color: '#999' },
              {
                label: 'All individuals',
                swatch: <StripedSwatch id="age-distribution-legend-swatch" color="#999" />,
              },
            ]}
          />
        )}
      </LegendWrapper>

      <StackedHistogram
        // @ts-expect-error TS(2322) FIXME: Type '{ id: string; bins: string[]; values: any[][... Remove this comment to see the full error message
        id="age-distribution-plot"
        bins={bins}
        values={variantCarrierValues}
        secondaryValues={showAllIndividuals ? allIndividualsValues : null}
        xLabel="Age"
        yLabel="Variant carriers"
        secondaryYLabel="All individuals"
        barColors={['#428bca', '#73ab3d']}
        formatTooltip={(bin: any, variantCarriersInBin: any, allIndividualsInBin: any) => {
          if (!showVariantCarriers && !showAllIndividuals) {
            return `${bin} age range`
          }

          let tooltipText = ''

          const nVariantCarriers = showVariantCarriers ? sum(variantCarriersInBin) : 0
          if (showVariantCarriers) {
            let carriersDescription = ''
            if (includeHeterozygotes && !includeHomozygotes) {
              carriersDescription = 'heterozygous '
            } else if (!includeHeterozygotes && includeHomozygotes) {
              carriersDescription = 'homozygous '
            }

            tooltipText = `${nVariantCarriers.toLocaleString()} ${carriersDescription}variant carrier${
              nVariantCarriers !== 1 ? 's' : ''
            }`
          }

          const nTotalIndividuals =
            showAllIndividuals && allIndividualsInBin ? sum(allIndividualsInBin) : 0
          if (showAllIndividuals && allIndividualsInBin) {
            if (showVariantCarriers) {
              tooltipText += ' and '
            }

            tooltipText += `${nTotalIndividuals.toLocaleString()} total individual${
              nTotalIndividuals ? 's' : ''
            }`
          }

          tooltipText += ` ${
            showVariantCarriers !== showAllIndividuals && nVariantCarriers + nTotalIndividuals === 1
              ? 'is'
              : 'are'
          } in the ${bin} age range`
          return tooltipText
        }}
      />

      <ControlSection>
        <CheckboxWrapper>
          <Checkbox
            checked={includeHeterozygotes}
            id="age-distribution-include-heterozygotes"
            label="Include heterozygous variant carriers"
            onChange={setIncludeHeterozygotes}
          />
          <Checkbox
            checked={includeHomozygotes}
            id="age-distribution-include-homozygotes"
            label={
              variant.chrom === 'X' || variant.chrom === 'Y'
                ? 'Include homozygous and hemizygous variant carriers'
                : 'Include homozygous variant carriers'
            }
            onChange={setIncludeHomozygotes}
          />
          <Checkbox
            checked={showAllIndividuals}
            disabled={allIndividualsValues === null}
            id="age-distribution-show-all-individuals"
            label="Compare to all individuals"
            onChange={setShowAllIndividuals}
          />
        </CheckboxWrapper>

        <label htmlFor="age-distribution-sequencing-type">
          Sequencing types: {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="age-distribution-sequencing-type"
            disabled={!variant.exome || !variant.genome}
            onChange={(e: any) => {
              setSelectedSequencingType(e.target.value)
            }}
            value={selectedSequencingType}
          >
            <option value="eg">Exome and Genome</option>
            <option value="e">Exome</option>
            <option value="g">Genome</option>
          </Select>
        </label>
      </ControlSection>
    </div>
  )
}

type AgeDistributionPropType = {
  het: {
    bin_edges: number[]
    bin_freq: number[]
    n_smaller?: number
    n_larger?: number
  }
  hom: {
    bin_edges: number[]
    bin_freq: number[]
    n_smaller?: number
    n_larger?: number
  }
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ het: Validator<Infe... Remove this comment to see the full error message
const AgeDistributionPropType: PropTypes.Requireable<AgeDistributionPropType> = PropTypes.shape({
  het: PropTypes.shape({
    bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
    bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
    n_smaller: PropTypes.number,
    n_larger: PropTypes.number,
  }).isRequired,
  hom: PropTypes.shape({
    bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
    bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
    n_smaller: PropTypes.number,
    n_larger: PropTypes.number,
  }).isRequired,
})

export default GnomadAgeDistribution
