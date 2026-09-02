import {
  getIntrospectionQuery,
  graphql,
  GraphQLObjectType,
  GraphQLSchema,
  parse,
  validate,
} from 'graphql'
import { longReadTrShortReadDistributionSingleSelectionRule } from './long-read-tr-short-read-distribution-validation'

process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://127.0.0.1:9200'
process.env.LR_Y1_ENABLED = 'false'
process.env.PWD = `${process.cwd()}/graphql-api`
// Require after setting the same minimum configuration used by a fresh local API.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const schema = require('./schema').default

const longReadTrLocusQuery = `
  query LongReadTrLocus(
    $id: String!
    $cohort: LongReadCohort!
    $after: String
    $allele: String
    $ancestryGroupId: String
    $sexGroupId: String
    $colorBy: LongReadTrFilterDimension
  ) {
    long_read_tandem_repeat_locus(
      id: $id
      lr_cohort: $cohort
      first: 50
      after: $after
      allele: $allele
      ancestry_group_id: $ancestryGroupId
      sex_group_id: $sexGroupId
      color_by: $colorBy
    ) {
      id source_trid chrom source_run_id total_alleles selected_allele_valid
      selected_allele_unavailable_reason
      exact_alt_count exact_alt_count_complete exact_alt_count_unavailable_reason
      delta_min delta_max delta_unavailable_reason called_allele_count called_sample_count
      sequences_available sequences_unavailable_reason
      component_measurement_available component_measurement_unavailable_reason
      primary_repeat {
        status reason_code motif component_index selection_basis biological_role
        catalog_id catalog_digest registry_digest
        component { chrom start0 end0 motif }
      }
      primary_motif_measurement {
        status reason_code motif biological_role metric unit scope called_alleles
        reference_alleles alternate_alleles alternate_identities_checked
        bins { exact_units allele_copies }
        genotype {
          status reason_code called_diploid_people no_call_people
          cells { shorter_exact_units longer_exact_units people }
        }
        provenance {
          product_run_id primary_database primary_run_id primary_task_id primary_attempt_id
          source_variant_id registry_digest registry_approval_state algorithm_version
          algorithm_sha256 anchor_rule source_record_sha256 allele_receipt_sha256
          genotype_receipt_sha256 bounds_status serialized_bytes returned_bins returned_cells
        }
      }
      region { chrom start0 end0 size }
      components { chrom start0 end0 motif }
      source_records {
        source_variant_id task_id attempt_id alt_count non_reference_ac an non_reference_af
      }
      presentation {
        source_representation_kind presentation_layout presentation_reason classification_source
        classification_release classification_digest reviewed_override_digest
      }
      bounds {
        component_envelope_start0 component_envelope_end0 component_envelope_length_bp
        component_envelope_basis source_ref_span_start0 source_ref_span_end0 source_ref_span_status
        variation_cluster_start0 variation_cluster_end0 variation_cluster_length_bp
        variation_cluster_status bounds_source bounds_release bounds_digest
      }
      component_summary { ordered_component_count distinct_stored_motif_count }
      sequence_cardinality {
        source_alt_identity_count unique_alt_sequence_count all_source_alts_sequence_complete
        status reason algorithm_version
      }
      represented_length {
        status reason represented_ref_length_bp represented_alt_min_length_bp
        represented_alt_max_length_bp source_delta_provenance sequence_length_provenance
        sequence_source_record_digest sequence_content_digest
        anchor_rule anchor_rule_source anchor_rule_release anchor_rule_digest reconciliation_status
      }
      filter_contract {
        status reason ancestry_mapping_status ancestry_control_redundant
        ancestry_control_redundancy_reason available_color_dimensions allele_color_dimensions
        genotype_color_dimensions unstratified_policy vocabulary_release vocabulary_digest
        source_key_inventory_release source_key_inventory_digest source_release source_run_id
        metadata_source_run_id
        ancestry_groups {
          id label kind source_frequency_keys source_metadata_keys available_in_frequency
          available_in_genotype shared_available unavailable_reason
        }
        sex_groups {
          id label kind source_frequency_keys source_metadata_keys available_in_frequency
          available_in_genotype shared_available unavailable_reason
        }
      }
      whole_record_allele_landscape {
        status reason_code unit called_alleles non_reference_called_alleles reference_called_alleles
        exact_alt_count stratified_available stratified_unavailable_reason ancestry_groups sexes
        bins { delta called_alleles exact_alt_count allele_ids stacks { ancestry_group sex called_alleles } }
        purity_points { allele_id delta motif_purity called_alleles }
        purity_available purity_unavailable_reason
        stratified_view {
          status reason ancestry_filter_id sex_filter_id color_dimension filtered_called_alleles
          allele_counts { allele_id called_alleles }
          bins {
            delta called_alleles
            segments { group_id label kind called_alleles }
          }
        }
      }
      whole_record_genotype_landscape {
        status reason_code unit reference_allele_id called_samples called_alleles ancestry_groups sexes
        cells {
          shorter_delta longer_delta people
          pairs {
            shorter_allele_id longer_allele_id ancestry_group ancestry_group_id
            sex sex_group_id people phased_people unphased_people
          }
        }
        stratified_view {
          status reason ancestry_filter_id sex_filter_id color_dimension called_samples
          cells {
            shorter_delta longer_delta people
            pairs { ancestry_group ancestry_group_id sex sex_group_id people }
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
        reference_genome coordinate_system motif_identity snapshot_contract_id
        snapshot_contract_label snapshot_contract_scope snapshot_approval_state
        current_trexplorer_admitted admitted_component_index_complete
        admitted_component_index_database admitted_component_index_release
        admitted_component_index_source_count admitted_component_index_source_record_count
        admitted_component_index_canonical_locus_count admitted_component_index_ordered_component_count
        admitted_component_index_inventory_sha256 diagnostic_max_candidates_per_status
        diagnostic_max_source_records_per_candidate
      }
      nodes {
        id gene_symbol reference_region { reference_genome chrom start stop }
        reference_repeat_unit associated_diseases { name symbol omim_id }
        short_record {
          id gene { symbol } main_reference_region { reference_genome chrom start stop }
          reference_repeat_unit associated_diseases { name omim_id }
        }
        hgsvc_hprc {
          status reason_code proof_text source_database source_run_id canonical_ids
          candidates {
            canonical_id matched_component_index matched_component { chrom start0 end0 motif }
            matched_reference_region_index source_record_count source_record_membership_sha256
          }
          diagnostic_candidates {
            canonical_id ordered_component_index ordered_component { chrom start0 end0 motif }
            motif_relation source_record_count source_record_membership_sha256
            source_records { cohort chrom run_id source_record_id position }
            source_records_truncated
          }
          diagnostic_candidate_identity_count diagnostic_candidates_truncated
          diagnostic_candidate_identity_sha256
        }
        aou {
          status reason_code proof_text source_database source_run_id canonical_ids
          candidates { canonical_id source_record_count source_record_membership_sha256 }
          diagnostic_candidates { canonical_id motif_relation }
          diagnostic_candidate_identity_count diagnostic_candidates_truncated
          diagnostic_candidate_identity_sha256
        }
      }
    }
  }
`

