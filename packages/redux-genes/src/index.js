export {
  types,
  actions,
  default as createGeneReducer,
  byGeneName,
  allGeneNames,
  isFetching,
  geneNotFound,
  hasGeneData,
  geneData,
  currentGene,
  currentTissue,
  currentTranscript,
  canonicalTranscript,
  transcriptFanOut,
  currentExon,
  exonPadding,
  transcripts,
  canonicalExons,
  transcriptsGrouped,
  tissueStats,
  regionalConstraint,
} from './genes'

export {
  default as GenePageHoc
} from './GenePageHoc'
