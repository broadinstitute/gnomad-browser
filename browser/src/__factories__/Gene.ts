import { Factory } from 'fishery'
import { Gene, GeneMetadata, Transcript } from '../types'
import transcriptFactory from './Transcript'

const geneFactory = Factory.define<Gene>(({ params }) => {
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
  } = params

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
  }
})

export default geneFactory
