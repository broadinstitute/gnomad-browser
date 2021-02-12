import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Badge, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '../dataset-constants/gnomadPopulations'
import { labelForDataset } from '../datasets'
import sampleCounts from '../dataset-constants/sampleCounts'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import QCFilter from '../QCFilter'

const Table = styled.table`
  /* To vertically align with the right column's heading */
  margin-top: 1.25em;

  th {
    font-weight: bold;
  }

  th[scope='col'] {
    padding-left: 30px;
    text-align: left;
  }

  th[scope='row'] {
    text-align: right;
  }

  td {
    padding-left: 30px;
    line-height: 1.5;
  }
`

const NoWrap = styled.span`
  white-space: nowrap;
`

const renderGnomadVariantFlag = (variant, exomeOrGenome) => {
  if (!variant[exomeOrGenome]) {
    return <Badge level="error">No variant</Badge>
  }
  const { filters } = variant[exomeOrGenome]
  if (filters.length === 0) {
    return <Badge level="success">Pass</Badge>
  }
  return filters.map(filter => <QCFilter key={filter} filter={filter} />)
}

const FilteringAlleleFrequencyPopulation = styled.div`
  display: none;
  white-space: nowrap;

  @media print {
    display: block;
  }
`

const FilteringAlleleFrequency = ({ popmax, popmax_population: popmaxPopulation }) => {
  if (popmax === null) {
    return <span>—</span>
  }

  if (popmax === 0) {
    return <span>0</span>
  }

  return (
    <span>
      <TooltipAnchor tooltip={GNOMAD_POPULATION_NAMES[popmaxPopulation.toLowerCase()]}>
        <TooltipHint>{popmax.toPrecision(4)}</TooltipHint>
      </TooltipAnchor>
      <FilteringAlleleFrequencyPopulation>
        {GNOMAD_POPULATION_NAMES[popmaxPopulation.toLowerCase()]}
      </FilteringAlleleFrequencyPopulation>
    </span>
  )
}

FilteringAlleleFrequency.propTypes = {
  popmax: PropTypes.number,
  popmax_population: PropTypes.string,
}

FilteringAlleleFrequency.defaultProps = {
  popmax: null,
  popmax_population: null,
}

const LowAlleleNumberWarning = ({
  datasetId,
  hasLowAlleleNumberInExomes,
  hasLowAlleleNumberInGenomes,
}) => {
  const datasetLabel = labelForDataset(datasetId)
  let sampleSet = null
  if (hasLowAlleleNumberInGenomes) {
    sampleSet = hasLowAlleleNumberInExomes
      ? `both ${datasetLabel} exomes and genomes`
      : `${datasetLabel} genomes`
  } else if (hasLowAlleleNumberInExomes) {
    sampleSet = `${datasetLabel} exomes`
  }

  const noticeLevel = hasLowAlleleNumberInGenomes ? 'error' : 'warning'

  return (
    <p>
      <Badge level={noticeLevel}>Warning</Badge> This variant is covered in fewer than 50% of
      individuals in {sampleSet}.{' '}
      {hasLowAlleleNumberInGenomes
        ? 'This may indicate a low-quality site'
        : 'Allele frequency estimates may not be reliable'}
      .
    </p>
  )
}

LowAlleleNumberWarning.propTypes = {
  datasetId: PropTypes.string.isRequired,
  hasLowAlleleNumberInExomes: PropTypes.bool.isRequired,
  hasLowAlleleNumberInGenomes: PropTypes.bool.isRequired,
}

