import { Factory } from 'fishery'
import { GeneMetadata, Transcript } from '../types'
import geneMetadataFactory from './GeneMetadata'

const transcriptFactory = Factory.define<Transcript, GeneMetadata>(({ transientParams }) => ({
  transcript_id: 'dummy_transcript',
  transcript_version: '12.34.5',
  reference_genome: 'GRCh37',
  chrom: '13',
  strand: '+',
  start: 123,
  stop: 321,
  exons: [],
  gene: geneMetadataFactory.build(transientParams),
}))

export default transcriptFactory