const longReadTrShortReadDistributionsQuery = `
  query LongReadTrShortReadDistributions($id: String!, $cohort: LongReadCohort!) {
    long_read_tandem_repeat_short_read_distributions(id: $id, lr_cohort: $cohort) {
      status reason_code catalog_dataset catalog_source catalog_digest distribution_digest
      distribution_source_index distribution_concrete_index distribution_index_uuid short_id
      matched_component_index matched_component { chrom start0 end0 motif }
      main_reference_region { reference_genome chrom start stop }
      reference_repeat_unit reference_repeat_count source_serialized_bytes source_total_bins
      allele {
        status reason_code source_rows source_bins returned_rows returned_bins serialized_bytes
        distributions {
          ancestry_group sex repunit quality_description q_score
          distribution { repunit_count frequency }
        }
      }
      genotype {
        status reason_code source_rows source_bins returned_rows returned_bins serialized_bytes
        distributions {
          ancestry_group sex short_allele_repunit long_allele_repunit quality_description q_score
          distribution { short_allele_repunit_count long_allele_repunit_count frequency }
        }
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

  test('executes and serializes Phase 2A fallback enums through GraphQL', async () => {
    const locusType = schema.getType('LongReadTandemRepeatLocus')
    const executionSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Phase2AExecutionQuery',
        fields: {
          locus: {
            type: locusType,
            resolve: () => ({
              presentation: {
                source_representation_kind: 'UNKNOWN',
                presentation_layout: 'CLUSTER_FOCUSED',
                presentation_reason: 'MULTI_COMPONENT_FALLBACK',
              },
              bounds: {
                component_envelope_start0: 100,
                component_envelope_end0: 120,
                component_envelope_length_bp: 20,
                component_envelope_basis: 'EXACT_ORDERED_COMPONENTS',
                source_ref_span_status: 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT',
                variation_cluster_status: 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION',
              },
              component_summary: {
                ordered_component_count: 2,
                distinct_stored_motif_count: 2,
              },
              sequence_cardinality: {
                source_alt_identity_count: 2,
                unique_alt_sequence_count: 1,
                all_source_alts_sequence_complete: true,
                status: 'AVAILABLE_EXACT',
                algorithm_version: 'SHA256_WITH_BYTE_EQUALITY_V1',
              },
              represented_length: {
                status: 'UNAVAILABLE',
                reason: 'ANCHOR_RULE_NOT_APPROVED',
                source_delta_provenance: 'SEQUENCE_DERIVED',
                reconciliation_status: 'NOT_EVALUATED',
              },
            }),
          },
        },
      }),
    })
    const result = await graphql({
      schema: executionSchema,
      source: `{
        locus {
          presentation { source_representation_kind presentation_layout presentation_reason }
          bounds { component_envelope_basis source_ref_span_status variation_cluster_status }
          sequence_cardinality { status reason }
          represented_length { status reason source_delta_provenance reconciliation_status }
        }
      }`,
    })
    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      locus: {
        presentation: {
          source_representation_kind: 'UNKNOWN',
          presentation_layout: 'CLUSTER_FOCUSED',
          presentation_reason: 'MULTI_COMPONENT_FALLBACK',
        },
        bounds: {
          component_envelope_basis: 'EXACT_ORDERED_COMPONENTS',
          source_ref_span_status: 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT',
          variation_cluster_status: 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION',
        },
        sequence_cardinality: { status: 'AVAILABLE_EXACT', reason: null },
        represented_length: {
          status: 'UNAVAILABLE',
          reason: 'ANCHOR_RULE_NOT_APPROVED',
          source_delta_provenance: 'SEQUENCE_DERIVED',
          reconciliation_status: 'NOT_EVALUATED',
        },
      },
    })
  })

  test('executes and serializes the Phase 2B pending-vocabulary contract through GraphQL', async () => {
    const locusType = schema.getType('LongReadTandemRepeatLocus')
    const executionSchema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Phase2BExecutionQuery',
        fields: {
          locus: {
            type: locusType,
            resolve: () => ({
              filter_contract: {
                status: 'PARTIAL',
                reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
                ancestry_mapping_status: 'UNAVAILABLE_PENDING_OWNER_APPROVAL',
                ancestry_groups: [
                  {
                    id: 'frequency:nfe',
                    label: 'nfe',
                    kind: 'SOURCE_GROUP',
                    source_frequency_keys: ['nfe'],
                    source_metadata_keys: [],
                    available_in_frequency: true,
                    available_in_genotype: false,
                    shared_available: false,
                    unavailable_reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
                  },
                  {
                    id: 'metadata:EUR',
                    label: 'EUR',
                    kind: 'SOURCE_GROUP',
                    source_frequency_keys: [],
                    source_metadata_keys: ['EUR'],
                    available_in_frequency: false,
                    available_in_genotype: true,
                    shared_available: false,
                    unavailable_reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
                  },
                ],
                sex_groups: [],
                ancestry_control_redundant: false,
                ancestry_control_redundancy_reason: 'NOT_SOLE_ANCESTRY_STRATUM',
                available_color_dimensions: [],
                allele_color_dimensions: ['ANCESTRY'],
                genotype_color_dimensions: ['ANCESTRY'],
                unstratified_policy:
                  'EXPLICIT_SOURCE_UNKNOWN_SEPARATE_AND_FAIL_CLOSED_WITHOUT_COMPATIBLE_DENOMINATORS',
                vocabulary_release: null,
                vocabulary_digest: null,
                source_key_inventory_release: 'SOURCE_KEY_INVENTORY_V1',
                source_key_inventory_digest: 'a'.repeat(64),
                source_release: 'y1',
                source_run_id: 'run-hgsvc',
                metadata_source_run_id: 'metadata-hgsvc',
              },
              whole_record_allele_landscape: {
                stratified_view: {
                  status: 'AVAILABLE',
                  ancestry_filter_id: null,
                  sex_filter_id: 'XX',
                  color_dimension: 'SEX',
                  filtered_called_alleles: 2,
                  allele_counts: [{ allele_id: 'source~1', called_alleles: 2 }],
                  bins: [
                    {
                      delta: 0,
                      called_alleles: 2,
                      segments: [
                        {
                          group_id: 'XX',
                          label: 'XX',
                          kind: 'SOURCE_GROUP',
                          called_alleles: 2,
                        },
                      ],
                    },
                  ],
                },
              },
            }),
          },
        },
      }),
    })
    const result = await graphql({
      schema: executionSchema,
      source: `{
        locus {
          filter_contract {
            status reason ancestry_mapping_status vocabulary_release vocabulary_digest
            source_key_inventory_release source_key_inventory_digest metadata_source_run_id
            ancestry_groups { id source_frequency_keys source_metadata_keys shared_available }
          }
          whole_record_allele_landscape {
            stratified_view {
              status reason sex_filter_id color_dimension filtered_called_alleles
              allele_counts { allele_id called_alleles }
              bins { called_alleles segments { group_id kind called_alleles } }
            }
          }
        }
      }`,
    })
    expect(result.errors).toBeUndefined()
    expect(result.data).toMatchObject({
      locus: {
        filter_contract: {
          status: 'PARTIAL',
          reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
          ancestry_mapping_status: 'UNAVAILABLE_PENDING_OWNER_APPROVAL',
          ancestry_groups: [
            { id: 'frequency:nfe', source_frequency_keys: ['nfe'], source_metadata_keys: [] },
            { id: 'metadata:EUR', source_frequency_keys: [], source_metadata_keys: ['EUR'] },
          ],
        },
        whole_record_allele_landscape: {
          stratified_view: {
            status: 'AVAILABLE',
            sex_filter_id: 'XX',
            color_dimension: 'SEX',
            bins: [
              {
                called_alleles: 2,
                segments: [{ group_id: 'XX', kind: 'SOURCE_GROUP', called_alleles: 2 }],
              },
            ],
          },
        },
      },
    })
  })

  test('accepts the bounded short-read to LR reference connection query', () => {
    expect(validate(schema, parse(longReadTrReferenceQuery))).toEqual([])
  })

  test('accepts and explicitly costs the lazy exact-context short-read distribution query', () => {
    expect(validate(schema, parse(longReadTrShortReadDistributionsQuery))).toEqual([])
    const field: any = schema
      .getQueryType()
      .getFields().long_read_tandem_repeat_short_read_distributions
    const cost = field.astNode.directives.find((directive: any) => directive.name.value === 'cost')
    expect(cost.arguments[0].value.value).toBe('5')
  })

  test('rejects GraphQL alias amplification around the bounded distribution response', () => {
    const repeatedNestedList = longReadTrShortReadDistributionsQuery.replace(
      'distributions {\n          ancestry_group sex repunit quality_description q_score',
      'first: distributions { ancestry_group }\n        second: distributions {\n          ancestry_group sex repunit quality_description q_score'
    )
    expect(
      validate(schema, parse(repeatedNestedList), [
        longReadTrShortReadDistributionSingleSelectionRule,
      ]).map((error) => error.message)
    ).toContain(
      'LongReadTrShortReadAlleleDistributionPart.distributions may be selected only once per GraphQL document'
    )

    const aliasedNestedScalar = longReadTrShortReadDistributionsQuery.replace(
      'ancestry_group sex repunit quality_description q_score',
      'copy: ancestry_group sex repunit quality_description q_score'
    )
    expect(
      validate(schema, parse(aliasedNestedScalar), [
        longReadTrShortReadDistributionSingleSelectionRule,
      ]).map((error) => error.message)
    ).toContain(
      'Aliases are not allowed inside the bounded long_read_tandem_repeat_short_read_distributions response'
    )

    const repeatedRoot = `
      query RepeatedRoot($id: String!, $cohort: LongReadCohort!) {
        first: long_read_tandem_repeat_short_read_distributions(id: $id, lr_cohort: $cohort) {
          status
        }
        second: long_read_tandem_repeat_short_read_distributions(id: $id, lr_cohort: $cohort) {
          status
        }
      }
    `
    expect(
      validate(schema, parse(repeatedRoot), [
        longReadTrShortReadDistributionSingleSelectionRule,
      ]).map((error) => error.message)
    ).toContain(
      'long_read_tandem_repeat_short_read_distributions may be selected only once per GraphQL document'
    )
  })

  test('publishes source/ALT identity through assembled-schema introspection', async () => {
    const result = await graphql({ schema, source: getIntrospectionQuery() })
    expect(result.errors).toBeUndefined()

    const types = (result.data as any).__schema.types
    const detailsType = types.find((type: any) => type.name === 'LongReadVariantDetails')
    expect(detailsType.fields.map((field: any) => field.name)).toEqual(
      expect.arrayContaining(['source_variant_id', 'alt_index', 'alt_count'])
    )

    const locusType = types.find((type: any) => type.name === 'LongReadTandemRepeatLocus')
    expect(locusType.fields.map((field: any) => field.name)).toEqual(
      expect.arrayContaining([
        'presentation',
        'bounds',
        'component_summary',
        'sequence_cardinality',
        'represented_length',
        'filter_contract',
      ])
    )

    const primaryRepeatType = types.find((type: any) => type.name === 'LongReadTrPrimaryRepeat')
    expect(primaryRepeatType.fields.map((field: any) => field.name)).toEqual(
      expect.arrayContaining([
        'status',
        'reason_code',
        'motif',
        'component_index',
        'component',
        'selection_basis',
        'biological_role',
        'catalog_id',
        'catalog_digest',
        'registry_digest',
      ])
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
