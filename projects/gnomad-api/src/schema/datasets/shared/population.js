import {
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'


export const PopulationType = new GraphQLObjectType({
  name: 'VariantPopulationFrequencyData',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    ac: { type: new GraphQLNonNull(GraphQLInt) },
    an: { type: new GraphQLNonNull(GraphQLInt) },
    hemi: { type: new GraphQLNonNull(GraphQLInt) },
    hom: { type: new GraphQLNonNull(GraphQLInt) },
  }
})


export const extractPopulationData = (populationIds, variantData) => {
  return populationIds.map(popId => ({
    id: popId,
    ac: variantData[`AC_${popId}`] || 0,
    an: variantData[`AN_${popId}`] || 0,
    hemi: variantData[`Hemi_${popId}`] || 0,
    hom: variantData[`Hom_${popId}`] || 0,
  }))
}
