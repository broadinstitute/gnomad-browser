import React from 'react'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import Delayed from '../Delayed'
import DocumentTitle from '../DocumentTitle'
import { BaseQuery } from '../Query'
import StatusMessage from '../StatusMessage'

import GeneNotFound from './GeneNotFound'
import { buildGeneVariables, geneOperationName, geneQuery } from './genePageQueries'
import GenePage, { Gene } from './GenePage'
import {
  HeterozygousVariantCooccurrenceSeverity,
  HeterozygousVariantCooccurrenceAfCutoff,
  HeterozygousVariantCooccurrenceCountsPerSeverityAndAf,
  HeterozygousCountCellSchema,
  HomozygousVariantCooccurrenceSeverity,
  HomozygousVariantCooccurrenceAfCutoff,
  HomozygousVariantCooccurrenceCountsPerSeverityAndAf,
  HomozygousCountCellSchema,
} from './VariantCooccurrenceCountsTable'

type Props = {
  datasetId: DatasetId
  geneIdOrSymbol: string
}

interface UnrolledVariantCooccurrenceCounts {
  heterozygous_variant_cooccurrence_counts: {
    csq: HeterozygousVariantCooccurrenceSeverity
    af_cutoff: HeterozygousVariantCooccurrenceAfCutoff
    data: HeterozygousCountCellSchema
  }[]
  homozygous_variant_cooccurrence_counts: {
    csq: HomozygousVariantCooccurrenceSeverity
    af_cutoff: HomozygousVariantCooccurrenceAfCutoff
    data: HomozygousCountCellSchema
  }[]
}

type RolledUpVariantCooccurrenceCounts = {
  heterozygous_variant_cooccurrence_counts: HeterozygousVariantCooccurrenceCountsPerSeverityAndAf
  homozygous_variant_cooccurrence_counts: HomozygousVariantCooccurrenceCountsPerSeverityAndAf
}

const rollUpVariantCooccurrenceCounts = (
  unrolledGene: UnrolledVariantCooccurrenceCounts
): RolledUpVariantCooccurrenceCounts => {
  const heterozygous_variant_cooccurrence_counts: HeterozygousVariantCooccurrenceCountsPerSeverityAndAf =
    {}
  const homozygous_variant_cooccurrence_counts: HomozygousVariantCooccurrenceCountsPerSeverityAndAf =
    {}

  unrolledGene.heterozygous_variant_cooccurrence_counts.forEach((unrolledGeneCount) => {
    const severity = unrolledGeneCount.csq
    const afCutoff = unrolledGeneCount.af_cutoff
    const data = unrolledGeneCount.data

    heterozygous_variant_cooccurrence_counts[severity] =
      heterozygous_variant_cooccurrence_counts[severity] || {}
    heterozygous_variant_cooccurrence_counts[severity]![afCutoff] = data
  })

  unrolledGene.homozygous_variant_cooccurrence_counts.forEach((unrolledGeneCount) => {
    const severity = unrolledGeneCount.csq
    const afCutoff = unrolledGeneCount.af_cutoff
    const data = unrolledGeneCount.data

    homozygous_variant_cooccurrence_counts[severity] =
      homozygous_variant_cooccurrence_counts[severity] || {}
    homozygous_variant_cooccurrence_counts[severity]![afCutoff] = data
  })

  return { heterozygous_variant_cooccurrence_counts, homozygous_variant_cooccurrence_counts }
}

const GenePageContainer = ({ datasetId, geneIdOrSymbol }: Props) => {
  return (
    <BaseQuery
      operationName={geneOperationName}
      query={geneQuery}
      variables={buildGeneVariables(datasetId, geneIdOrSymbol)}
    >
      {({ data, error, graphQLErrors, loading }: any) => {
        if (loading) {
          return (
            <Delayed>
              <StatusMessage>Loading gene</StatusMessage>
            </Delayed>
          )
        }

        if (error) {
          return <StatusMessage>Unable to load gene</StatusMessage>
        }

        if (!data || !data.gene) {
          if (graphQLErrors && graphQLErrors.some((e: any) => e.message === 'Gene not found')) {
            return (
              <>
                <DocumentTitle title="Not found" />
                <GeneNotFound geneIdOrSymbol={geneIdOrSymbol} datasetId={datasetId} />
              </>
            )
          }

          return (
            <StatusMessage>
              {graphQLErrors && graphQLErrors.length
                ? Array.from(new Set(graphQLErrors.map((e: any) => e.message))).join(', ')
                : 'Unable to load gene'}
            </StatusMessage>
          )
        }

        const rolledUpCounts = rollUpVariantCooccurrenceCounts(data.gene)
        const gene: Gene = { ...data.gene, ...rolledUpCounts }
        return <GenePage datasetId={datasetId} gene={gene} geneId={data.gene.gene_id} />
      }}
    </BaseQuery>
  )
}

export default GenePageContainer
