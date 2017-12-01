import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql'

import {
  createGraphQLObjectWithElasticCursor,
  elasticToGraphQLObject,
  getPathFromSchemaConfig,
  getPopulationPath,
  applyCustomTypes,
  transformCamelCase,
  transformSnakeCase,
} from './elasticToGraphQL'

import elasticMappings from '../../elastic-mappings/mappings.json'

const gnomadPopDict = {
  NFE: 'europeanNonFinnish',
  EAS: 'eastAsian',
  OTH: 'other',
  AFR: 'african',
  AMR: 'latino',
  SAS: 'southAsian',
  FIN: 'europeanFinnish',
  ASJ: 'ashkenaziJewish',
}

const gnomadPopDataFields = ['AC', 'AN', 'Hom', 'Hemi', 'AF']

const gnomadSchemaConfig = {
  variantId: 'variantId',
  // filters: 'filters',
  // MQRankSum: 'quality_metrics.MQRankSum',
  AC: 'totalCounts.AC',
  AN: 'totalCounts.AN',
  AF: 'totalCounts.AF',
  Hom: 'totalCounts.Hom',
  Hemi: 'totalCounts.Hemi',

  AC_Male: 'sex.AC_Male',
  AC_Female: 'sex.AC_Female',
  AN_Male: 'sex.AN_Male',
  AN_Female: 'sex.AN_Female',
  AF_Male: 'sex.AF_Male',
  AF_Female: 'sex.AF_Female',
  Hom_Male: 'sex.Hom_Male',
  Hom_Female: 'sex.Hom_Female',

  POPMAX: 'popmax.POPMAX',
  AC_POPMAX: 'popmax.AC_POPMAX',
  AN_POPMAX: 'popmax.AN_POPMAX',
  AF_POPMAX: 'popmax.AF_POPMAX',

  MPC: 'mpc.MPC',
  fitted_score: 'mpc.fitted_score',
  mis_badness: 'mpc.mis_badness',
  obs_exp: 'mpc.obs_exp',

  lcr: 'flags.lcr',
  segdup: 'flags.segdup',

  consequence: 'consequence',

  FS: 'qualityMetrics.FS',
  MQRankSum: 'qualityMetrics.MQRankSum',
  InbreedingCoeff: 'qualityMetrics.InbreedingCoeff',
  VQSLOD: 'qualityMetrics.VQSLOD',
  BaseQRankSum: 'qualityMetrics.BaseQRankSum',
  MQ: 'qualityMetrics.MQ',
  ClippingRankSum: 'qualityMetrics.ClippingRankSum',
  ReadPosRankSum: 'qualityMetrics.ReadPosRankSum',
  DP: 'qualityMetrics.DP',
  QD: 'qualityMetrics.QD',
  AS_RF: 'qualityMetrics.AS_RF',
  DREF_MEDIAN: 'qualityMetrics.DREF_MEDIAN',
  DP_MEDIAN: 'qualityMetrics.DP_MEDIAN',
  GQ_MEDIAN: 'qualityMetrics.GQ_MEDIAN',
  AB_MEDIAN: 'qualityMetrics.AB_MEDIAN',
  GQ_HIST_ALT: 'qualityMetrics.GQ_HIST_ALT',
  DP_HIST_ALT: 'qualityMetrics.DP_HIST_ALT',
  AB_HIST_ALT: 'qualityMetrics.AB_HIST_ALT',
  GQ_HIST_ALL: 'qualityMetrics.GQ_HIST_ALL',
  DP_HIST_ALL: 'qualityMetrics.DP_HIST_ALL',
  AB_HIST_ALL: 'qualityMetrics.AB_HIST_ALL',

  aminoAcids: 'mainTranscript.aminoAcids',
  biotype: 'mainTranscript.biotype',
  canonical: 'mainTranscript.canonical',
  cdnaStart: 'mainTranscript.cdnaStart',
  cdnaEnd: 'mainTranscript.cdnaEnd',
  codons: 'mainTranscript.codons',
  distance: 'mainTranscript.distance',
  domains: 'mainTranscript.domains',
  exon: 'mainTranscript.exon',
  geneId: 'mainTranscript.geneId',
  geneSymbol: 'mainTranscript.geneSymbol',
  geneSymbolSource: 'mainTranscript.geneSymbolSource',
  hgncId: 'mainTranscript.hgncId',
  hgvsc: 'mainTranscript.hgvsc',
  hgvsp: 'mainTranscript.hgvsp',
  lof: 'mainTranscript.lof',
  lofFlags: 'mainTranscript.lofFlags',
  lofFilter: 'mainTranscript.lofFilter',
  lofInfo: 'mainTranscript.lofInfo',
  proteinId: 'mainTranscript.proteinId',
  transcriptId: 'mainTranscript.transcriptId',

  hgvs: 'mainTranscript.hgvs',
  majorConsequence: 'mainTranscript.majorConsequence',
  majorConsequenceRank: 'mainTranscript.majorConsequenceRank',
  category: 'mainTranscript.category',
  sortedTranscriptConsequences: 'sortedTranscriptConsequences',
}

const TranscriptConsequences = new GraphQLObjectType({
  name: 'TranscriptConsequences',
  fields: () => ({
    amino_acids: { type: GraphQLString },
    biotype: { type: GraphQLString },
    canonical: { type: GraphQLInt },
    cdna_start: { type: GraphQLInt },
    cdna_end: { type: GraphQLInt },
    codons: { type: GraphQLString },
    consequence_terms: { type: new GraphQLList(GraphQLString) },
    distance: { type: GraphQLInt },
    exon: { type: GraphQLString },
    gene_id: { type: GraphQLString },
    gene_symbol: { type: GraphQLString },
    gene_symbol_source: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    lof: { type: GraphQLString },
    lof_flags: { type: GraphQLString },
    lof_filter: { type: GraphQLString },
    lof_info: { type: GraphQLString },
    protein_id: { type: GraphQLString },
    transcript_id: { type: GraphQLString },
    hgnc_id: { type: GraphQLInt },
    domains: { type: GraphQLString },
    hgvs: { type: GraphQLString },
    major_consequence: { type: GraphQLString },
    major_consequence_rank: { type: GraphQLInt },
    category: { type: GraphQLString },
  })
})

const sortedTranscriptConsequences = {
  name: 'sortedTranscriptConsequences',
  args: {
    transcriptId: { type: GraphQLString },
  },
  resolve: (obj, args) => {
    const transcriptConsequences = JSON.parse(obj.sortedTranscriptConsequences)
    if (args.transcriptId) {
      return transcriptConsequences.filter(transcript =>
        transcript.transcript_id === args.transcriptId)
    }
    return transcriptConsequences
  },
  type: new GraphQLList(TranscriptConsequences),
}

const gnomadPathMappers = [
  getPathFromSchemaConfig(gnomadSchemaConfig),
  getPopulationPath(gnomadPopDict, gnomadPopDataFields),
  // getPathByGroup('quality_metrics', qualityMetricFields),
  // transformSnakeCase,
]

export const variants = createGraphQLObjectWithElasticCursor({
  name: 'GnomadVariants',
  description: 'gnomAD variants',
  fieldName: 'variants',
  listItemObjectName: 'GnomadVariant',
  elasticMappings,
  customTypes: {
    sortedTranscriptConsequences,
  },
  pathMappers: gnomadPathMappers,
  elasticIndex: 'gnomad_exomes',
  elasticType: 'variant',
})
