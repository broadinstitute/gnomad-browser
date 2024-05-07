import { describe, it, expect } from '@jest/globals'

import { populationFactory, variantFactory } from '../__factories__/Variant'
import { Population } from '../VariantPage/VariantPage'

import {
  mergeExomeAndGenomePopulationData,
  mergeExomeAndGenomeData,
} from './mergeExomeAndGenomeData'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

type AncestryGroupShorthand = {
  id: PopulationId
  value: number
}

const createAncestryGroupObjects = (shorthands: AncestryGroupShorthand[]) => {
  const geneticAncestryGroupObjects: Population[] = shorthands.map((shorthand) => {
    return populationFactory.build({
      id: shorthand.id,
      ac: shorthand.value,
      an: shorthand.value * 10,
      ac_hemi: shorthand.value + 1,
      ac_hom: shorthand.value + 2,
    })
  })

  return geneticAncestryGroupObjects
}

describe('mergeExomeAndGenomePopulationData', () => {
  it('returns expected values when exomes and genomes have the same populations', () => {
    const geneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 1 },
      { id: 'remaining', value: 2 },
      { id: 'eur', value: 4 },
    ])

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: geneticAncestryGroupObjects },
      genome: { populations: geneticAncestryGroupObjects },
    })

    const result = mergeExomeAndGenomePopulationData(testVariant.exome!, testVariant.genome!)

    const expected = [
      { ac: 2, ac_hemi: 4, ac_hom: 6, an: 20, id: 'afr' },
      { ac: 4, ac_hemi: 6, ac_hom: 8, an: 40, id: 'remaining' },
      { ac: 8, ac_hemi: 10, ac_hom: 12, an: 80, id: 'eur' },
    ]

    expect(result).toStrictEqual(expected)
  })

  it('returns expected values when exomes have less populations than genomes', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 1 },
      { id: 'remaining', value: 2 },
      { id: 'eur', value: 4 },
    ])

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 8 },
      { id: 'remaining', value: 16 },
      { id: 'eur', value: 32 },
      { id: 'mid', value: 64 },
    ])

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: exomeGeneticAncestryGroupObjects },
      genome: { populations: genomeGeneticAncestryGroupObjects },
    })

    const result = mergeExomeAndGenomePopulationData(testVariant.exome!, testVariant.genome!)

    const expected = [
      { ac: 9, ac_hemi: 11, ac_hom: 13, an: 90, id: 'afr' },
      { ac: 18, ac_hemi: 20, ac_hom: 22, an: 180, id: 'remaining' },
      { ac: 36, ac_hemi: 38, ac_hom: 40, an: 360, id: 'eur' },
      { ac: 64, ac_hemi: 65, ac_hom: 66, an: 640, id: 'mid' },
    ]

    expect(result).toStrictEqual(expected)
  })

  it('returns expected values exomes have more populations than genomes', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 1 },
      { id: 'remaining', value: 2 },
      { id: 'eur', value: 4 },
      { id: 'mid', value: 8 },
    ])

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 16 },
      { id: 'remaining', value: 32 },
      { id: 'eur', value: 64 },
    ])

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: exomeGeneticAncestryGroupObjects },
      genome: { populations: genomeGeneticAncestryGroupObjects },
    })

    const result = mergeExomeAndGenomePopulationData(testVariant.exome!, testVariant.genome!)

    const expected = [
      { ac: 17, ac_hemi: 19, ac_hom: 21, an: 170, id: 'afr' },
      { ac: 34, ac_hemi: 36, ac_hom: 38, an: 340, id: 'remaining' },
      { ac: 68, ac_hemi: 70, ac_hom: 72, an: 680, id: 'eur' },
      { ac: 8, ac_hemi: 9, ac_hom: 10, an: 80, id: 'mid' },
    ]

    expect(result).toStrictEqual(expected)
  })

  it('returns expected values when exome and genome populations are in a different order', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'eur', value: 1 },
      { id: 'afr', value: 2 },
      { id: 'remaining', value: 4 },
    ])

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 8 },
      { id: 'remaining', value: 16 },
      { id: 'eur', value: 32 },
    ])

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: exomeGeneticAncestryGroupObjects },
      genome: { populations: genomeGeneticAncestryGroupObjects },
    })

    const result = mergeExomeAndGenomePopulationData(testVariant.exome!, testVariant.genome!)

    const expected = [
      { ac: 33, ac_hemi: 35, ac_hom: 37, an: 330, id: 'eur' },
      { ac: 10, ac_hemi: 12, ac_hom: 14, an: 100, id: 'afr' },
      { ac: 20, ac_hemi: 22, ac_hom: 24, an: 200, id: 'remaining' },
    ]

    expect(result).toStrictEqual(expected)
  })
})

