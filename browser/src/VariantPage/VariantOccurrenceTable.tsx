import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Badge, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'
import sampleCounts from '@gnomad/dataset-metadata/sampleCounts'

import { DatasetId, labelForDataset, isV4 } from '@gnomad/dataset-metadata/metadata'
import InfoButton from '../help/InfoButton'
import Link from '../Link'
import QCFilter from '../QCFilter'
import { Variant } from './VariantPage'

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

type VariantContext = 'exome' | 'genome' | 'joint'
const renderGnomadVariantFlag = (variant: Variant, context: VariantContext) => {
  if (!variant[context]) {
    let badgeName = 'No variant'
    let badgeDescription =
      'Variant is not present in this data type. All called sample genotypes from this data type are homozygous reference'

    if (variant.joint) {
      if (
        (context === 'exome' && variant.joint.filters.includes('not_called_in_exomes')) ||
        (context === 'genome' && variant.joint.filters.includes('not_called_in_genomes'))
      ) {
        badgeName = 'No data'
        badgeDescription = `This variant was not called in the gnomAD ${context} callset; no ${context} samples had any genotype call (no reference or alternate calls)`
      }
    }

    return context === 'joint' ? (
      <div />
    ) : (
      <Badge level="error" tooltip={badgeDescription}>
        {badgeName}
      </Badge>
    )
  }
  const { filters } = variant[context]!

  if (filters.length === 0) {
    return context === 'joint' ? <div /> : <Badge level="success">Pass</Badge>
  }

  return filters.map((filter) => {
    const data =
      filter === 'discrepant_frequencies'
        ? {
            pValue: variant.joint!.freq_comparison_stats.stat_union.p_value,
            testName: variant.joint!.freq_comparison_stats.stat_union.stat_test_name,
            geneticAncestry:
              variant.joint!.freq_comparison_stats.stat_union.gen_ancs[0] || undefined,
          }
        : {}

    return <QCFilter key={filter} filter={filter} data={data} />
  })
}

const FilteringAlleleFrequencyPopulation = styled.div`
  display: none;
  white-space: nowrap;

  @media print {
    display: block;
  }
`

type OwnFilteringAlleleFrequencyProps = {
  popmax?: number
  popmax_population?: string
}

// @ts-expect-error TS(2456) FIXME: Type alias 'FilteringAlleleFrequencyProps' circula... Remove this comment to see the full error message
type FilteringAlleleFrequencyProps = OwnFilteringAlleleFrequencyProps &
  typeof FilteringAlleleFrequency.defaultProps

