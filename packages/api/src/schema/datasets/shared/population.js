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
    ac: { type: GraphQLInt },
    an: { type: GraphQLInt },
    hemi: { type: GraphQLInt },
    hom: { type: GraphQLInt },
  }
})


export const extractPopulationData = (populationIds, variantData) => {
  return populationIds.map(popId => ({
    id: popId,
    ac: variantData[`AC_${popId}`],
    an: variantData[`AN_${popId}`],
    hemi: variantData[`Hemi_${popId}`],
    hom: variantData[`Hom_${popId}`],
  }))
}
