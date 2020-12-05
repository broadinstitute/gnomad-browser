const { isEmpty } = require('lodash')

const nullifyEmptyObject = (field) => {
  return (obj) => {
    const value = obj[field]
    return isEmpty(value) ? null : value
  }
}

module.exports = {
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
