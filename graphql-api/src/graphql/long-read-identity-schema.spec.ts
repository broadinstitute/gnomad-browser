import { getIntrospectionQuery, graphql, parse, validate } from 'graphql'

process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200'
process.env.LR_Y1_ENABLED = 'false'
process.env.PWD = `${process.cwd()}/graphql-api`
// Require after setting the same minimum configuration used by a fresh local API.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const schema = require('./schema').default

const longReadVariantPageIdentityQuery = `
  query LongReadVariantPageIdentity(
    $datasetId: DatasetId!
    $variantId: String!
    $lrCohort: LongReadCohort
  ) {
    variant(dataset: $datasetId, variantId: $variantId, lr_cohort: $lrCohort) {
      variant_id
      chrom
      pos
      ref
      alt
      long_read_details {
        source_variant_id
        alt_index
        alt_count
        allele_type
        length
      }
    }
  }
`

describe('assembled LR identity GraphQL contract', () => {
  test('accepts the identity selection used by the LR variant page', () => {
    expect(validate(schema, parse(longReadVariantPageIdentityQuery))).toEqual([])
  })

  test('publishes source/ALT identity through assembled-schema introspection', async () => {
    const result = await graphql({ schema, source: getIntrospectionQuery() })
    expect(result.errors).toBeUndefined()

    const detailsType = (result.data as any).__schema.types.find(
      (type: any) => type.name === 'LongReadVariantDetails'
    )
    expect(detailsType.fields.map((field: any) => field.name)).toEqual(
      expect.arrayContaining(['source_variant_id', 'alt_index', 'alt_count'])
    )
  })
})