export const GnomadVariantOccurrenceTable = ({ datasetId, showExomes, showGenomes, variant }) => {
  const showTotal = showExomes && showGenomes

  const isPresentInExome = Boolean(variant.exome)
  const isPresentInGenome = Boolean(variant.genome)

  const exomeAlleleCount = isPresentInExome ? variant.exome.ac : 0
  const exomeAlleleNumber = isPresentInExome ? variant.exome.an : 0
  const genomeAlleleCount = isPresentInGenome ? variant.genome.ac : 0
  const genomeAlleleNumber = isPresentInGenome ? variant.genome.an : 0

  const exomeAlleleFrequency = exomeAlleleNumber === 0 ? 0 : exomeAlleleCount / exomeAlleleNumber
  const genomeAlleleFrequency =
    genomeAlleleNumber === 0 ? 0 : genomeAlleleCount / genomeAlleleNumber

  const totalAlleleCount = exomeAlleleCount + genomeAlleleCount
  const totalAlleleNumber = exomeAlleleNumber + genomeAlleleNumber
  const totalAlleleFrequency = totalAlleleNumber === 0 ? 0 : totalAlleleCount / totalAlleleNumber

  const exomeHomozygoteCount = isPresentInExome ? variant.exome.ac_hom : 0
  const genomeHomozygoteCount = isPresentInGenome ? variant.genome.ac_hom : 0
  const totalHomozygoteCount = exomeHomozygoteCount + genomeHomozygoteCount

  const exomeHemizygoteCount = isPresentInExome ? variant.exome.ac_hemi : 0
  const genomeHemizygoteCount = isPresentInGenome ? variant.genome.ac_hemi : 0
  const totalHemizygoteCount = exomeHemizygoteCount + genomeHemizygoteCount

  // Display a warning if a variant's AN is < 50% of the max AN for exomes/genomes.
  // Max AN is 2 * sample count, so 50% max AN is equal to sample count.
  const datasetSampleCounts = sampleCounts[datasetId]
  let exomeMaxAN
  let genomeMaxAN
  if (variant.chrom === 'X') {
    const xxId = datasetId.startsWith('gnomad_r2') || datasetId === 'exac' ? 'female' : 'XX'
    const xyId = datasetId.startsWith('gnomad_r2') || datasetId === 'exac' ? 'male' : 'XY'
    exomeMaxAN = datasetSampleCounts.exomes
      ? datasetSampleCounts.exomes[xxId] * 2 + datasetSampleCounts.exomes[xyId]
      : null
    genomeMaxAN = datasetSampleCounts.genomes
      ? datasetSampleCounts.genomes[xxId] * 2 + datasetSampleCounts.genomes[xyId]
      : null
  } else if (variant.chrom === 'Y') {
    const xyId = datasetId.startsWith('gnomad_r2') || datasetId === 'exac' ? 'male' : 'XY'
    exomeMaxAN = datasetSampleCounts.exomes ? datasetSampleCounts.exomes[xyId] : null
    genomeMaxAN = datasetSampleCounts.genomes ? datasetSampleCounts.genomes[xyId] : null
  } else {
    exomeMaxAN = datasetSampleCounts.exomesTotal * 2
    genomeMaxAN = datasetSampleCounts.genomesTotal * 2
  }
  const hasLowAlleleNumberInExomes = isPresentInExome && variant.exome.an < exomeMaxAN / 2
  const hasLowAlleleNumberInGenomes = isPresentInGenome && variant.genome.an < genomeMaxAN / 2

  // Display a warning if there are some high allele balance samples that may have been misinterpreted as heterozygous.
  // See https://gnomad.broadinstitute.org/faq#why-are-some-variants-depleted-for-homozygotes-out-of-hardy-weinberg-equilibrium
  const exomeHighAlleleBalanceSamples = isPresentInExome
    ? variant.exome.quality_metrics.allele_balance.alt.bin_freq[18] +
      variant.exome.quality_metrics.allele_balance.alt.bin_freq[19]
    : 0
  const genomeHighAlleleBalanceSamples = isPresentInGenome
    ? variant.genome.quality_metrics.allele_balance.alt.bin_freq[18] +
      variant.genome.quality_metrics.allele_balance.alt.bin_freq[19]
    : 0
  const totalHighAlleleBalanceSamples =
    exomeHighAlleleBalanceSamples + genomeHighAlleleBalanceSamples

  const showExomeHighAlleleBalanceWarning =
    exomeHighAlleleBalanceSamples > 0 &&
    (exomeHomozygoteCount === 0 || exomeHighAlleleBalanceSamples / exomeHomozygoteCount >= 0.02)
  const showGenomeHighAlleleBalanceWarning =
    genomeHighAlleleBalanceSamples > 0 &&
    (genomeHomozygoteCount === 0 || genomeHighAlleleBalanceSamples / genomeHomozygoteCount >= 0.02)
  const showHighAlleleBalanceWarning =
    showExomeHighAlleleBalanceWarning || showGenomeHighAlleleBalanceWarning

  const highAlleleBalanceWarningMessage =
    exomeHighAlleleBalanceSamples > 0 && genomeHighAlleleBalanceSamples > 0
      ? `Up to ${totalHighAlleleBalanceSamples} individuals (${exomeHighAlleleBalanceSamples} in exomes and ${genomeHighAlleleBalanceSamples} in genomes) called as heterozygous for this variant have a skewed allele balance which suggests that some may actually be homozygous for the alternative allele.`
      : `Up to ${totalHighAlleleBalanceSamples} individuals called as heterozygous for this variant have a skewed allele balance which suggests that some may actually be homozygous for the alternative allele.`

  return (
    <div>
      <Table>
        <tbody>
          <tr>
            <td />
            {showExomes && <th scope="col">Exomes</th>}
            {showGenomes && <th scope="col">Genomes</th>}
            {showTotal && <th scope="col">Total</th>}
          </tr>
          <tr>
            <th scope="row">Filter</th>
            {showExomes && <td>{renderGnomadVariantFlag(variant, 'exome')}</td>}
            {showGenomes && <td>{renderGnomadVariantFlag(variant, 'genome')}</td>}
            {showTotal && <td />}
          </tr>
          <tr>
            <th scope="row">Allele Count</th>
            {showExomes && <td>{isPresentInExome && exomeAlleleCount}</td>}
            {showGenomes && <td>{isPresentInGenome && genomeAlleleCount}</td>}
            {showTotal && <td>{totalAlleleCount}</td>}
          </tr>
          <tr>
            <th scope="row">Allele Number</th>
            {showExomes && (
              <td>
                {isPresentInExome && exomeAlleleNumber}
                {hasLowAlleleNumberInExomes && ' *'}
              </td>
            )}
            {showGenomes && (
              <td>
                {isPresentInGenome && genomeAlleleNumber}
                {hasLowAlleleNumberInGenomes && ' *'}
              </td>
            )}
            {showTotal && (
              <td>
                {totalAlleleNumber}
                {(hasLowAlleleNumberInExomes || hasLowAlleleNumberInGenomes) && ' *'}
              </td>
            )}
          </tr>
          <tr>
            <th scope="row">Allele Frequency</th>
            {showExomes && <td>{isPresentInExome && exomeAlleleFrequency.toPrecision(4)}</td>}
            {showGenomes && <td>{isPresentInGenome && genomeAlleleFrequency.toPrecision(4)}</td>}
            {showTotal && <td>{totalAlleleFrequency.toPrecision(4)}</td>}
          </tr>
          <tr>
            <th scope="row">
              <NoWrap>
                Popmax Filtering AF <InfoButton topic="faf" />
              </NoWrap>
              <br />
              (95% confidence)
            </th>
            {showExomes && (
              <td>{isPresentInExome && <FilteringAlleleFrequency {...variant.exome.faf95} />}</td>
            )}
            {showGenomes && (
              <td>{isPresentInGenome && <FilteringAlleleFrequency {...variant.genome.faf95} />}</td>
            )}
            {showTotal && <td />}
          </tr>
          {variant.chrom !== 'Y' && (
            <tr>
              <th scope="row">Number of homozygotes</th>
              {showExomes && (
                <td>
                  {isPresentInExome && exomeHomozygoteCount}
                  {showExomeHighAlleleBalanceWarning && ' *'}
                </td>
              )}
              {showGenomes && (
                <td>
                  {isPresentInGenome && genomeHomozygoteCount}
                  {showGenomeHighAlleleBalanceWarning && ' *'}
                </td>
              )}
              {showTotal && (
                <td>
                  {totalHomozygoteCount}
                  {showHighAlleleBalanceWarning && ' *'}
                </td>
              )}
            </tr>
          )}
          {(variant.chrom === 'X' || variant.chrom === 'Y') && (
            <tr>
              <th scope="row">Number of hemizygotes</th>
              {showExomes && <td>{isPresentInExome && exomeHemizygoteCount}</td>}
              {showGenomes && <td>{isPresentInGenome && genomeHemizygoteCount}</td>}
              {showTotal && <td>{totalHemizygoteCount}</td>}
            </tr>
          )}
        </tbody>
      </Table>
      {(hasLowAlleleNumberInExomes || hasLowAlleleNumberInGenomes) && (
        <LowAlleleNumberWarning
          datasetId={datasetId}
          hasLowAlleleNumberInExomes={hasLowAlleleNumberInExomes}
          hasLowAlleleNumberInGenomes={hasLowAlleleNumberInGenomes}
        />
      )}
      {showHighAlleleBalanceWarning && (
        <p>
          <Badge level="warning">Warning</Badge> {highAlleleBalanceWarningMessage}{' '}
          <Link
            to={{
              pathname: '/faq',
              hash:
                '#why-are-some-variants-depleted-for-homozygotes-out-of-hardy-weinberg-equilibrium',
            }}
          >
            More details.
          </Link>
        </p>
      )}
    </div>
  )
}

