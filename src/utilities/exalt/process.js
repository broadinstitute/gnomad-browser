/* eslint-disable no-param-reassign */

/**
 * Extract variant consequence and annotations
 * from vep_annotations prior after fetching
 */

import R from 'ramda'

export const POPULATIONS = [
  'European (Non-Finnish)',
  'East Asian',
  'Other',
  'African',
  'Latino',
  'South Asian',
  'European (Finnish)',
]

import { CATEGORY_DEFINITIONS } from '../../constants'

const isChange = R.test(/:[c]./)
const isProtein = R.test(/:[p]./)

// :: String -> [Array]
const packageBP = R.pipe(
  R.split(/:[c]./),
  i => ({
    type: 'Base change',
    change: i[1],
    transcript: i[0],
  }),
)
// :: String -> [Array]
const packageProtein = R.pipe(
  R.split(/:[p]./),
  i => ({
    type: 'Protein change',
    change: i[1],
    transcript: i[0],
    residue: Number(/\d+/.exec(i[1])[0]),
  }),
)

// :: Variant -> [Annotations]
const shapeAnnotation = R.pipe(
  R.prop('vep_annotations'),
  R.pluck('HGVSp'),
  R.dropRepeats,
  R.map(R.pipe(
    R.cond([
      [isChange, packageBP],
      [isProtein, packageProtein],
      [R.isEmpty, R.always({
        type: 'none',
      })],
    ]),
  )),
)

// :: Variant -> { Annotations }
export const getAnnotations = R.pipe(
  shapeAnnotation,
  R.reduce((accumulator, annotation) => {
    if (annotation.type === 'none') {
      return accumulator
    }
    return {
      transcripts: R.uniq([
        ...accumulator.transcripts,
        annotation.transcript,
      ]),
      types: R.uniq([
        ...accumulator.types,
        annotation.type,
      ]),
      changes: R.uniq([
        ...accumulator.changes,
        annotation.change,
      ]),
      residues: R.uniq([
        ...accumulator.residues,
        annotation.residue,
      ]),
    }
  }, {
    transcripts: [],
    types: [],
    changes: [],
    residues: [],
  }),
  v => ({
    transcripts: v.transcripts || 'None',
    type: v.types[0] || 'None',
    change: v.changes[0] || 'None',
    residue: v.residues[0] || 'None',
  }),
  )

// :: Variant -> { Consequences: { consequence: count }
export const getConsequences = R.pipe(
  R.prop('vep_annotations'),
  R.pluck('Consequence'),
  R.map(R.split('&')),
  R.flatten,
  R.reduce((accumulator, consequence) => {
    return {
      ...accumulator,
      [consequence]: R.inc(accumulator[consequence]) || 1,
    }
  }, {}),
)

// :: [Variants] -> [Strings]
export const uniqueConsequences = R.pipe(
  R.pluck('vep_annotations'),
  R.map(R.pipe(
   R.pluck('Consequence'),
   R.map(R.split('&')),
  )),
  R.flatten,
  R.uniq,
)

export const uniqueVepFields = (field, variants) => {
  if (field === 'PolyPhen' || field === 'SIFT') {
    return R.pipe(
      R.pluck('vep_annotations'),
      R.map(R.pipe(
       R.pluck(field),
      )),
      R.flatten,
      R.reject(R.isEmpty),
      R.map(item => R.split('(', item)[0]),
      R.uniq,
    )(variants)
  }
  return R.pipe(
    R.pluck('vep_annotations'),
    R.map(R.pipe(
     R.pluck(field),
    )),
    R.flatten,
    R.uniq,
  )(variants)
}

// :: [Variants] -> [Strings]
export const uniqueQualityOptions = R.pipe(
  R.pluck('filter'),
  R.flatten,
  R.uniq,
)

// :: { k: v } -> k with max v
export const maximumObjectProperty = R.pipe(
  R.toPairs,
  R.sort((a, b) => b[1] - a[1]),
  R.head,
  R.head,
)

// :: { k: v } -> k with max v
export const getMostSevereConsequence = (consequences) => {
  const { all } = CATEGORY_DEFINITIONS
  const mostSevereIndex = Object.keys(consequences).reduce((acc, consequence) => {
    const severity = all.indexOf(consequence)
    if (severity < acc && severity !== -1) return severity
    return acc
  }, all.length)
  return all[mostSevereIndex]
}

// :: Variant -> String
export const getMaximumConsequence = R.pipe(
  getConsequences,
  getMostSevereConsequence,
)

