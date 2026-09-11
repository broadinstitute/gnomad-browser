import React from 'react'
import { jest, expect, test } from '@jest/globals'
import renderer from 'react-test-renderer'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'
import { forDatasetsMatching } from '../../../tests/__helpers__/datasets'
import VariantPage, { Variant, VariantPageContent } from './VariantPage'
import { v2VariantFactory, v3VariantFactory, sequencingFactory } from '../__factories__/Variant'
import clinvarVariantFactory from '../__factories__/ClinvarVariant'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { BrowserRouter } from 'react-router-dom'

jest.mock('../Query', () => {
  const originalModule = jest.requireActual('../Query')

  return {
    __esModule: true,
    ...(originalModule as object),
    default: jest.fn(),
    BaseQuery: jest.fn(),
  }
})

const { resetMockApiCalls, resetMockApiResponses, simulateApiResponse, setMockApiResponses } =
  mockQueries()

beforeEach(() => {
  Query.mockImplementation(
    jest.fn(({ query, children, operationName, variables }) =>
      simulateApiResponse('Query', query, children, operationName, variables)
    )
  )
  // The semicolon is due to a quirk of JS/TS parsing--try taking it out and
  // you'll see what happens.
  // Also, it's not clear why we have to cast BaseQuery here but not Query
  // above.
  ;(BaseQuery as any).mockImplementation(
    jest.fn(({ query, children, operationName, variables }) =>
      simulateApiResponse('BaseQuery', query, children, operationName, variables)
    )
  )
})

afterEach(() => {
  resetMockApiCalls()
  resetMockApiResponses()
})

forDatasetsMatching(/gnomad_r3/, 'VariantPage with the dataset "%s"', (datasetId) => {
  test('has no unexpected changes', () => {
    const variant = v3VariantFactory.build()

    setMockApiResponses({
      GnomadVariant: () => ({ variant }),
      ReadData: () => ({
        variant_0: { exome: null, genome: [] },
      }),
    })
    const tree = renderer.create(
      <BrowserRouter>
        <VariantPage datasetId={datasetId} variantId={variant.variant_id} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})

forDatasetsMatching(/gnomad_r2/, 'VariantPage with the dataset %s', (datasetId) => {
  test('has no unexpected changes', () => {
    const variant = v2VariantFactory.build()

    setMockApiResponses({
      GnomadVariant: () => ({ variant }),
      ReadData: () => ({
        variant_0: { exome: null, genome: [] },
      }),
    })
    const tree = renderer.create(
      <BrowserRouter>
        <VariantPage datasetId={datasetId} variantId={variant.variant_id} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})

describe('VariantPage with the dataset exac', () => {
  test('has no unexpected changes', () => {
    const variant = v2VariantFactory.build()

    setMockApiResponses({
      GnomadVariant: () => ({ variant }),
      ReadData: () => ({
        variant_0: { exome: null, genome: [] },
      }),
    })
    const tree = renderer.create(
      <BrowserRouter>
        <VariantPage datasetId="exac" variantId={variant.variant_id} />
      </BrowserRouter>
    )
    expect(tree).toMatchSnapshot()
  })
})

const sectionTitles = {
  'external-resources': 'External Resources',
  feedback: 'Feedback',
  'genetic-ancestry-group-frequencies': 'Genetic Ancestry Group Frequencies',
  'related-variants': 'Related Variants',
  'variant-effect-predictor': 'Ensembl Variant Effect Predictor',
  'lof-curation': 'LoF Curation',
  'in-silico-predictors': 'In Silico Predictors',
  'genomic-constraint': 'Genomic Constraint of Surrounding 1kb Region',
  clinvar: 'ClinVar',
  'age-distribution': 'Age Distribution',
  'genotype-quality-metrics': 'Genotype Quality Metrics',
  'site-quality-metrics': 'Site Quality Metrics',
  'read-data': 'Read Data',
}

const conditionalIds = [
  'lof-curation',
  'in-silico-predictors',
  'genomic-constraint',
  'clinvar',
  'age-distribution',
]

const expectSections = (variant: Variant, datasetId: DatasetId, present: string[]) => {
  setMockApiResponses({ ReadData: () => ({ variant_0: { exome: null, genome: [] } }) })
  const tree = renderer.create(
    <BrowserRouter>
      <VariantPageContent datasetId={datasetId} variant={variant} />
    </BrowserRouter>
  )
  const expectedIds = Object.keys(sectionTitles).filter(
    (id) => !conditionalIds.includes(id) || present.includes(id)
  )
  const headings = tree.root.findAllByType('h2')
  expect(headings.map(({ props }) => props.id)).toEqual(expectedIds)
  headings.forEach((heading) => {
    const title = sectionTitles[heading.props.id as keyof typeof sectionTitles]
    expect(heading.children).toContain(title)
    expect(heading.findByType('a').props).toMatchObject({
      href: `#${heading.props.id}`,
      'aria-label': `Copy link to ${title}`,
    })
  })
  const ids = tree.root
    .findAll((node) => typeof node.type === 'string' && !!node.props.id)
    .map(({ props }) => props.id)
  expect(new Set(ids).size).toBe(ids.length)
  tree.unmount()
}

describe('short-variant section permalinks', () => {
  test('v4 exposes all 13 stable, uniquely named targets, including empty LoF and missing constraint data', () => {
    const variant = v3VariantFactory.build()
    variant.lof_curations = []
    variant.in_silico_predictors = [{ id: 'cadd', value: '10', flags: [] }]
    variant.clinvar = clinvarVariantFactory.build()
    expectSections(variant, 'gnomad_r4', conditionalIds)
  })

  test.each([null, []])('omits missing conditional sections with predictors %j', (predictors) => {
    const variant = v3VariantFactory.build()
    variant.genome = { ...variant.genome!, age_distribution: null }
    variant.in_silico_predictors = predictors
    expectSections(variant, 'gnomad_r2_1', [])
  })

  test.each(['exome', 'genome'] as const)(
    'keeps the age target for %s age data alone',
    (source) => {
      const variant = v3VariantFactory.build()
      variant.exome = null
      variant.genome = null
      variant[source] = sequencingFactory.build()
      expectSections(variant, 'gnomad_r4', ['genomic-constraint', 'age-distribution'])
    }
  )

  test('does not expose the age target for joint-only age data', () => {
    const variant = v3VariantFactory.build()
    variant.genome = { ...variant.genome!, age_distribution: null }
    variant.joint = {
      ...sequencingFactory.build(),
      freq_comparison_stats: {
        contingency_table_test: [],
        cochran_mantel_haenszel_test: { chisq: 0, p_value: 1 },
        stat_union: { p_value: 1, stat_test_name: '', gen_ancs: [] },
      },
    }
    expectSections(variant, 'gnomad_r4', ['genomic-constraint'])
  })
})
