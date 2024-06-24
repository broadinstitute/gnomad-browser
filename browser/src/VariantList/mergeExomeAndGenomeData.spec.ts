import { describe, it, expect } from '@jest/globals'

import { createAncestryGroupObjects, variantFactory } from '../__factories__/Variant'
import { Population } from '../VariantPage/VariantPage'

import {
  mergeExomeGenomeAndJointPopulationData,
  mergeExomeAndGenomeData,
} from './mergeExomeAndGenomeData'

describe('mergeExomeGenomeAndJointPopulationData', () => {
  it('returns expected values when exomes and genomes have the same populations', () => {
    const geneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 1 },
        { id: 'remaining', value: 2 },
        { id: 'eur', value: 4 },
        { id: 'XX', value: 8 },
        { id: 'XY', value: 16 },
      ],
      false
    )

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: geneticAncestryGroupObjects },
      genome: { populations: geneticAncestryGroupObjects },
    })

    const result = mergeExomeGenomeAndJointPopulationData({
      exomePopulations: testVariant.exome!.populations,
      genomePopulations: testVariant.genome!.populations,
    })

    const expected = [
      { ac: 2, ac_hemi: 4, ac_hom: 6, an: 20, id: 'afr' },
      { ac: 4, ac_hemi: 6, ac_hom: 8, an: 40, id: 'remaining' },
      { ac: 8, ac_hemi: 10, ac_hom: 12, an: 80, id: 'eur' },
      { ac: 16, ac_hemi: 18, ac_hom: 20, an: 160, id: 'XX' },
      { ac: 32, ac_hemi: 34, ac_hom: 36, an: 320, id: 'XY' },
    ]

    expect(result).toStrictEqual(expected)
  })

  it('returns expected values when exomes have less populations than genomes', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 1 },
        { id: 'remaining', value: 2 },
        { id: 'eur', value: 4 },
      ],
      false
    )

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 8 },
        { id: 'remaining', value: 16 },
        { id: 'eur', value: 32 },
        { id: 'mid', value: 64 },
      ],
      false
    )

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: exomeGeneticAncestryGroupObjects },
      genome: { populations: genomeGeneticAncestryGroupObjects },
    })

    const result = mergeExomeGenomeAndJointPopulationData({
      exomePopulations: testVariant.exome!.populations,
      genomePopulations: testVariant.genome!.populations,
    })

    const expected = [
      { ac: 9, ac_hemi: 11, ac_hom: 13, an: 90, id: 'afr' },
      { ac: 18, ac_hemi: 20, ac_hom: 22, an: 180, id: 'remaining' },
      { ac: 36, ac_hemi: 38, ac_hom: 40, an: 360, id: 'eur' },
      { ac: 64, ac_hemi: 65, ac_hom: 66, an: 640, id: 'mid' },
    ]

    expect(result).toStrictEqual(expected)
  })

  it('returns expected values exomes have more populations than genomes', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 1 },
        { id: 'remaining', value: 2 },
        { id: 'eur', value: 4 },
        { id: 'mid', value: 8 },
      ],
      false
    )

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 16 },
        { id: 'remaining', value: 32 },
        { id: 'eur', value: 64 },
      ],
      false
    )

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: exomeGeneticAncestryGroupObjects },
      genome: { populations: genomeGeneticAncestryGroupObjects },
    })

    const result = mergeExomeGenomeAndJointPopulationData({
      exomePopulations: testVariant.exome!.populations,
      genomePopulations: testVariant.genome!.populations,
    })

    const expected = [
      { ac: 17, ac_hemi: 19, ac_hom: 21, an: 170, id: 'afr' },
      { ac: 34, ac_hemi: 36, ac_hom: 38, an: 340, id: 'remaining' },
      { ac: 68, ac_hemi: 70, ac_hom: 72, an: 680, id: 'eur' },
      { ac: 8, ac_hemi: 9, ac_hom: 10, an: 80, id: 'mid' },
    ]

    expect(result).toStrictEqual(expected)
  })

  it('returns expected values when exome and genome populations are in a different order', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'eur', value: 1 },
        { id: 'afr', value: 2 },
        { id: 'remaining', value: 4 },
      ],
      false
    )

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 8 },
        { id: 'remaining', value: 16 },
        { id: 'eur', value: 32 },
      ],
      false
    )

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: exomeGeneticAncestryGroupObjects },
      genome: { populations: genomeGeneticAncestryGroupObjects },
    })

    const result = mergeExomeGenomeAndJointPopulationData({
      exomePopulations: testVariant.exome!.populations,
      genomePopulations: testVariant.genome!.populations,
    })

    const expected = [
      { ac: 33, ac_hemi: 35, ac_hom: 37, an: 330, id: 'eur' },
      { ac: 10, ac_hemi: 12, ac_hom: 14, an: 100, id: 'afr' },
      { ac: 20, ac_hemi: 22, ac_hom: 24, an: 200, id: 'remaining' },
    ]

    expect(result).toStrictEqual(expected)
  })

  it('returns expected values when joint values are present', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'eur', value: 1 },
        { id: 'afr', value: 2 },
        { id: 'remaining', value: 4 },
      ],
      false
    )

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 8 },
        { id: 'remaining', value: 16 },
        { id: 'eur', value: 32 },
      ],
      false
    )

    const jointGeneticAncestryGroupObjects = [
      { ac: 16, hemizygote_count: 17, homozygote_count: 18, an: 160, id: 'afr' },
      { ac: 16, hemizygote_count: 17, homozygote_count: 18, an: 160, id: 'afr_XX' },
      { ac: 16, hemizygote_count: 17, homozygote_count: 18, an: 160, id: 'afr_YY' },
      { ac: 32, hemizygote_count: 33, homozygote_count: 34, an: 320, id: 'remaining' },
      { ac: 64, hemizygote_count: 65, homozygote_count: 66, an: 640, id: 'eur' },
      { ac: 128, hemizygote_count: 129, homozygote_count: 130, an: 1280, id: 'mid' },
    ]

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: exomeGeneticAncestryGroupObjects },
      genome: { populations: genomeGeneticAncestryGroupObjects },
      joint: { populations: jointGeneticAncestryGroupObjects as Population[] },
    })

    const result = mergeExomeGenomeAndJointPopulationData({
      exomePopulations: testVariant.exome!.populations,
      genomePopulations: testVariant.genome!.populations,
      jointPopulations: testVariant.joint!.populations,
    })

    const expectedJointGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 16 },
        { id: 'afr_XX', value: 16 },
        { id: 'afr_YY', value: 16 },
        { id: 'remaining', value: 32 },
        { id: 'eur', value: 64 },
        { id: 'mid', value: 128 },
      ],
      true
    )

    expect(result).toStrictEqual(expectedJointGeneticAncestryGroupObjects)
  })

  it('returns all ancestries from dataset if provided, filling in missing ones and removing not included ones', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'eur', value: 1 },
        { id: 'afr', value: 2 },
        { id: 'remaining', value: 4 },
        { id: 'XX', value: 8 },
        { id: 'XY', value: 16 },
      ],
      false
    )

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 32 },
        { id: 'remaining', value: 64 },
        { id: 'eur', value: 128 },
        { id: 'XX', value: 256 },
        { id: 'XY', value: 512 },
      ],
      false
    )

    const jointGeneticAncestryGroupObjects = [
      { ac: 16, hemizygote_count: 17, homozygote_count: 18, an: 160, id: 'afr' },
      { ac: 16, hemizygote_count: 17, homozygote_count: 18, an: 160, id: 'afr_XX' },
      { ac: 16, hemizygote_count: 17, homozygote_count: 18, an: 160, id: 'afr_YY' },
      { ac: 32, hemizygote_count: 33, homozygote_count: 34, an: 320, id: 'remaining' },
      { ac: 64, hemizygote_count: 65, homozygote_count: 66, an: 640, id: 'eur' },
      { ac: 128, hemizygote_count: 129, homozygote_count: 130, an: 1280, id: 'mid' },
      { ac: 256, hemizygote_count: 257, homozygote_count: 258, an: 2560, id: 'XX' },
      { ac: 512, hemizygote_count: 513, homozygote_count: 514, an: 5120, id: 'XY' },
    ]

    const testVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: { populations: exomeGeneticAncestryGroupObjects },
      genome: { populations: genomeGeneticAncestryGroupObjects },
      joint: { populations: jointGeneticAncestryGroupObjects as Population[] },
    })

    const result = mergeExomeGenomeAndJointPopulationData({
      datasetId: 'gnomad_r4',
      exomePopulations: testVariant.exome!.populations,
      genomePopulations: testVariant.genome!.populations,
      jointPopulations: testVariant.joint!.populations,
    })

    const expectedJointGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 16 },
        { id: 'afr_XX', value: 16 },
        { id: 'afr_YY', value: 16 },
        { id: 'remaining', value: 32 },
        { id: 'eur', value: 64 },
        { id: 'mid', value: 128 },
        { id: 'XX', value: 256 },
        { id: 'XY', value: 512 },
      ],
      true
    )

    const missingAncestries: Population[] = [
      { id: 'amr', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'amr_XX', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'amr_XY', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'asj', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'asj_XX', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'asj_XY', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'eas', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'eas_XX', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'eas_XY', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'fin', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'fin_XX', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'fin_XY', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'nfe', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'nfe_XX', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'nfe_XY', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'ami', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'ami_XX', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'ami_XY', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'sas', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'sas_XX', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
      { id: 'sas_XY', ac: 0, an: 0, ac_hemi: 0, ac_hom: 0 },
    ]

    // include missing ancstries from v4 (e.g. fin)
    const expectedObjectsIncludingMissingAncestries =
      expectedJointGeneticAncestryGroupObjects.concat(missingAncestries)

    //  removes ancestries not present in v4 (e.g. eur)
    const expectedAncestriesIncludingMissingMinusNotIncluded =
      expectedObjectsIncludingMissingAncestries.filter((ancestry) => !ancestry.id.includes('eur'))

    const sortAncestries = (ancestryA: Population, ancestryB: Population) =>
      ancestryA.id.localeCompare(ancestryB.id)

    expect(result.sort(sortAncestries)).toEqual(
      expectedAncestriesIncludingMissingMinusNotIncluded.sort(sortAncestries)
    )
  })
})

