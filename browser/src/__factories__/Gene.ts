import { Factory } from 'fishery'
import { Gene, GeneMetadata } from '../GenePage/GenePage'
import { Transcript, Exon } from '../TranscriptPage/TranscriptPage'
import transcriptFactory from './Transcript'
import {
  HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory,
  HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory,
} from './VariantCooccurrenceCountsPerSeverityAndAf'
import { pextFactory } from './TissueExpression'

export const exonFactory = Factory.define<Exon>(({ params }) => {
  const { feature_type = 'CDS', start = 100, stop = 200 } = params
  return { feature_type, start, stop }
})

const geneFactory = Factory.define<Gene>(({ params, associations }) => {
  const {
    gene_id = 'dummy_gene-1',
    gene_version = '5.6.7.8',
    symbol = 'FAKEGENE',
    canonical_transcript_id = 'transcript-999',
    flags = [],
    reference_genome = 'GRCh37',
    chrom = '13',
    strand = '+',
    start = 123,
    stop = 321,
    variants = [],
    structural_variants = [],
    clinvar_variants = [],
    copy_number_variants = [],
    name = null,
  } = params

  const {
    mane_select_transcript = null,
    gnomad_constraint = null,
    exac_constraint = null,
    pext = pextFactory.build(),
    short_tandem_repeats = null,
    exac_regional_missense_constraint_regions = null,
    gnomad_v2_regional_missense_constraint = null,
    mitochondrial_constraint = null,
    mitochondrial_missense_constraint_regions = null,
  } = associations

  const heterozygous_variant_cooccurrence_counts =
    associations.heterozygous_variant_cooccurrence_counts ||
    HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
  const homozygous_variant_cooccurrence_counts =
    associations.homozygous_variant_cooccurrence_counts ||
    HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()

  const metadata: GeneMetadata = {
    gene_id,
    gene_version,
    symbol,
    reference_genome,
    canonical_transcript_id,
    flags,
    mane_select_transcript,
  }

  const transcripts: Transcript[] =
    canonical_transcript_id !== null
      ? [
          transcriptFactory.build(
            {
              transcript_id: canonical_transcript_id,
              reference_genome,
              chrom,
              strand,
              start,
              stop,
            },
            { transient: metadata }
          ),
        ]
      : []

  return {
    gene_id,
    gene_version,
    canonical_transcript_id,
    symbol,
    flags,
    reference_genome,
    chrom,
    strand,
    start,
    stop,
    transcripts,
    exons: [],
    heterozygous_variant_cooccurrence_counts,
    homozygous_variant_cooccurrence_counts,
    variants,
    structural_variants,
    clinvar_variants,
    copy_number_variants,
    mane_select_transcript,
    name,
    gnomad_constraint,
    exac_constraint,
    pext,
    short_tandem_repeats,
    exac_regional_missense_constraint_regions,
    gnomad_v2_regional_missense_constraint,
    mitochondrial_constraint,
    mitochondrial_missense_constraint_regions,
  }
})

export default geneFactory
