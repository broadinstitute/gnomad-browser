import React from 'react'

import {
  DatasetId,
  labelForDataset,
  referenceGenome,
  ReferenceGenome,
} from '@gnomad/dataset-metadata/metadata'
import { checkGeneLink } from '../VariantPage/VariantPage'
import { BaseQuery } from '../Query'
import DocumentTitle from '../DocumentTitle'
import { Button, Page, TooltipAnchor } from '@gnomad/ui'
import Delayed from '../Delayed'
import StatusMessage from '../StatusMessage'
import GnomadPageHeading from '../GnomadPageHeading'
import { TitleWrapper, Separator, VariantIdWrapper } from '../VariantPage/VariantPageTitle'
import { AlleleSizeDistributionCohort } from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import LongReadVariantPageContent from './LongReadVariantPageContent'

const ALLELE_TYPE_LABELS: Record<string, string> = {
  snv: 'SNV',
  ins: 'Insertion',
  del: 'Deletion',
  trv: 'Tandem Repeat',
  alu_ins: 'Alu Insertion',
  line1_ins: 'LINE-1 Insertion',
  sva_ins: 'SVA Insertion',
}

const VariantPageTitle = ({
  variantId,
  variantType,
  datasetId,
}: {
  variantId: string
  variantType: string
  datasetId: DatasetId
}) => {
  const variantDescription = ALLELE_TYPE_LABELS[variantType] || variantType
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
  variant_id: string
  chrom: string
  pos: number
  end: number | null
  length: number | null
  ref: string
  alt: string
  filters: string[]
  allele_type: string
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
      af: number
    }[]
  }
  reference_genome: ReferenceGenome
  transcript_consequences: any[]
  short_read_match_id: string | null
  enveloping_tr_id: string | null
  enveloped_ids: string[] | null
  motifs: string[] | null
  allele_size_distribution: null | AlleleSizeDistributionCohort[]
  max_repunits: number | null
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
  main_reference_region: null | {
    reference_genome: string
    chrom: string
    start: number
    stop: number
  }
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
  let variantAlleleType: string = 'Variant'
  const variantQuery = `
	query ${operationName}($variantId: String!) {
	  long_read_variant(variantId: $variantId) {
	    variant_id
	    chrom
	    pos
	    end
	    length
	    ref
	    alt
	    allele_type
	    filters
	    reference_genome
	    short_read_match_id
	    enveloping_tr_id
	    enveloped_ids
	    motifs
	    genes {
	      ensembl_id
	      symbol
	    }
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
	    max_repunits
	    genotype_distribution {
	      ancestry_group
	      sex
	      short_allele_repunit
	      long_allele_repunit
	      distribution {
		short_allele_repunit_count
		long_allele_repunit_count
		frequency
	      }
	    }
	    main_reference_region {
	      reference_genome
	      chrom
	      start
	      stop
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
              variantAlleleType = variant.allele_type || 'Variant'

              const geneData = checkGeneLink(variant.transcript_consequences)
              if (geneData) {
                geneId = geneData.ensembleId
              }

              pageContent = (
                <LongReadVariantPageContent datasetId={datasetId} variant={variant} />
              )
            }

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
                    variantType={variantAlleleType}
                  />
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