describe('mergeExomeAndGenomeData', () => {
  it('returns just exome populations if only exome data is present, but no dataset', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 1 },
        { id: 'remaining', value: 2 },
        { id: 'eur', value: 4 },
        { id: 'XX', value: 8 },
        { id: 'XY', value: 16 },
      ],
      false
    )
    const testExomeOnlyVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        an: 4,
        af: 5,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
    })

    const result = mergeExomeAndGenomeData({ variants: [testExomeOnlyVariant] })

    const expected = [
      {
        ...testExomeOnlyVariant,
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        an: 4,
        af: 0.25,
        allele_freq: 0.25,
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
    ]

    expect(result).toStrictEqual(expected)
  })
  it('returns just genome populations if only genome data is present, but no dataset', () => {
    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 8 },
        { id: 'remaining', value: 16 },
        { id: 'eur', value: 32 },
        { id: 'mid', value: 64 },
      ],
      false
    )
    const testGenomeOnlyVariant = variantFactory.build({
      variant_id: 'test_variant',
      genome: {
        ac: 2,
        ac_hemi: 3,
        ac_hom: 4,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        an: 5,
        af: 6,
        filters: ['AC0'],
        populations: genomeGeneticAncestryGroupObjects,
      },
    })

    const result = mergeExomeAndGenomeData({ variants: [testGenomeOnlyVariant] })

    const expected = [
      {
        ...testGenomeOnlyVariant,
        ac: 2,
        ac_hemi: 3,
        ac_hom: 4,
        an: 5,
        af: 0.4,
        allele_freq: 0.4,
        filters: ['AC0'],
        populations: genomeGeneticAncestryGroupObjects,
      },
    ]

    expect(result).toStrictEqual(expected)
  })

  it('merges present populations with exome and genome data, but no dataset', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 1 },
        { id: 'remaining', value: 2 },
        { id: 'eur', value: 4 },
      ],
      false
    )

    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 8 },
        { id: 'remaining', value: 16 },
        { id: 'eur', value: 32 },
        { id: 'mid', value: 64 },
      ],
      false
    )

    const testExomeAndGenomeVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        an: 4,
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
      genome: {
        ac: 2,
        ac_hemi: 3,
        ac_hom: 4,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        an: 6,
        filters: ['AC0'],
        populations: genomeGeneticAncestryGroupObjects,
      },
    })

    const result = mergeExomeAndGenomeData({ variants: [testExomeAndGenomeVariant] })

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
  it('preferentially uses joint populations if both exome and joint are present, but no dataset', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 1 },
        { id: 'remaining', value: 2 },
        { id: 'eur', value: 4 },
      ],
      false
    )

    const jointGeneticAncestryGroupObjects = [
      { ac: 8, hemizygote_count: 9, homozygote_count: 10, an: 80, id: 'afr' },
      { ac: 16, hemizygote_count: 17, homozygote_count: 18, an: 160, id: 'remaining' },
      { ac: 32, hemizygote_count: 33, homozygote_count: 34, an: 320, id: 'eur' },
      { ac: 64, hemizygote_count: 65, homozygote_count: 66, an: 640, id: 'mid' },
    ]

    const testExomeAndJointVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        an: 4,
        af: 5,
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
      joint: {
        ac: 10,
        hemizygote_count: 20,
        homozygote_count: 30,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        an: 40,
        filters: ['discrepant_frequencies'],
        populations: jointGeneticAncestryGroupObjects as Population[],
      },
    })

    const result = mergeExomeAndGenomeData({ variants: [testExomeAndJointVariant] })

    const expectedJointGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 8 },
        { id: 'remaining', value: 16 },
        { id: 'eur', value: 32 },
        { id: 'mid', value: 64 },
      ],
      true
    )

    const expected = [
      {
        ...testExomeAndJointVariant,
        ac: 10,
        ac_hemi: 20,
        ac_hom: 30,
        an: 40,
        af: 0.25,
        allele_freq: 0.25,
        filters: ['RF', 'discrepant_frequencies'],
        populations: expectedJointGeneticAncestryGroupObjects,
      },
    ]

    expect(result).toStrictEqual(expected)
  })
  it('preferentially uses joint populations if both genome and joint are present, but no dataset', () => {
    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 8 },
        { id: 'remaining', value: 16 },
        { id: 'eur', value: 32 },
        { id: 'mid', value: 64 },
      ],
      false
    )

    const jointGeneticAncestryGroupObjects = [
      { ac: 1, hemizygote_count: 2, homozygote_count: 3, an: 10, id: 'afr' },
      { ac: 2, hemizygote_count: 3, homozygote_count: 4, an: 20, id: 'remaining' },
      { ac: 4, hemizygote_count: 5, homozygote_count: 6, an: 40, id: 'eur' },
    ]

    const testGenomeAndJointVariant = variantFactory.build({
      variant_id: 'test_variant',
      genome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        an: 4,
        af: 5,
        filters: ['RF'],
        populations: genomeGeneticAncestryGroupObjects,
      },
      joint: {
        ac: 10,
        hemizygote_count: 20,
        homozygote_count: 30,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        an: 40,
        filters: ['discrepant_frequencies'],
        populations: jointGeneticAncestryGroupObjects as Population[],
      },
    })

    const result = mergeExomeAndGenomeData({ variants: [testGenomeAndJointVariant] })

    const expectedJointGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 1 },
        { id: 'remaining', value: 2 },
        { id: 'eur', value: 4 },
      ],
      true
    )

    const expected = [
      {
        ...testGenomeAndJointVariant,
        ac: 10,
        ac_hemi: 20,
        ac_hom: 30,
        an: 40,
        af: 0.25,
        allele_freq: 0.25,
        filters: ['RF', 'discrepant_frequencies'],
        populations: expectedJointGeneticAncestryGroupObjects,
      },
    ]

    expect(result).toStrictEqual(expected)
  })
  it('preferentially uses joint populations if exome, genome and joint are present, but no dataset', () => {
    const exomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 1 },
        { id: 'remaining', value: 2 },
        { id: 'eur', value: 4 },
      ],
      false
    )
    const genomeGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 8 },
        { id: 'remaining', value: 16 },
        { id: 'eur', value: 32 },
        { id: 'mid', value: 64 },
      ],
      false
    )

    const jointGeneticAncestryGroupObjects = [
      { ac: 10, hemizygote_count: 11, homozygote_count: 12, an: 100, id: 'afr' },
      { ac: 20, hemizygote_count: 21, homozygote_count: 22, an: 200, id: 'remaining' },
      { ac: 40, hemizygote_count: 41, homozygote_count: 42, an: 400, id: 'eur' },
      { ac: 80, hemizygote_count: 81, homozygote_count: 82, an: 800, id: 'mid' },
      { ac: 160, hemizygote_count: 161, homozygote_count: 162, an: 1600, id: 'sas' },
    ]

    const testExomeGenomeAndJointVariant = variantFactory.build({
      variant_id: 'test_variant',
      exome: {
        ac: 1,
        ac_hemi: 2,
        ac_hom: 3,
        an: 4,
        af: 5,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        filters: ['RF'],
        populations: exomeGeneticAncestryGroupObjects,
      },
      genome: {
        ac: 2,
        ac_hemi: 4,
        ac_hom: 5,
        an: 6,
        af: 5,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        filters: ['AC0'],
        populations: genomeGeneticAncestryGroupObjects,
      },
      joint: {
        ac: 10,
        hemizygote_count: 20,
        homozygote_count: 30,
        an: 40,
        faf95: {
          popmax: null,
          popmax_population: null,
        },
        filters: ['discrepant_frequencies'],
        populations: jointGeneticAncestryGroupObjects as Population[],
      },
    })

    const result = mergeExomeAndGenomeData({ variants: [testExomeGenomeAndJointVariant] })

    const expectedJointGeneticAncestryGroupObjects = createAncestryGroupObjects(
      [
        { id: 'afr', value: 10 },
        { id: 'remaining', value: 20 },
        { id: 'eur', value: 40 },
        { id: 'mid', value: 80 },
        { id: 'sas', value: 160 },
      ],
      true
    )
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
        populations: expectedJointGeneticAncestryGroupObjects,
      },
    ]

    expect(result).toStrictEqual(expected)
  })
})
