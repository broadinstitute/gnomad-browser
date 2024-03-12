import { isEmpty } from 'lodash'
import {
  resolveMitochondrialGeneConstraint,
  resolveMitochondialGeneConstraintType,
  resolveMitochondrialRegionConstraint,
} from './mitochondrial-constraint'

const nullifyEmptyObject = (field: any) => {
  return (obj: any) => {
    const value = obj[field]
    return isEmpty(value) ? null : value
  }
}

const resolvers = {
  Gene: {
    // Elasticsearch documents may contain an empty object instead of null
    mane_select_transcript: nullifyEmptyObject('mane_select_transcript'),
    pext: nullifyEmptyObject('pext'),
    gnomad_constraint: nullifyEmptyObject('gnomad_constraint'),
    exac_constraint: nullifyEmptyObject('exac_constraint'),
    mitochondrial_constraint: resolveMitochondrialGeneConstraint,
    mitochondrial_missense_constraint_regions: resolveMitochondrialRegionConstraint,
  },
  TranscriptGene: {
    // Elasticsearch documents may contain an empty object instead of null
    mane_select_transcript: nullifyEmptyObject('mane_select_transcript'),
    pext: nullifyEmptyObject('pext'),
    gnomad_constraint: nullifyEmptyObject('gnomad_constraint'),
    exac_constraint: nullifyEmptyObject('exac_constraint'),
  },
  MitochondrialGeneConstraint: {
    __resolveType: resolveMitochondialGeneConstraintType,
  },
}

export default resolvers
