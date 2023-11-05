import { Factory } from 'fishery'
import { GeneMetadata } from '../GenePage/GenePage'

const geneMetadataFactory = Factory.define<GeneMetadata>(() => ({
  gene_id: 'dummy_gene',
  gene_version: '5.6.7.8',
  symbol: 'FAKEGENE',
  canonical_transcript_id: 'some-transcript',
  flags: [],
}))

export default geneMetadataFactory