const histogramPropType = PropTypes.shape({
  bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
  bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
  n_smaller: PropTypes.number.isRequired,
  n_larger: PropTypes.number.isRequired,
})

GnomadVariantOccurrenceTable.propTypes = {
  datasetId: PropTypes.string.isRequired,
  showExomes: PropTypes.bool,
  showGenomes: PropTypes.bool,
  variant: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    exome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      ac_hom: PropTypes.number.isRequired,
      ac_hemi: PropTypes.number,
      faf95: PropTypes.shape({
        popmax: PropTypes.number,
        popmax_population: PropTypes.string,
      }).isRequired,
      quality_metrics: PropTypes.shape({
        allele_balance: PropTypes.shape({
          alt: histogramPropType,
        }).isRequired,
      }).isRequired,
    }),
    genome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      ac_hom: PropTypes.number.isRequired,
      ac_hemi: PropTypes.number,
      faf95: PropTypes.shape({
        popmax: PropTypes.number,
        popmax_population: PropTypes.string,
      }).isRequired,
      quality_metrics: PropTypes.shape({
        allele_balance: PropTypes.shape({
          alt: histogramPropType,
        }).isRequired,
      }).isRequired,
    }),
  }).isRequired,
}

GnomadVariantOccurrenceTable.defaultProps = {
  showExomes: true,
  showGenomes: true,
}
