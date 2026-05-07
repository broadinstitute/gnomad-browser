import React from 'react'

import { Section, ResponsiveSection, FlexWrapper } from '../VariantPage/VariantPage'
import { ExternalLink, TooltipHint, TooltipAnchor, Badge } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

import { LongReadVariant } from './LongReadVariantPage'
import TableWrapper from '../TableWrapper'
import sampleCounts from '@gnomad/dataset-metadata/datasets/gnomad-v4-lr/sampleCounts'
import { variantFeedbackUrl } from '../variantFeedback'
import { Table } from '../VariantPage/VariantOccurrenceTable'
import InfoButton from '../help/InfoButton'
import { PopulationsTable } from '../VariantPage/PopulationsTable'
import VariantTranscriptConsequences from '../VariantPage/VariantTranscriptConsequences'
import { addPopulationNames, nestPopulations } from '../VariantPage/GnomadPopulationsTable'

type Props = {
  datasetId: DatasetId
  variant: LongReadVariant
}

const LongReadVariantPageContent = ({ datasetId, variant }: Props) => {
  return (
    <FlexWrapper>
      <ResponsiveSection>
        <TableWrapper>
          <LongReadVariantOccurrenceTable variant={variant} />
        </TableWrapper>
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>Feedback</h2>
        <ExternalLink href={variantFeedbackUrl(variant, datasetId)}>
          Report an issue with this variant
        </ExternalLink>
      </ResponsiveSection>

      <Section>
        <h2>
          Genetic Ancestry Group Frequencies <InfoButton topic="ancestry" />
        </h2>
        <LongReadVariantPopulationFrequencies variant={variant} />
      </Section>

      <Section>
        <h2>Related Variants</h2>
        <LongReadVariantRelatedVariants datasetId={datasetId} variant={variant} />
      </Section>

      <Section>
        <h2>Ensembl Variant Effect Predictor</h2>
        <VariantTranscriptConsequences variant={variant} />
      </Section>

      <FlexWrapper>
        {variant.in_silico_predictors && variant.in_silico_predictors.length && (
          <ResponsiveSection>
            <h2>In Silico Predictors</h2>
            <LongReadVariantInSilicoPredictors variant={variant} datasetId={datasetId} />
          </ResponsiveSection>
        )}
      </FlexWrapper>

      <FlexWrapper>
        <ResponsiveSection>
          {variant.age_distribution && (
            <React.Fragment>
              <h2>
                Age Distribution <InfoButton topic="age" />
              </h2>

              <LongReadVariantAgeDistribution datasetId={datasetId} variant={variant} />
            </React.Fragment>
          )}
        </ResponsiveSection>
      </FlexWrapper>

      <ResponsiveSection>
        <h2>Genotype Quality Metrics</h2>
        <LongReadVariantGenotypeQualityMetrics datasetId={datasetId} variant={variant} />
      </ResponsiveSection>
      <ResponsiveSection>
        <h2>Site Quality Metrics</h2>
        <LongReadVariantSiteQualityMetrics datasetId={datasetId} variant={variant} />
      </ResponsiveSection>
    </FlexWrapper>
  )
}

const LongReadVariantOccurrenceTable = ({ variant }: { variant: LongReadVariant }) => {
  const hasLowAlleleNumber = variant.freq.all.an < sampleCounts.total / 2
  return (
    <div>
      <Table>
        <tbody>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Quality control filters that this variant failed (if any)">
                <TooltipHint>
                  Filters <InfoButton topic="what-do-the-flags-on-the-browser-mean" />
                </TooltipHint>
              </TooltipAnchor>
            </th>
            <td>
              <LongReadVariantFlag variant={variant} />
            </td>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Alternate allele count in high quality genotypes">
                <TooltipHint>Allele Count</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>{variant.freq.all.ac}</td>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Total number of called high quality genotypes">
                <TooltipHint>Allele Number</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>{variant.freq.all.an}</td>
          </tr>
          <tr>
            <th scope="row">
              {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
              <TooltipAnchor tooltip="Alternate allele frequency in high quality genotypes">
                <TooltipHint>Allele Frequency</TooltipHint>
              </TooltipAnchor>
            </th>
            <td>{variant.freq.all.af.toPrecision(4)}</td>
          </tr>
        </tbody>
      </Table>
      {hasLowAlleleNumber && (
        <p>
          <Badge level="error">Warning</Badge> This variant is covered in fewer than 50% of
          individuals. This may indicate a low-quality site.
        </p>
      )}
    </div>
  )
}

const LongReadVariantPopulationFrequencies = ({ variant }: { variant: LongReadVariant }) => {
  return (
    <TableWrapper>
      <PopulationsTable
        populations={nestPopulations(addPopulationNames(variant.freq.populations))}
      />
    </TableWrapper>
  )
}

const LongReadVariantRelatedVariants = ({
  datasetId,
  variant,
}: {
  datasetId: DatasetId
  variant: LongReadVariant
}) => {
  // TK
  return null
}

const LongReadVariantInSilicoPredictors = ({
  variant,
  datasetId,
}: {
  datasetId: DatasetId
  variant: LongReadVariant
}) => {
  // TK
  return null
}

const LongReadVariantAgeDistribution = ({
  datasetId,
  variant,
}: {
  datasetId: DatasetId
  variant: LongReadVariant
}) => {
  //TK
  return null
}
const LongReadVariantGenotypeQualityMetrics = ({
  datasetId,
  variant,
}: {
  datasetId: DatasetId
  variant: LongReadVariant
}) => {
  //TK
  return null
}

const LongReadVariantSiteQualityMetrics = ({
  datasetId,
  variant,
}: {
  datasetId: DatasetId
  variant: LongReadVariant
}) => {
  //TK
  return null
}

const LongReadVariantFlag = ({ variant }: { variant: LongReadVariant }) => {
  const filters = variant.filters || [] // TK
  if (filters.length === 0) {
    return <Badge level="success">Pass</Badge>
  }

  return filters.map((_filter: any) => {
    return null
    /*   const data =
      filter === 'discrepant_frequencies'
        ? {
            pValue: variant.joint!.freq_comparison_stats.stat_union.p_value,
            testName: variant.joint!.freq_comparison_stats.stat_union.stat_test_name,
            geneticAncestry:
              variant.joint!.freq_comparison_stats.stat_union.gen_ancs[0] || undefined,
          }
        : {}*/

    {
      //<QCFilter key="TK" filter="TK" data={{}} />
    }
  })
}

export default LongReadVariantPageContent
