import React from 'react'

import {
  DatasetId,
  referenceGenome,
  hasShortTandemRepeats,
} from '@gnomad/dataset-metadata/metadata'
import Delayed from '../Delayed'
import DocumentTitle from '../DocumentTitle'
import { BaseQuery } from '../Query'
import StatusMessage from '../StatusMessage'

import GeneNotFound from './GeneNotFound'
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

const operationName = 'Gene'

const query = `
query ${operationName}($geneId: String, $geneSymbol: String, $referenceGenome: ReferenceGenomeId!, $shortTandemRepeatDatasetId: DatasetId!, $includeShortTandemRepeats: Boolean!) {
  gene(gene_id: $geneId, gene_symbol: $geneSymbol, reference_genome: $referenceGenome) {
    reference_genome
    gene_id
    gene_version
    symbol
    gencode_symbol
    name
    canonical_transcript_id
    mane_select_transcript {
      ensembl_id
      ensembl_version
      refseq_id
      refseq_version
    }
    hgnc_id
    ncbi_id
    omim_id
    chrom
    start
    stop
    strand
    exons {
      feature_type
      start
      stop
    }
    flags
    gnomad_constraint {
      exp_lof
      exp_mis
      exp_syn
      obs_lof
      obs_mis
      obs_syn
      oe_lof
      oe_lof_lower
      oe_lof_upper
      oe_mis
      oe_mis_lower
      oe_mis_upper
      oe_syn
      oe_syn_lower
      oe_syn_upper
      lof_z
      mis_z
      syn_z
      pLI
      flags
    }
    exac_constraint {
      exp_syn
      obs_syn
      syn_z
      exp_mis
      obs_mis
      mis_z
      exp_lof
      obs_lof
      lof_z
      pLI
    }
    transcripts {
      transcript_id
      transcript_version
      strand
      exons {
        feature_type
        start
        stop
      }
      gtex_tissue_expression {
        tissue
        value
      }
    }
    pext {
      regions {
        start
        stop
        mean
        tissues {
          tissue
          value
        }
      }
      flags
    }
    exac_regional_missense_constraint_regions {
      start
      stop
      obs_mis
      exp_mis
      obs_exp
      chisq_diff_null
    }
    gnomad_v2_regional_missense_constraint {
      passed_qc
      has_no_rmc_evidence
      regions {
        chrom
        start
        stop
        aa_start
        aa_stop
        obs_mis
        exp_mis
        obs_exp
        chisq_diff_null
        p_value
      }
    }
    short_tandem_repeats(dataset: $shortTandemRepeatDatasetId) @include(if: $includeShortTandemRepeats) {
      id
    }
    heterozygous_variant_cooccurrence_counts {
      csq
      af_cutoff
      data {
        two_het_total
	in_cis
	in_trans
	unphased
      }
    }
    homozygous_variant_cooccurrence_counts {
      csq
      af_cutoff
      data {
	hom_total
      }
    }
  }
}
`

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
  const variables = {
    [geneIdOrSymbol.startsWith('ENSG') ? 'geneId' : 'geneSymbol']: geneIdOrSymbol,
    referenceGenome: referenceGenome(datasetId),
    shortTandemRepeatDatasetId: 'gnomad_r3',
    includeShortTandemRepeats: hasShortTandemRepeats(datasetId),
  }

  return (
    <BaseQuery operationName={operationName} query={query} variables={variables}>
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
