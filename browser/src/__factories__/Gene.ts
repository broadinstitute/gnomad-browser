import { Factory } from 'fishery'
import { Gene, GeneMetadata } from '../GenePage/GenePage'
import { Transcript } from '../TranscriptPage/TranscriptPage'
import transcriptFactory from './Transcript'
import {
  HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory,
  HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory,
} from './VariantCooccurrenceCountsPerSeverityAndAf'

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
  } = params

  const heterozygous_variant_cooccurrence_counts =
    associations.heterozygous_variant_cooccurrence_counts ||
    HeterozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
  const homozygous_variant_cooccurrence_counts =
    associations.homozygous_variant_cooccurrence_counts ||
    HomozygousVariantCooccurrenceCountsPerSeverityAndAfFactory.build()
  const metadata: GeneMetadata = { gene_id, gene_version, symbol, canonical_transcript_id, flags }

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
  }
})

export default geneFactory