// @ts-expect-error TS(7022) FIXME: 'FilteringAlleleFrequency' implicitly has type 'an... Remove this comment to see the full error message
const FilteringAlleleFrequency = ({
  popmax,
  popmax_population: popmaxPopulation,
}: FilteringAlleleFrequencyProps) => {
  // popmax (now called fafmax) of 0 is filtered out of the faf array of candidates
  //   instead, now display '-' rather than 0 to match the logic in the pipeline
  //   and in the method team's release process
  if (popmax === null || popmax === 0) {
    return <span>—</span>
  }

  return (
    <span>
      {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message */}
      <TooltipAnchor tooltip={GNOMAD_POPULATION_NAMES[popmaxPopulation.toLowerCase()]}>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <TooltipHint>{popmax.toPrecision(4)}</TooltipHint>
      </TooltipAnchor>
      <FilteringAlleleFrequencyPopulation>
        {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
        {GNOMAD_POPULATION_NAMES[popmaxPopulation.toLowerCase()]}
      </FilteringAlleleFrequencyPopulation>
    </span>
  )
}

FilteringAlleleFrequency.defaultProps = {
  popmax: null,
  popmax_population: null,
}

type LowAlleleNumberWarningProps = {
  datasetId: DatasetId
  hasLowAlleleNumberInExomes: boolean
  hasLowAlleleNumberInGenomes: boolean
}

const LowAlleleNumberWarning = ({
  datasetId,
  hasLowAlleleNumberInExomes,
  hasLowAlleleNumberInGenomes,
}: LowAlleleNumberWarningProps) => {
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

type GnomadVariantOccurrenceTableProps = {
  datasetId: DatasetId
  showExomes?: boolean
  showGenomes?: boolean
  variant: Variant
}

export const GnomadVariantOccurrenceTable = ({
  datasetId,
  showExomes,
  showGenomes,
  variant,
}: GnomadVariantOccurrenceTableProps) => {
  const showTotal = showExomes && showGenomes

  const isPresentInExome = Boolean(variant.exome)
  const isPresentInGenome = Boolean(variant.genome)
  const hasJointFrequencyData = Boolean(variant.joint)

  const notCalledInExomes =
    hasJointFrequencyData && variant.joint!.filters.includes('not_called_in_exomes')
  const notCalledInGenomes =
    hasJointFrequencyData && variant.joint!.filters.includes('not_called_in_genomes')

  const exomeAlleleCount = isPresentInExome ? variant.exome!.ac : 0
  const exomeAlleleNumber = isPresentInExome ? variant.exome!.an : 0
  const genomeAlleleCount = isPresentInGenome ? variant.genome!.ac : 0
  const genomeAlleleNumber = isPresentInGenome ? variant.genome!.an : 0

  const exomeAlleleFrequency = exomeAlleleNumber === 0 ? 0 : exomeAlleleCount / exomeAlleleNumber
  const genomeAlleleFrequency =
    genomeAlleleNumber === 0 ? 0 : genomeAlleleCount / genomeAlleleNumber

  const totalAlleleCount = hasJointFrequencyData
    ? variant.joint!.ac
    : exomeAlleleCount + genomeAlleleCount
  const totalAlleleNumber = hasJointFrequencyData
    ? variant.joint!.an
    : exomeAlleleNumber + genomeAlleleNumber
  const totalAlleleFrequency = totalAlleleNumber === 0 ? 0 : totalAlleleCount / totalAlleleNumber

  const exomeHomozygoteCount = isPresentInExome ? variant.exome!.ac_hom : 0
  const genomeHomozygoteCount = isPresentInGenome ? variant.genome!.ac_hom : 0
  const totalHomozygoteCount = hasJointFrequencyData
    ? variant.joint?.homozygote_count
    : exomeHomozygoteCount + genomeHomozygoteCount

  const exomeHemizygoteCount = isPresentInExome ? variant.exome!.ac_hemi : 0
  const genomeHemizygoteCount = isPresentInGenome ? variant.genome!.ac_hemi : 0
  const totalHemizygoteCount = hasJointFrequencyData
    ? variant.joint?.hemizygote_count
    : exomeHemizygoteCount + genomeHemizygoteCount

  const exomeCoverage = {
    mean: (variant.coverage.exome || { mean: null }).mean,
    over20: (variant.coverage.exome || { over_20: null }).over_20,
  }
  const genomeCoverage = {
    mean: (variant.coverage.genome || { mean: null }).mean,
    over20: (variant.coverage.genome || { over_20: null }).over_20,
  }

  // Display a warning if a variant's AN is < 50% of the max AN for exomes/genomes.
  // Max AN is 2 * sample count, so 50% max AN is equal to sample count.
  const datasetSampleCounts = sampleCounts[datasetId]
  let exomeMaxAN
  let genomeMaxAN
  if (variant.chrom === 'X') {
    exomeMaxAN = datasetSampleCounts.exomes
      ? datasetSampleCounts.exomes.XX * 2 + datasetSampleCounts.exomes.XY
      : null
    genomeMaxAN = datasetSampleCounts.genomes
      ? datasetSampleCounts.genomes.XX * 2 + datasetSampleCounts.genomes.XY
      : null
  } else if (variant.chrom === 'Y') {
    exomeMaxAN = datasetSampleCounts.exomes ? datasetSampleCounts.exomes.XY : null
    genomeMaxAN = datasetSampleCounts.genomes ? datasetSampleCounts.genomes.XY : null
  } else {
    exomeMaxAN = datasetSampleCounts.exomesTotal * 2
    genomeMaxAN = datasetSampleCounts.genomesTotal * 2
  }

  const hasLowAlleleNumberInExomes = isPresentInExome && variant.exome!.an < exomeMaxAN / 2
  const hasLowAlleleNumberInGenomes = isPresentInGenome && variant.genome!.an < genomeMaxAN / 2

  // Display a warning if there are some high allele balance samples that may have been misinterpreted as heterozygous.
  // See https://gnomad.broadinstitute.org/help/why-are-some-variants-depleted-for-homozygotes-out-of-hardy-weinberg-equilibrium
  const exomeHighAlleleBalanceSamples =
    isPresentInExome && variant.exome!.quality_metrics.allele_balance.alt
      ? variant.exome!.quality_metrics.allele_balance.alt.bin_freq[18] +
        variant.exome!.quality_metrics.allele_balance.alt.bin_freq[19]
      : 0
  const genomeHighAlleleBalanceSamples =
    isPresentInGenome && variant.genome!.quality_metrics.allele_balance.alt
      ? variant.genome!.quality_metrics.allele_balance.alt.bin_freq[18] +
        variant.genome!.quality_metrics.allele_balance.alt.bin_freq[19]
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
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Quality control filters that this variant failed (if any)">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>
                  Filters <InfoButton topic="what-do-the-flags-on-the-browser-mean" />
                </TooltipHint>
              </TooltipAnchor>
            </th>
            {showExomes && <td>{renderGnomadVariantFlag(variant, 'exome')}</td>}
            {showGenomes && <td>{renderGnomadVariantFlag(variant, 'genome')}</td>}
            {showTotal && <td>{renderGnomadVariantFlag(variant, 'joint')}</td>}
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Alternate allele count in high quality genotypes">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Allele Count</TooltipHint>
              </TooltipAnchor>
            </th>
            {showExomes && (
              <td>
                {isPresentInExome && exomeAlleleCount}
                {notCalledInExomes && '-'}
                {hasJointFrequencyData && !isPresentInExome && !notCalledInExomes && 0}
              </td>
            )}
            {showGenomes && (
              <td>
                {isPresentInGenome && genomeAlleleCount}
                {notCalledInGenomes && '-'}
                {hasJointFrequencyData && !isPresentInGenome && !notCalledInGenomes && 0}
              </td>
            )}
            {showTotal && <td>{totalAlleleCount}</td>}
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Total number of called high quality genotypes">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Allele Number</TooltipHint>
              </TooltipAnchor>
            </th>
            {showExomes && (
              <td>
                {isPresentInExome && exomeAlleleNumber}
                {notCalledInExomes && '-'}
                {hasJointFrequencyData &&
                  !isPresentInExome &&
                  !notCalledInExomes &&
                  totalAlleleNumber - genomeAlleleNumber}
                {hasLowAlleleNumberInExomes && ' *'}
              </td>
            )}
            {showGenomes && (
              <td>
                {isPresentInGenome && genomeAlleleNumber}
                {notCalledInGenomes && '-'}
                {hasJointFrequencyData &&
                  !isPresentInGenome &&
                  !notCalledInGenomes &&
                  totalAlleleNumber - exomeAlleleNumber}
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
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Alternate allele frequency in high quality genotypes">
                {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                <TooltipHint>Allele Frequency</TooltipHint>
              </TooltipAnchor>
            </th>
            {showExomes && (
              <td>
                {isPresentInExome && exomeAlleleFrequency.toPrecision(4)}
                {notCalledInExomes && '-'}
              </td>
            )}
            {showGenomes && (
              <td>
                {isPresentInGenome && genomeAlleleFrequency.toPrecision(4)}
                {notCalledInGenomes && '-'}
              </td>
            )}
            {showTotal && <td>{totalAlleleFrequency.toPrecision(4)}</td>}
          </tr>
          <tr>
            <th scope="row">
              <NoWrap>
                Grpmax Filtering AF <InfoButton topic="faf" />
              </NoWrap>
              <br />
              (95% confidence)
            </th>
            {showExomes && (
              <td>
                {isPresentInExome && <FilteringAlleleFrequency {...variant.exome!.faf95} />}
                {notCalledInExomes && '-'}
              </td>
            )}
            {showGenomes && (
              <td>
                {isPresentInGenome && <FilteringAlleleFrequency {...variant.genome!.faf95} />}
                {notCalledInGenomes && '-'}
              </td>
            )}
            {showTotal && (
              <td>
                {hasJointFrequencyData && <FilteringAlleleFrequency {...variant.joint!.faf95} />}
              </td>
            )}
          </tr>
          {variant.chrom !== 'Y' && (
            <tr>
              <th scope="row">
                {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
                <TooltipAnchor tooltip="Number of individuals homozygous for alternate allele">
                  {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <TooltipHint>Number of homozygotes</TooltipHint>
                </TooltipAnchor>
              </th>
              {showExomes && (
                <td>
                  {isPresentInExome && exomeHomozygoteCount}
                  {notCalledInExomes && '-'}
                  {showExomeHighAlleleBalanceWarning && ' *'}
                </td>
              )}
              {showGenomes && (
                <td>
                  {isPresentInGenome && genomeHomozygoteCount}
                  {notCalledInGenomes && '-'}
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
              <th scope="row">
                {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
                <TooltipAnchor tooltip="Number of individuals hemizygous for alternate allele">
                  {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <TooltipHint>Number of hemizygotes</TooltipHint>
                </TooltipAnchor>
              </th>
              {showExomes && <td>{isPresentInExome && exomeHemizygoteCount}</td>}
              {showGenomes && <td>{isPresentInGenome && genomeHemizygoteCount}</td>}
              {showTotal && <td>{totalHemizygoteCount}</td>}
            </tr>
          )}
          {!isV4(datasetId) && (
            <tr>
              <th scope="row">
                {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
                <TooltipAnchor tooltip="Mean depth of coverage at this variant's locus">
                  {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
                  <TooltipHint>Mean depth of coverage</TooltipHint>
                </TooltipAnchor>
              </th>
              {showExomes && (
                <td>{exomeCoverage.mean !== null ? exomeCoverage.mean.toFixed(1) : '–'}</td>
              )}
              {showGenomes && (
                <td>{genomeCoverage.mean !== null ? genomeCoverage.mean.toFixed(1) : '–'}</td>
              )}
              {showTotal && <td />}
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
          <Link to="/help/why-are-some-variants-depleted-for-homozygotes-out-of-hardy-weinberg-equilibrium">
            More details.
          </Link>
        </p>
      )}
    </div>
  )
}

type histogramPropType = {
  bin_edges: number[]
  bin_freq: number[]
  n_smaller: number
  n_larger: number
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ bin_edges: Validato... Remove this comment to see the full error message
const histogramPropType: PropTypes.Requireable<histogramPropType> = PropTypes.shape({
  bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
  bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
  n_smaller: PropTypes.number.isRequired,
  n_larger: PropTypes.number.isRequired,
})

GnomadVariantOccurrenceTable.defaultProps = {
  showExomes: true,
  showGenomes: true,
}
