import { Factory } from 'fishery' // eslint-disable-line import/no-extraneous-dependencies

export const exomeReadApiOutputFactory = Factory.define(({ sequence }) => ({
  category: 'hom',
  bamPath: `dummy_bampath_${sequence}`,
  indexPath: `dummy_indexpath_${sequence}`,
  readGroup: `dummy_readgroup_${sequence}`,
}))

export const readsApiOutputFactory = Factory.define(({ sequence }) => ({
  variant_0: {
    variantId: `123-${45 + sequence}-A-C`,
    exome: [],
    genome: [],
  },
}))
