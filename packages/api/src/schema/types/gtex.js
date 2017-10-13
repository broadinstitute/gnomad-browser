/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
} from 'graphql'

export const tissuesByTranscript = new GraphQLObjectType({
  name: 'TissuesByTranscript',
  description: 'reheadered.031216.GTEx_Analysis_2016-09-07_RSEMv1.2.22_transcript_tpm.txt.gz',
  fields: () => ({
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
  }),
})

export const lookUpTranscriptTissueExpression = ({ elasticClient, transcriptId }) => {
  return new Promise((resolve, _) => {
    elasticClient.search({
      index: 'gtex_tissue_tpms_by_transcript',
      type: 'tissue_tpms',
      size: 100,
      body: {
        query: {
          match: {
            transcriptId
          },
        },
      }
    }).then((response) => {
      console.log(response)
      resolve(response.hits.hits[0]._source)
    })
  })
}

