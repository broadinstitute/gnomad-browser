import { Factory } from 'fishery'
import { GeneMetadata } from '../GenePage/GenePage'
import { Transcript } from '../TranscriptPage/TranscriptPage'
import geneMetadataFactory from './GeneMetadata'

const transcriptFactory = Factory.define<Transcript>(({ params, associations }) => {
  const {
    transcript_id = 'dummy_transcript',
    transcript_version = '12.34.5',
    reference_genome = 'GRCh37',
    chrom = '13',
    strand = '+',
    start = 123,
    stop = 321,
  } = params

  const { exons = [], gene = geneMetadataFactory.build() } = associations

  return {
    transcript_id,
    transcript_version,
    reference_genome,
    chrom,
    strand,
    start,
    stop,
    exons,
    gene,
  }
})

export default transcriptFactory
