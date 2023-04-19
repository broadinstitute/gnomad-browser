import { isEmpty } from 'lodash'

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
  },
  TranscriptGene: {
    // Elasticsearch documents may contain an empty object instead of null
    mane_select_transcript: nullifyEmptyObject('mane_select_transcript'),
    pext: nullifyEmptyObject('pext'),
    gnomad_constraint: nullifyEmptyObject('gnomad_constraint'),
    exac_constraint: nullifyEmptyObject('exac_constraint'),
  },
}

export default resolvers
