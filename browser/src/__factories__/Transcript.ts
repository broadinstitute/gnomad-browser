import { Factory } from 'fishery'
import { Transcript } from '../TranscriptPage/TranscriptPage'
import geneMetadataFactory from './GeneMetadata'
import { gtexTissueExpressionFactory } from './TissueExpression'

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

  const {
    exons = [],
    gene = geneMetadataFactory.build(),
    gtex_tissue_expression = gtexTissueExpressionFactory.build(),
    gnomad_constraint = null,
    exac_constraint = null,
    variants = [],
    clinvar_variants = [],
    mitochondrial_variants = [],
  } = associations

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
    gtex_tissue_expression,
    gnomad_constraint,
    exac_constraint,
    variants,
    mitochondrial_variants,
    clinvar_variants,
  }
})

export default transcriptFactory
