import React from 'react'

import {
  DatasetId,
  labelForDataset,
  referenceGenome,
  ReferenceGenome,
} from '@gnomad/dataset-metadata/metadata'
import { Section, ResponsiveSection, FlexWrapper, checkGeneLink } from '../VariantPage/VariantPage'
import { BaseQuery } from '../Query'
import DocumentTitle from '../DocumentTitle'
import { Button, Page, TooltipAnchor, ExternalLink, TooltipHint, Badge } from '@gnomad/ui'
import Delayed from '../Delayed'
import StatusMessage from '../StatusMessage'
import GnomadPageHeading from '../GnomadPageHeading'
import { TitleWrapper, Separator, VariantIdWrapper } from '../VariantPage/VariantPageTitle'
import { variantFeedbackUrl } from '../variantFeedback'
import InfoButton from '../help/InfoButton'
import TableWrapper from '../TableWrapper'
import { Table } from '../VariantPage/VariantOccurrenceTable'
// import QCFilter from '../QCFilter'
//
import sampleCounts from '@gnomad/dataset-metadata/datasets/gnomad-v4-lr/sampleCounts'
import { PopulationsTable } from '../VariantPage/PopulationsTable'
import VariantTranscriptConsequences from '../VariantPage/VariantTranscriptConsequences'
import { addPopulationNames, nestPopulations } from '../VariantPage/GnomadPopulationsTable'
import ShortTandemRepeatAlleleSizeDistributionPlot from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'

import { consolidateAlleleSizeDistributions } from '../ShortTandemRepeatPage/shortTandemRepeatHelpers'

const VariantPageTitle = ({
  variantId,
  variantType,
  datasetId,
}: {
  variantId: string
  variantType: string
  datasetId: DatasetId
}) => {
  //let variantDescription = 'Variant'
  //if (ref.length === 1 && alt.length === 1) {
  //  variantDescription = 'SNV'
  //}
  //if (ref.length < alt.length) {
  //  const insertionLength = alt.length - ref.length
  //  variantDescription = `Insertion (${insertionLength} base${insertionLength > 1 ? 's' : ''})`
  //}
  //if (ref.length > alt.length) {
  //  const deletionLength = ref.length - alt.length
  //  variantDescription = `Deletion (${deletionLength} base${deletionLength > 1 ? 's' : ''})`
  //}
  const variantDescription = variantType // TK
  return (
    <TitleWrapper>
      {variantDescription === 'SNV' ? (
        // @ts-expect-error TS(2322) -- error from gnomad-browser-toolkit component
        <TooltipAnchor tooltip="Single nucleotide variant">
          <span>{variantDescription}</span>
        </TooltipAnchor>
      ) : (
        <span>{variantDescription}</span>
      )}

      <Separator style={{ width: '1ch' }}>:</Separator>
      {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message */}
      <TooltipAnchor tooltip={variantId}>
        <VariantIdWrapper>{variantId} </VariantIdWrapper>
      </TooltipAnchor>
      <Separator> </Separator>
      <span>({referenceGenome(datasetId)})</span>
    </TitleWrapper>
  )
}

export type LongReadVariant = {
  filters: string[]
  freq: {
    all: {
      ac: number
      an: number
      af: number
    }
    populations: {
      id: string
      ac: number
      an: number
    }[]
  }
  reference_genome: ReferenceGenome
  in_silico_predictors: any[] // TK
  age_distribution: null // TK
  transcript_consequences: any[]
  enveloping_tr_id: string | null
  enveloped_ids: string[] | null
  allele_size_distribution:
    | null
    | {
        ancestry_group: string
        sex: string
        repunit: string
        distribution: {
          repunit_count: number
          frequency: number
        }
      }[]
  genotype_distribution:
    | null
    | {
        ancestry_group: string
        sex: string
        short_allele_repunit: string
        long_allele_repunit: string
        distribution: {
          short_allele_repunit_count: number
          long_allele_repunit_count: number
          frequency: number
        }
      }[]
}

