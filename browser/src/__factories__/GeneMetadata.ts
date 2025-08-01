import { Factory } from 'fishery'
import { GeneMetadata } from '../GenePage/GenePage'

const geneMetadataFactory = Factory.define<GeneMetadata>(() => ({
  gene_id: 'dummy_gene',
  gene_version: '5.6.7.8',
  symbol: 'FAKEGENE',
  reference_genome: 'GRCh38',
  canonical_transcript_id: 'some-transcript',
  flags: [],
  mane_select_transcript: null,
}))

export default geneMetadataFactory
