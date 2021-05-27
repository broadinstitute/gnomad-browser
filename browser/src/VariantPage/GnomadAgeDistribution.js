import { sum } from 'd3-array'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import { Checkbox, Select } from '@gnomad/ui'

import gnomadV2AgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v2/ageDistribution.json'
import gnomadV3AgeDistribution from '@gnomad/dataset-metadata/datasets/gnomad-v3/ageDistribution.json'

import Legend, { StripedSwatch } from '../Legend'
import StackedHistogram from '../StackedHistogram'
import ControlSection from './ControlSection'

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
}) => {
  const histogram = (variant.exome || variant.genome).age_distribution.het
  const nBins = histogram.bin_freq.length

  const exomeData = includeExomes && variant.exome ? variant.exome.age_distribution : null
  const genomeData = includeGenomes && variant.genome ? variant.genome.age_distribution : null

  return [
    [
      exomeData
        ? (includeHeterozygotes ? exomeData.het.n_smaller : 0) +
          (includeHomozygotes ? exomeData.hom.n_smaller : 0)
        : 0,
      genomeData
        ? (includeHeterozygotes ? genomeData.het.n_smaller : 0) +
          (includeHomozygotes ? genomeData.hom.n_smaller : 0)
        : 0,
    ],
    ...[...Array(nBins)].map((_, i) => [
      exomeData
        ? (includeHeterozygotes ? exomeData.het.bin_freq[i] : 0) +
          (includeHomozygotes ? exomeData.hom.bin_freq[i] : 0)
        : 0,
      genomeData
        ? (includeHeterozygotes ? genomeData.het.bin_freq[i] : 0) +
          (includeHomozygotes ? genomeData.hom.bin_freq[i] : 0)
        : 0,
    ]),
    [
      exomeData
        ? (includeHeterozygotes ? exomeData.het.n_larger : 0) +
          (includeHomozygotes ? exomeData.hom.n_larger : 0)
        : 0,
      genomeData
        ? (includeHeterozygotes ? genomeData.het.n_larger : 0) +
          (includeHomozygotes ? genomeData.hom.n_larger : 0)
        : 0,
    ],
  ]
}

const prepareOverallData = ({ datasetId, includeExomes, includeGenomes }) => {
  let overallAgeDistribution = null
  if (datasetId.startsWith('gnomad_r3')) {
    overallAgeDistribution = gnomadV3AgeDistribution
  } else if (datasetId.startsWith('gnomad_r2')) {
    overallAgeDistribution = gnomadV2AgeDistribution
  }

  if (!overallAgeDistribution) {
    return null
  }

  const nBins = (overallAgeDistribution.exome || overallAgeDistribution.genome).bin_freq.length

  const exomeData =
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

const getDefaultSelectedSequencingType = variant => {
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

const GnomadAgeDistribution = ({ datasetId, variant }) => {
  const [selectedSequencingType, setSelectedSequencingType] = useState(
    getDefaultSelectedSequencingType(variant)
  )

  const [includeHeterozygotes, setIncludeHeterozygotes] = useState(true)
  const [includeHomozygotes, setIncludeHomozygotes] = useState(true)

  const [showAllIndividuals, setShowAllIndividuals] = useState(datasetId !== 'exac')

  const binEdges = (variant.exome || variant.genome).age_distribution.het.bin_edges
  const bins = [
    `< ${binEdges[0]}`,
    ...[...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`),
    `> ${binEdges[binEdges.length - 1]}`,
  ]

  const values = prepareVariantData({
    includeExomes: selectedSequencingType.includes('e'),
    includeGenomes: selectedSequencingType.includes('g'),
    includeHeterozygotes,
    includeHomozygotes,
    variant,
  })

  const secondaryValues = prepareOverallData({
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
        id="age-distribution-plot"
        bins={bins}
        values={values}
        secondaryValues={showAllIndividuals ? secondaryValues : null}
        xLabel="Age"
        yLabel="Variant carriers"
        secondaryYLabel="All individuals"
        barColors={['#428bca', '#73ab3d']}
        formatTooltip={(bin, variantCarriersInBin, allIndividualsInBin) => {
          const nVariantCarriers = sum(variantCarriersInBin)
          let tooltipText = `${nVariantCarriers.toLocaleString()} variant carrier${
            nVariantCarriers !== 1 ? 's' : ''
          }`
          if (showAllIndividuals && allIndividualsInBin) {
            const nTotalIndividuals = sum(allIndividualsInBin)
            tooltipText += ` and ${nTotalIndividuals.toLocaleString()} total individual${
              nTotalIndividuals ? 's' : ''
            }`
          }
          tooltipText += ` are in the ${bin} age range`
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
            label="Include homozygous variant carriers"
            onChange={setIncludeHomozygotes}
          />
          <Checkbox
            checked={showAllIndividuals}
            disabled={secondaryValues === null}
            id="age-distribution-show-all-individuals"
            label="Compare to all individuals"
            onChange={setShowAllIndividuals}
          />
        </CheckboxWrapper>

        <label htmlFor="age-distribution-sequencing-type">
          Sequencing types:{' '}
          <Select
            id="age-distribution-sequencing-type"
            disabled={!variant.exome || !variant.genome}
            onChange={e => {
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

const AgeDistributionPropType = PropTypes.shape({
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

GnomadAgeDistribution.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variant: PropTypes.shape({
    exome: PropTypes.shape({
      age_distribution: AgeDistributionPropType.isRequired,
    }),
    genome: PropTypes.shape({
      age_distribution: AgeDistributionPropType.isRequired,
    }),
  }).isRequired,
}

export default GnomadAgeDistribution