type LongReadVariantPageContentProps = {
  datasetId: DatasetId
  variant: LongReadVariant
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

const LongReadVariantPageContent = ({ datasetId, variant }: LongReadVariantPageContentProps) => {
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
      {variant.allele_size_distribution && (
        <ResponsiveSection>
          {/*TK get max in there*/}
          {/* TK controls */}
          <ShortTandemRepeatAlleleSizeDistributionPlot
            maxRepeats={100}
            alleleSizeDistribution={consolidateAlleleSizeDistributions(
              variant.allele_size_distribution,
              null,
              null,
              null,
              null,
              null
            )}
            colorBy={null}
            repeatUnitLength={null}
            scaleType="linear"
          />
        </ResponsiveSection>
      )}
    </FlexWrapper>
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

const LongReadVariantPage = ({
  datasetId,
  variantId,
}: {
  datasetId: DatasetId
  variantId: string
}) => {
  const operationName = 'LongReadVariant'
  let geneId: string | null = null
  const variantQuery = `
	query ${operationName}($variantId: String!) {
	  long_read_variant(variantId: $variantId) {
	    reference_genome
	    freq {
	      all {
		ac
		an
		af
	      }
	      populations {
		id
		ac
		an
		af
	      }
	    }
	    transcript_consequences {
   	      consequence_terms
	      domains
	      gene_id
	      gene_version
	      gene_symbol
	      hgvs
	      hgvsc
	      hgvsp
	      is_canonical
	      is_mane_select
	      is_mane_select_version
	      major_consequence
	      polyphen_prediction
	      refseq_id
	      refseq_version
	      sift_prediction
	      transcript_id
	      transcript_version
	    }
            allele_size_distribution {
              ancestry_group
              sex
              repunit
              distribution {
                repunit_count
                frequency
              }
            }
            genotype_distribution{
              ancestry_group
              sex
              short_allele_repunit
              long_allele_repunit
              distribution{
                short_allele_repunit_count
                long_allele_repunit_count
                frequency
              }
            }
	  }
	}
`
  return (
    <>
      <Page>
        <DocumentTitle title={`${variantId} | ${labelForDataset(datasetId)}`} />
        <BaseQuery
          key={datasetId}
          operationName={operationName}
          query={variantQuery}
          variables={{
            variantId,
          }}
        >
          {({ data, error, graphQLErrors, loading }: any) => {
            let pageContent = null
            if (loading) {
              pageContent = (
                <Delayed>
                  <StatusMessage>Loading variant...</StatusMessage>
                </Delayed>
              )
            } else if (error) {
              pageContent = <StatusMessage>Unable to load variant</StatusMessage>
            } else if (!(data || {}).long_read_variant) {
              if (
                graphQLErrors &&
                graphQLErrors.some((err: any) => err.message === 'Variant not found')
              ) {
                // @ts-expect-error TS(2322) FIXME: Type '{ datasetId: string; variantId: string; }' i... Remove this comment to see the full error message
                pageContent = <VariantNotFound datasetId={datasetId} variantId={variantId} />
              } else {
                pageContent = (
                  <StatusMessage>
                    {graphQLErrors && graphQLErrors.length
                      ? Array.from(
                          new Set(
                            graphQLErrors
                              .filter((e: any) => !e.message.includes('ClinVar'))
                              .map((e: any) => e.message)
                          )
                        ).join(', ')
                      : 'Unable to load variant'}
                  </StatusMessage>
                )
              }
            } else {
              const variant = data.long_read_variant

              // In this branch, a variant was successfully loaded. Check the symbol
              //   and ensemble ID to create a 'Gene page' button with the correct link
              const geneData = checkGeneLink(variant.transcript_consequences)
              if (geneData) {
                geneId = geneData.ensembleId
              }

              pageContent = <LongReadVariantPageContent datasetId={datasetId} variant={variant} />
            }

            //           const datasetLinkWithLiftover: URLBuilder = (currentLocation, toDatasetId) => {
            //             const needsLiftoverDisambiguation =
            //               (isLiftoverSource(datasetId) && isLiftoverTarget(toDatasetId)) ||
            //               (isLiftoverSource(toDatasetId) && isLiftoverTarget(datasetId))
            //
            //             return needsLiftoverDisambiguation
            //               ? {
            //                   ...currentLocation,
            //                   pathname: `/variant/liftover/${variantId}/${datasetId}/${toDatasetId}`,
            //                   search: '',
            //                 }
            //               : {
            //                   ...currentLocation,
            //                   pathname: `/variant/${variantId}`,
            //                   search: `?dataset=${toDatasetId}`,
            //                 }
            //           }

            return (
              <React.Fragment>
                <GnomadPageHeading
                  datasetOptions={{
                    includeExac: false,
                    // Include gnomAD versions based on the same reference genome as the current dataset
                    includeGnomad2: false,
                    includeGnomad3: false,
                    includeGnomad4Subsets: false,
                    includeStructuralVariants: false,
                    includeCopyNumberVariants: false,
                    //                    urlBuilder: datasetLinkWithLiftover,
                  }}
                  selectedDataset={datasetId}
                  extra={
                    <>
                      {navigator.clipboard && navigator.clipboard.writeText && (
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(variantId)
                          }}
                          style={{ margin: '0 0 0 1em' }}
                        >
                          Copy variant ID
                        </Button>
                      )}

                      {geneId && (
                        <Button
                          onClick={() => {
                            location.href = `/gene/${geneId}?dataset=${datasetId}`
                          }}
                          style={{ margin: '0 1em 0 1em' }}
                        >
                          Gene page
                        </Button>
                      )}
                    </>
                  }
                >
                  <VariantPageTitle
                    variantId={variantId}
                    datasetId={datasetId}
                    variantType="Variant"
                  />{' '}
                  {
                    //TK: variantType
                  }
                </GnomadPageHeading>
                {pageContent}
              </React.Fragment>
            )
          }}
        </BaseQuery>
      </Page>
    </>
  )
}

export default LongReadVariantPage
