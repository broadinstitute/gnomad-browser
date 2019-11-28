import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { ReferenceGenomeType } from '../../gene-models/referenceGenome'
import { HistogramType } from '../shared/histogram'

const GnomadStructuralVariantPopulationDataType = new GraphQLObjectType({
  name: 'GnomadStructuralVariantPopulationData',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    ac: { type: new GraphQLNonNull(GraphQLInt) },
    an: { type: new GraphQLNonNull(GraphQLInt) },
    ac_hom: { type: GraphQLInt },
  },
})

const GnomadStructuralVariantAgeDistributionType = new GraphQLObjectType({
  name: 'GnomadStructuralVariantDetailsAgeDistribution',
  fields: {
    het: { type: HistogramType },
    hom: { type: HistogramType },
  },
})

const GnomadStructuralVariantGenotypeQualityType = new GraphQLObjectType({
  name: 'GnomadStructuralVariantGenotypeQuality',
  fields: {
    all: { type: HistogramType },
    alt: { type: HistogramType },
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
    age_distribution: { type: GnomadStructuralVariantAgeDistributionType },
    algorithms: { type: new GraphQLList(GraphQLString) },
    alts: { type: new GraphQLList(GraphQLString) },
    ac: { type: GraphQLInt },
    ac_hom: { type: GraphQLInt },
    an: { type: GraphQLInt },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    chrom2: { type: GraphQLString },
    consequences: { type: new GraphQLList(GnomadStructuralVariantConsequenceType) },
    copy_numbers: { type: new GraphQLList(GnomadStructuralVariantCopyNumberDataType) },
    cpx_intervals: { type: new GraphQLList(GraphQLString) },
    cpx_type: { type: GraphQLString },
    end: { type: new GraphQLNonNull(GraphQLInt) },
    end2: { type: GraphQLInt },
    evidence: { type: new GraphQLList(GraphQLString) },
    filters: { type: new GraphQLList(GraphQLString) },
    genes: { type: new GraphQLList(GraphQLString) },
    genotype_quality: { type: GnomadStructuralVariantGenotypeQualityType },
    length: { type: GraphQLInt },
    populations: { type: new GraphQLList(GnomadStructuralVariantPopulationDataType) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    pos2: { type: GraphQLInt },
    qual: { type: GraphQLFloat },
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    type: { type: GraphQLString },
    variant_id: { type: new GraphQLNonNull(GraphQLString) },
  },
})

export default GnomadStructuralVariantDetailsType