describe('mergeExomeAndGenomeData', () => {
  it('returns expected values with just exome data', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 1 },
      { id: 'remaining', value: 2 },
      { id: 'eur', value: 4 },
    ])
    const testExomeOnlyVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        an: 4,
        af: 5,
        faf95: undefined,
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
    })

    const result = mergeExomeAndGenomeData([testExomeOnlyVariant])

    const expected = [
      {
        ...testExomeOnlyVariant,
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        an: 4,
        af: 5,
        allele_freq: 5,
        faf95: undefined,
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
    ]

    expect(result).toStrictEqual(expected)
  })
  it('returns expected values with just genome data', () => {
    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 8 },
      { id: 'remaining', value: 16 },
      { id: 'eur', value: 32 },
      { id: 'mid', value: 64 },
    ])
    const testGenomeOnlyVariant = variantFactory.build({
      variant_id: 'test_variant',
      genome: {
        ac: 2,
        ac_hemi: 3,
        ac_hom: 4,
        an: 5,
        af: 6,
        faf95: undefined,
        filters: ['AC0'],
        populations: genomeGeneticAncestryGroupObjects,
      },
    })

    const result = mergeExomeAndGenomeData([testGenomeOnlyVariant])

    const expected = [
      {
        ...testGenomeOnlyVariant,
        ac: 2,
        ac_hemi: 3,
        ac_hom: 4,
        an: 5,
        af: 6,
        allele_freq: 6,
        faf95: undefined,
        filters: ['AC0'],
        populations: genomeGeneticAncestryGroupObjects,
      },
    ]

    expect(result).toStrictEqual(expected)
  })

  it('returns expected values with exome and genome data', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 1 },
      { id: 'remaining', value: 2 },
      { id: 'eur', value: 4 },
    ])

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 8 },
      { id: 'remaining', value: 16 },
      { id: 'eur', value: 32 },
      { id: 'mid', value: 64 },
    ])

    const testExomeAndGenomeVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        an: 4,
        faf95: undefined,
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
      genome: {
        ac: 2,
        ac_hemi: 3,
        ac_hom: 4,
        an: 6,
        faf95: undefined,
        filters: ['AC0'],
        populations: genomeGeneticAncestryGroupObjects,
      },
    })

    const result = mergeExomeAndGenomeData([testExomeAndGenomeVariant])

    const expected = [
      {
        ...testExomeAndGenomeVariant,
        ac: 3,
        ac_hemi: 5,
        ac_hom: 7,
        an: 10,
        af: 0.3,
        allele_freq: 0.3,
        filters: ['RF', 'AC0'],
        populations: [
          { ac: 9, ac_hemi: 11, ac_hom: 13, an: 90, id: 'afr' },
          { ac: 18, ac_hemi: 20, ac_hom: 22, an: 180, id: 'remaining' },
          { ac: 36, ac_hemi: 38, ac_hom: 40, an: 360, id: 'eur' },
          { ac: 64, ac_hemi: 65, ac_hom: 66, an: 640, id: 'mid' },
        ],
      },
    ]

    expect(result).toStrictEqual(expected)
  })
  it('returns expected values with exome and joint data', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 1 },
      { id: 'remaining', value: 2 },
      { id: 'eur', value: 4 },
    ])
    const jointGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 8 },
      { id: 'remaining', value: 16 },
      { id: 'eur', value: 32 },
      { id: 'mid', value: 64 },
    ])
    const testExomeAndJointVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        an: 4,
        af: 5,
        faf95: undefined,
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
      joint: {
        ac: 10,
        hemizygote_count: 20,
        homozygote_count: 30,
        an: 40,
        faf95: undefined,
        filters: ['RF'],
        populations: jointGeneticAncestryGroupObjects,
      },
    })

    const result = mergeExomeAndGenomeData([testExomeAndJointVariant])

    const expected = [
      {
        ...testExomeAndJointVariant,
        ac: 10,
        hemizygote_count: 20,
        homozygote_count: 30,
        an: 40,
        allele_freq: 0.25,
        faf95: undefined,
        filters: ['RF'],
        populations: jointGeneticAncestryGroupObjects,
      },
    ]

    expect(result).toStrictEqual(expected)
  })
  it('returns expected values with genome and joint data', () => {
    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 8 },
      { id: 'remaining', value: 16 },
      { id: 'eur', value: 32 },
      { id: 'mid', value: 64 },
    ])
    const jointGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 1 },
      { id: 'remaining', value: 2 },
      { id: 'eur', value: 4 },
    ])
    const testGenomeAndJointVariant = variantFactory.build({
      variant_id: 'test_variant',
      genome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        an: 4,
        af: 5,
        faf95: undefined,
        filters: ['RF'],
        populations: genomeGeneticAncestryGroupObjects,
      },
      joint: {
        ac: 10,
        hemizygote_count: 20,
        homozygote_count: 30,
        an: 40,
        faf95: undefined,
        filters: ['RF'],
        populations: jointGeneticAncestryGroupObjects,
      },
    })

    const result = mergeExomeAndGenomeData([testGenomeAndJointVariant])

    const expected = [
      {
        ...testGenomeAndJointVariant,
        ac: 10,
        hemizygote_count: 20,
        homozygote_count: 30,
        an: 40,
        allele_freq: 0.25,
        faf95: undefined,
        filters: ['RF'],
        populations: jointGeneticAncestryGroupObjects,
      },
    ]

    expect(result).toStrictEqual(expected)
  })
  it('returns expected values with exome, genome, and joint data', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 1 },
      { id: 'remaining', value: 2 },
      { id: 'eur', value: 4 },
    ])
    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 8 },
      { id: 'remaining', value: 16 },
      { id: 'eur', value: 32 },
      { id: 'mid', value: 64 },
    ])
    const jointGeneticAncestryGroupObjects = createAncestryGroupObjects([
      { id: 'afr', value: 10 },
      { id: 'remaining', value: 20 },
      { id: 'eur', value: 40 },
      { id: 'mid', value: 80 },
      { id: 'sas', value: 160 },
    ])
    const testExomeGenomeAndJointVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        an: 4,
        af: 5,
        faf95: undefined,
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
      genome: {
        ac: 2,
        ac_hemi: 4,
        ac_hom: 5,
        an: 6,
        af: 5,
        faf95: undefined,
        filters: ['AC0'],
        populations: genomeGeneticAncestryGroupObjects,
      },
      joint: {
        ac: 10,
        hemizygote_count: 20,
        homozygote_count: 30,
        an: 40,
        faf95: undefined,
        filters: ['discrepant_frequencies'],
        populations: jointGeneticAncestryGroupObjects,
      },
    })

    const result = mergeExomeAndGenomeData([testExomeGenomeAndJointVariant])

    const expected = [
      {
        ...testExomeGenomeAndJointVariant,
        ac: 10,
        ac_hemi: 20,
        ac_hom: 30,
        an: 40,
        af: 0.25,
        allele_freq: 0.25,
        filters: ['RF', 'AC0', 'discrepant_frequencies'],
        populations: [
          { ac: 9, ac_hemi: 11, ac_hom: 13, an: 90, id: 'afr' },
          { ac: 18, ac_hemi: 20, ac_hom: 22, an: 180, id: 'remaining' },
          { ac: 36, ac_hemi: 38, ac_hom: 40, an: 360, id: 'eur' },
          { ac: 64, ac_hemi: 65, ac_hom: 66, an: 640, id: 'mid' },
        ],
      },
    ]

    expect(result).toStrictEqual(expected)
  })
})
