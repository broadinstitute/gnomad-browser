import { GraphQLFloat, GraphQLObjectType, GraphQLString } from 'graphql'

export const GtexTissueExpressionsType = new GraphQLObjectType({
  name: 'GtexTissueExpressions',
  fields: {
    adiposeSubcutaneous: { type: GraphQLFloat },
    adiposeVisceralOmentum: { type: GraphQLFloat },
    adrenalGland: { type: GraphQLFloat },
    arteryAorta: { type: GraphQLFloat },
    arteryCoronary: { type: GraphQLFloat },
    arteryTibial: { type: GraphQLFloat },
    bladder: { type: GraphQLFloat },
    brainAmygdala: { type: GraphQLFloat },
    brainAnteriorcingulatecortexBa24: { type: GraphQLFloat },
    brainCaudateBasalganglia: { type: GraphQLFloat },
    brainCerebellarhemisphere: { type: GraphQLFloat },
    brainCerebellum: { type: GraphQLFloat },
    brainCortex: { type: GraphQLFloat },
    brainFrontalcortexBa9: { type: GraphQLFloat },
    brainHippocampus: { type: GraphQLFloat },
    brainHypothalamus: { type: GraphQLFloat },
    brainNucleusaccumbensBasalganglia: { type: GraphQLFloat },
    brainPutamenBasalganglia: { type: GraphQLFloat },
    brainSpinalcordCervicalc1: { type: GraphQLFloat },
    brainSubstantianigra: { type: GraphQLFloat },
    breastMammarytissue: { type: GraphQLFloat },
    cellsEbvTransformedlymphocytes: { type: GraphQLFloat },
    cellsTransformedfibroblasts: { type: GraphQLFloat },
    cervixEctocervix: { type: GraphQLFloat },
    cervixEndocervix: { type: GraphQLFloat },
    colonSigmoid: { type: GraphQLFloat },
    colonTransverse: { type: GraphQLFloat },
    esophagusGastroesophagealjunction: { type: GraphQLFloat },
    esophagusMucosa: { type: GraphQLFloat },
    esophagusMuscularis: { type: GraphQLFloat },
    fallopianTube: { type: GraphQLFloat },
    heartAtrialappendage: { type: GraphQLFloat },
    heartLeftventricle: { type: GraphQLFloat },
    kidneyCortex: { type: GraphQLFloat },
    liver: { type: GraphQLFloat },
    lung: { type: GraphQLFloat },
    minorSalivaryGland: { type: GraphQLFloat },
    muscleSkeletal: { type: GraphQLFloat },
    nerveTibial: { type: GraphQLFloat },
    ovary: { type: GraphQLFloat },
    pancreas: { type: GraphQLFloat },
    pituitary: { type: GraphQLFloat },
    prostate: { type: GraphQLFloat },
    skinNotsunexposedSuprapubic: { type: GraphQLFloat },
    skinSunexposedLowerleg: { type: GraphQLFloat },
    smallIntestineTerminalileum: { type: GraphQLFloat },
    spleen: { type: GraphQLFloat },
    stomach: { type: GraphQLFloat },
    testis: { type: GraphQLFloat },
    thyroid: { type: GraphQLFloat },
    uterus: { type: GraphQLFloat },
    vagina: { type: GraphQLFloat },
    wholeBlood: { type: GraphQLFloat },
    transcriptId: { type: GraphQLString },
    geneId: { type: GraphQLString },
  },
})

export const fetchGtexTissueExpressionsByTranscript = async (ctx, transcriptId) => {
  const response = await ctx.database.elastic.search({
    index: 'gtex_tissue_tpms_by_transcript',
    type: 'tissue_tpms',
    size: 1,
    body: {
      query: {
        bool: {
          filter: {
            term: { transcriptId },
          },
        },
      },
    },
  })

  const doc = response.hits.hits[0]
  return doc ? doc._source : null // eslint-disable-line no-underscore-dangle
}