// :: Variant -> { Object }
export const reshapePopulationData = (variant) => {
  const dataSets = ['pop_ans', 'pop_acs', 'pop_homs', 'frequency']
  const populations = Object.keys(variant[dataSets[0]])
  const reshaped = populations.reduce((object, population) => {
    object[population] = dataSets.reduce((obj, d) => {
      if (d === 'frequency') {
        obj[d] = (obj.pop_acs / obj.pop_ans).toPrecision(3)
        return obj
      }
      obj[d] = variant[d][population]
      return obj
    }, {})
    return object
  }, {})
  const populationData = {
    data: reshaped,
    populations,
  }
  return populationData
}

export const domain = (field, variantsList) => {
  return R.pipe(
    R.pluck(field),
    R.uniq,
    R.sort((a, b) => a - b),
    // (array) => [R.last(array), R.head(array)],
  )(variantsList)
}

export const getDataBounds = (variantsList) => {
  const fields = [
    'hom_count',
    'allele_count',
    'allele_num',
    'allele_freq',
  ]
  return fields.reduce((accumulator, field) => {
    return ({
      ...accumulator,
      [field]: domain(field, variantsList),
    })
  }, {})
}

export const domainPopulation = (population, field, variantsList) => {
  return R.pipe(
    R.pluck('populationData'),
    R.pluck(population),
    R.pluck(field),
    R.uniq,
    R.sort((a, b) => a - b),
    // (array) => [R.last(array), R.head(array)],
  )(variantsList)
}

export const getPopulationDataBounds = (variantsList) => {
  const fields = [
    'pop_acs',
    'pop_ans',
    'pop_homs',
    'frequency',
  ]
  return POPULATIONS.reduce((populationAccumulator, population) => {
    return ({
      ...populationAccumulator,
      [population]: fields.reduce((fieldAccumulator, field) => {
        return ({
          ...fieldAccumulator,
          [field]: domainPopulation(population, field, variantsList),
        })
      }, {}),
    })
  }, {})
}

// ::  Variant -> [pubmed ids]
export const extractPubMedIdList = R.pipe(
  R.prop('vep_annotations'),
  R.pluck('PUBMED'),
  R.map(R.split('&')),
  R.flatten,
  R.reject(R.isEmpty),
  R.uniq,
)

const hasPubMed = R.pipe(
  extractPubMedIdList,
  (list) => {
    if (list.length > 0) {
      return 'Yes'
    }
    return 'No'
  },
)

// :: [Variants] -> [pubmed id list]
export const extractUniquePubMedIdsFromVariants = R.pipe(
  R.pluck('pubMedIds'),
  R.flatten,
  R.uniq,
)

// :: Variant -> { Object }
export const processComboAnnotations = (field, variant) => {
  return R.pipe(
    R.prop('vep_annotations'),
    R.pluck(field),
    R.reject(R.isEmpty),
    R.map(R.pipe(
      R.split('('),
      annotation => ({
        annotation: annotation[0],
        value: Number(annotation[1].split(')')[0]),
      }),
    )),
  )(variant)
}

export const processAnnotations = (field, variant) => {
  return R.pipe(
    R.prop('vep_annotations'),
    R.pluck(field),
    R.reject(R.isEmpty),
    R.map(
      annotation => ({
        annotation,
      }),
    ),
  )(variant)
}

// :: Variant -> Variant w/ added props
export const processVariant = (variant) => {
  const annotations = getAnnotations(variant)
  // console.log(extractPubMedIdList(variant))
  // console.log(hasPubMed(variant))
  return {
    ...variant,
    // populationData: reshapePopulationData(variant).data,
    consequences: getConsequences(variant),
    consequence: getMaximumConsequence(variant),
    annotations,
    annotationType: annotations.type,
    polyPhen: processComboAnnotations('PolyPhen', variant),
    sift: processComboAnnotations('SIFT', variant),
    bioType: processAnnotations('BIOTYPE', variant),
    impact: processAnnotations('IMPACT', variant),
    clinSig: processAnnotations('CLIN_SIG', variant),
    pubMedIds: extractPubMedIdList(variant),
    hasPubMed: hasPubMed(variant),
    lof_flags: processAnnotations('LoF', variant),
    first_lof_flag: R.head(processAnnotations('LoF', variant)).annotation,
  }
}

// :: [Variants] -> [Variants w/ added props]
export const processVariantsList = R.reduce(
  (accumulator, variant) => {
    return [
      ...accumulator,
      processVariant(variant),
    ]
  }, [],
)
