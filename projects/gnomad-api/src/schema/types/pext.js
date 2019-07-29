import { GraphQLInt, GraphQLFloat, GraphQLNonNull, GraphQLObjectType } from 'graphql'

const PextRegionTissueValuesType = new GraphQLObjectType({
  name: 'pextRegionTissueValues',
  fields: {
    adipose_subcutaneous: { type: new GraphQLNonNull(GraphQLFloat) },
    adipose_visceral_omentum: { type: new GraphQLNonNull(GraphQLFloat) },
    adrenal_gland: { type: new GraphQLNonNull(GraphQLFloat) },
    artery_aorta: { type: new GraphQLNonNull(GraphQLFloat) },
    artery_coronary: { type: new GraphQLNonNull(GraphQLFloat) },
    artery_tibial: { type: new GraphQLNonNull(GraphQLFloat) },
    bladder: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_amygdala: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_anterior_cingulate_cortex_ba24: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_caudate_basal_ganglia: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_cerebellar_hemisphere: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_cerebellum: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_cortex: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_frontal_cortex_ba9: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_hippocampus: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_hypothalamus: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_nucleus_accumbens_basal_ganglia: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_putamen_basal_ganglia: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_spinal_cord_cervical_c_1: { type: new GraphQLNonNull(GraphQLFloat) },
    brain_substantia_nigra: { type: new GraphQLNonNull(GraphQLFloat) },
    breast_mammary_tissue: { type: new GraphQLNonNull(GraphQLFloat) },
    cells_ebv_transformed_lymphocytes: { type: new GraphQLNonNull(GraphQLFloat) },
    cells_transformed_fibroblasts: { type: new GraphQLNonNull(GraphQLFloat) },
    cervix_ectocervix: { type: new GraphQLNonNull(GraphQLFloat) },
    cervix_endocervix: { type: new GraphQLNonNull(GraphQLFloat) },
    colon_sigmoid: { type: new GraphQLNonNull(GraphQLFloat) },
    colon_transverse: { type: new GraphQLNonNull(GraphQLFloat) },
    esophagus_gastroesophageal_junction: { type: new GraphQLNonNull(GraphQLFloat) },
    esophagus_mucosa: { type: new GraphQLNonNull(GraphQLFloat) },
    esophagus_muscularis: { type: new GraphQLNonNull(GraphQLFloat) },
    fallopian_tube: { type: new GraphQLNonNull(GraphQLFloat) },
    heart_atrial_appendage: { type: new GraphQLNonNull(GraphQLFloat) },
    heart_left_ventricle: { type: new GraphQLNonNull(GraphQLFloat) },
    kidney_cortex: { type: new GraphQLNonNull(GraphQLFloat) },
    liver: { type: new GraphQLNonNull(GraphQLFloat) },
    lung: { type: new GraphQLNonNull(GraphQLFloat) },
    minor_salivary_gland: { type: new GraphQLNonNull(GraphQLFloat) },
    muscle_skeletal: { type: new GraphQLNonNull(GraphQLFloat) },
    nerve_tibial: { type: new GraphQLNonNull(GraphQLFloat) },
    ovary: { type: new GraphQLNonNull(GraphQLFloat) },
    pancreas: { type: new GraphQLNonNull(GraphQLFloat) },
    pituitary: { type: new GraphQLNonNull(GraphQLFloat) },
    prostate: { type: new GraphQLNonNull(GraphQLFloat) },
    skin_not_sun_exposed_suprapubic: { type: new GraphQLNonNull(GraphQLFloat) },
    skin_sun_exposed_lower_leg: { type: new GraphQLNonNull(GraphQLFloat) },
    small_intestine_terminal_ileum: { type: new GraphQLNonNull(GraphQLFloat) },
    spleen: { type: new GraphQLNonNull(GraphQLFloat) },
    stomach: { type: new GraphQLNonNull(GraphQLFloat) },
    testis: { type: new GraphQLNonNull(GraphQLFloat) },
    thyroid: { type: new GraphQLNonNull(GraphQLFloat) },
    uterus: { type: new GraphQLNonNull(GraphQLFloat) },
    vagina: { type: new GraphQLNonNull(GraphQLFloat) },
    whole_blood: { type: new GraphQLNonNull(GraphQLFloat) },
  },
})

export const PextRegionType = new GraphQLObjectType({
  name: 'pextRegion',
  fields: {
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
    mean: { type: new GraphQLNonNull(GraphQLFloat) },
    tissues: { type: new GraphQLNonNull(PextRegionTissueValuesType) },
  },
})

export const fetchPextRegionsByGene = async (ctx, geneId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_pext_021519',
    type: 'region',
    size: 500,
    body: {
      query: {
        bool: {
          filter: {
            term: { gene_id: geneId },
          },
        },
      },
    },
  })

  return response.hits.hits.map(hit => hit._source) // eslint-disable-line no-underscore-dangle
}
