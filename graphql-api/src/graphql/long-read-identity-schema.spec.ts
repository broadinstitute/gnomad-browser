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
      selected_allele_unavailable_reason
      exact_alt_count exact_alt_count_complete exact_alt_count_unavailable_reason
      delta_min delta_max delta_unavailable_reason called_allele_count called_sample_count
      sequences_available sequences_unavailable_reason
      component_measurement_available component_measurement_unavailable_reason
      region { chrom start0 end0 size }
      components { chrom start0 end0 motif }
      source_records {
        source_variant_id task_id attempt_id alt_count non_reference_ac an non_reference_af
      }
      whole_record_allele_landscape {
        status reason_code unit called_alleles non_reference_called_alleles reference_called_alleles
        exact_alt_count stratified_available stratified_unavailable_reason ancestry_groups sexes
        bins { delta called_alleles exact_alt_count allele_ids stacks { ancestry_group sex called_alleles } }
        purity_points { allele_id delta motif_purity called_alleles }
        purity_available purity_unavailable_reason
      }
      whole_record_genotype_landscape {
        status reason_code unit reference_allele_id called_samples called_alleles ancestry_groups sexes
        cells {
          shorter_delta longer_delta people
          pairs {
            shorter_allele_id longer_allele_id ancestry_group sex people phased_people unphased_people
          }
        }
      }
      selected_allele {
        variant_id source_variant_id alt_index alt_count ref alt length motif_purity motif_purity_source
        decomposition_status decomposition_reason rsids filters major_consequence cadd_phred phylop
        source_release source_run_id freq { all { ac an af } populations { id ac an af } }
      }
      repeat_count_plots {
        status reason_code unit repeat_unit max_repunits
        identity {
          ancillary_run_id primary_database primary_run_id primary_task_id primary_attempt_id
          source_variant_id component { chrom start0 end0 motif }
        }
        overall { called_alleles called_diploid_genotypes no_call_rate no_call_rate_status }
        callability {
          ancestry_group sex called_alleles called_diploid_genotypes no_call_rate no_call_rate_status
        }
        allele_size_distribution {
          ancestry_group sex repunit distribution { repunit_count frequency }
        }
        genotype_distribution {
          ancestry_group sex short_allele_repunit long_allele_repunit
          distribution { short_allele_repunit_count long_allele_repunit_count frequency }
        }
      }
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
