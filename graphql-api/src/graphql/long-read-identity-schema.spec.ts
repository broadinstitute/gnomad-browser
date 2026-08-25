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
      short_read_context {
        status reason_code catalog_dataset catalog_source catalog_digest
        matched_component_index matched_reference_region_index
        exact_reference_component_outline_authorized
        matched_reference_repeat_unit_classifications
        matched_component { chrom start0 end0 motif }
        candidates {
          canonical_id matched_component_index matched_reference_region_index
          matched_component { chrom start0 end0 motif }
        }
        catalog_record {
          id reference_repeat_unit repeat_units { repeat_unit classification }
          associated_diseases {
            name symbol omim_id inheritance_mode notes
            repeat_size_classifications { classification min max }
          }
        }
        lr_database lr_release lr_run_id lr_cohort
      }
      repeat_count_plots {
        status reason_code unit repeat_unit max_repunits
        interaction { interaction_status reason }
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

const longReadTrReferenceQuery = `
  query LongReadTrReference($after: String) {
    long_read_tandem_repeat_reference(
      first: 50
      after: $after
      query: "HTT"
      chrom: "4"
      match_status: BOTH
      sort: GENOMIC_ASC
    ) {
      total_count
      page_info { has_next_page end_cursor }
      provenance {
        dataset source compact_sha256 row_count catalog_available catalog_unavailable_reason
        reference_genome coordinate_system motif_identity
      }
      nodes {
        id gene_symbol reference_region { reference_genome chrom start stop }
        reference_repeat_unit associated_diseases { name symbol omim_id }
        short_record {
          id gene { symbol } main_reference_region { reference_genome chrom start stop }
          reference_repeat_unit associated_diseases { name omim_id }
        }
        hgsvc_hprc {
          status reason_code source_database source_run_id canonical_ids candidates { canonical_id }
        }
        aou { status reason_code source_database source_run_id canonical_ids candidates { canonical_id } }
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

  test('accepts the bounded short-read to LR reference connection query', () => {
    expect(validate(schema, parse(longReadTrReferenceQuery))).toEqual([])
  })

  test('publishes source/ALT identity through assembled-schema introspection', async () => {
    const result = await graphql({ schema, source: getIntrospectionQuery() })
    expect(result.errors).toBeUndefined()

    const types = (result.data as any).__schema.types
    const detailsType = types.find((type: any) => type.name === 'LongReadVariantDetails')
    expect(detailsType.fields.map((field: any) => field.name)).toEqual(
      expect.arrayContaining(['source_variant_id', 'alt_index', 'alt_count'])
    )

    const contextType = types.find((type: any) => type.name === 'LongReadTrShortReadContext')
    expect(contextType.fields.map((field: any) => field.name)).toEqual(
      expect.arrayContaining([
        'exact_reference_component_outline_authorized',
        'matched_reference_repeat_unit_classifications',
      ])
    )
    expect(
      contextType.fields.find((field: any) => field.name === 'pathogenic_component_highlight')
    ).toEqual(expect.objectContaining({ isDeprecated: true }))
  })
})
