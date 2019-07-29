import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

const GnomadStructuralVariantPopulationDataType = new GraphQLObjectType({
  name: 'GnomadStructuralVariantPopulationData',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    ac: { type: new GraphQLNonNull(GraphQLInt) },
    an: { type: new GraphQLNonNull(GraphQLInt) },
    ac_hom: { type: GraphQLInt },
  },
})

const GnomadStructuralVariantConsequenceType = new GraphQLObjectType({
  name: 'GnomadStructuralVariantConsequence',
  fields: {
    consequence: { type: new GraphQLNonNull(GraphQLString) },
    genes: { type: new GraphQLList(GraphQLString) },
  },
})

const GnomadStructuralVariantCopyNumberDataType = new GraphQLObjectType({
  name: 'GnomadStructuralVariantCopyNumberData',
  fields: {
    copy_number: { type: new GraphQLNonNull(GraphQLInt) },
    ac: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

const GnomadStructuralVariantDetailsType = new GraphQLObjectType({
  name: 'GnomadStructuralVariantDetails',
  fields: {
    algorithms: { type: new GraphQLList(GraphQLString) },
    alts: { type: new GraphQLList(GraphQLString) },
    ac: { type: GraphQLInt },
    ac_hom: { type: GraphQLInt },
    an: { type: GraphQLInt },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    consequences: { type: new GraphQLList(GnomadStructuralVariantConsequenceType) },
    copy_numbers: { type: new GraphQLList(GnomadStructuralVariantCopyNumberDataType) },
    cpx_intervals: { type: new GraphQLList(GraphQLString) },
    cpx_type: { type: GraphQLString },
    end_chrom: { type: new GraphQLNonNull(GraphQLString) },
    end_pos: { type: new GraphQLNonNull(GraphQLInt) },
    evidence: { type: new GraphQLList(GraphQLString) },
    filters: { type: new GraphQLList(GraphQLString) },
    genes: { type: new GraphQLList(GraphQLString) },
    length: { type: GraphQLInt },
    populations: { type: new GraphQLList(GnomadStructuralVariantPopulationDataType) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    qual: { type: GraphQLFloat },
    type: { type: GraphQLString },
    variant_id: { type: GraphQLString },
  },
})

export default GnomadStructuralVariantDetailsType
