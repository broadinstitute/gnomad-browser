import { getIntrospectionQuery, graphql, parse, validate } from 'graphql'

process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200'
process.env.LR_Y1_ENABLED = 'false'
process.env.PWD = `${process.cwd()}/graphql-api`
// Require after setting the same minimum configuration used by a fresh local API.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const schema = require('./schema').default

const longReadTrLocusQuery = `
  query LongReadTrLocus($id: String!, $cohort: LongReadCohort!, $after: String, $allele: String) {
    long_read_tandem_repeat_locus(
      id: $id
      lr_cohort: $cohort
      first: 50
      after: $after
      allele: $allele
    ) {
      id source_trid chrom source_run_id total_alleles selected_allele_valid
      components { chrom start0 end0 motif }
      source_records { source_variant_id alt_count non_reference_ac an non_reference_af }
      alleles {
        nodes { variant_id source_variant_id alt_index alt_count repeat_count length freq { all { ac an af } } }
        page_info { has_next_page end_cursor }
      }
    }
  }
`

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

  test('accepts the bounded canonical TR locus page query in the assembled schema', () => {
    expect(validate(schema, parse(longReadTrLocusQuery))).toEqual([])
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
