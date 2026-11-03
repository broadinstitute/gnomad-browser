#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::common::config::Dialect;
use datafusion::error::Result;
use datafusion::prelude::{SessionConfig, SessionContext};
use gnomad_data_store::{GnomadV4Reader, ParquetDataset};
use serde_json::json;

mod fixtures;

async fn create_synthetic_context(rows: &str) -> Result<SessionContext> {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    let context = SessionContext::new_with_config(config);
    let table_name = ParquetDataset::GnomadVariantsV4.name();
    let query = format!(
        r#"
        CREATE TABLE {table_name} AS
        WITH inputs AS (
            SELECT * FROM ({rows}) AS supplied(variant_id, chromosome, position, rsids, allele_id)
        ), annotations AS (
            SELECT *,
                named_struct('ac', CAST(0 AS INT), 'ac_raw', CAST(2 AS INT),
                    'an', CAST(100 AS INT), 'homozygote_count', CAST(4294967300 AS BIGINT),
                    'ancestry_groups', [named_struct('id', 'XX', 'ac', CAST(0 AS INT))]) AS frequency,
                named_struct('faf95_max', CAST(0.125 AS DOUBLE)) AS fafmax,
                named_struct('grpmax', CAST(0.25 AS DOUBLE), 'grpmax_gen_anc', 'supplied-pop') AS faf,
                named_struct('bin_edges', [CAST(0 AS DOUBLE), CAST(10 AS DOUBLE)],
                    'bin_freq', [CAST(4294967301 AS BIGINT)],
                    'n_smaller', CAST(0 AS BIGINT), 'n_larger', CAST(2 AS BIGINT)) AS histogram
            FROM inputs
        ), metrics AS (
            SELECT *, named_struct('alt_adj', histogram, 'alt_raw', histogram,
                'all_adj', histogram, 'all_raw', histogram) AS quality_histograms
            FROM annotations
        ), details AS (
            SELECT *, named_struct(
                'allele_balance', quality_histograms,
                'genotype_depth', quality_histograms,
                'genotype_quality', quality_histograms,
                'site_quality_metrics', [named_struct('metric', 'source-metric', 'value', CAST(-1.25 AS DOUBLE))]
            ) AS quality_metrics
            FROM metrics
        )
        SELECT variant_id, concat('chr', chromosome) AS "locus.contig",
            named_struct('contig', concat('chr', chromosome), 'position', CAST(position AS INT)) AS locus,
            ['A', 'G'] AS alleles, rsids,
            named_struct(
                'freq', named_struct('all', frequency, 'non_ukb', named_struct('ac_raw', CAST(0 AS INT))),
                'filters', ['source-filter'], 'flags', ['source-flag'],
                'fafmax', named_struct('gnomad', fafmax, 'non_ukb', fafmax),
                'faf95', faf, 'faf99', faf,
                'age_distribution', named_struct('het', histogram, 'hom', histogram),
                'quality_metrics', quality_metrics
            ) AS exome,
            named_struct(
                'freq', named_struct('all', frequency, 'hgdp', named_struct('ac_raw', CAST(3 AS INT)),
                    'tgp', named_struct('ac_raw', CAST(4 AS INT))),
                'filters', CAST(NULL AS VARCHAR[]), 'flags', CAST([] AS VARCHAR[]),
                'fafmax', fafmax, 'faf95', faf, 'faf99', faf,
                'age_distribution', named_struct('het', histogram, 'hom', histogram),
                'quality_metrics', quality_metrics
            ) AS genome,
            named_struct(
                'freq', named_struct('all', frequency), 'fafmax', fafmax,
                'flags', ['joint-source-flag'],
                'freq_comparison_stats', named_struct(
                    'contingency_table_test', [named_struct('p_value', CAST(0.5 AS DOUBLE), 'odds_ratio', CAST(2 AS DOUBLE))],
                    'cochran_mantel_haenszel_test', named_struct('p_value', CAST(0.25 AS DOUBLE), 'chisq', CAST(3 AS DOUBLE)),
                    'stat_union', named_struct('p_value', CAST(0.125 AS DOUBLE),
                        'stat_test_name', 'supplied-test', 'gen_ancs', ['pop-b', 'pop-a'])
                )
            ) AS joint,
            [named_struct('gene_id', 'ENSG002', 'transcript_id', 'ENST002'),
             named_struct('gene_id', 'ENSG001', 'transcript_id', 'ENST001')] AS transcript_consequences,
            named_struct('cadd', named_struct('phred', CAST(0 AS FLOAT))) AS in_silico_predictors,
            named_struct('all', ['all-colocated'], 'non_ukb', CAST([] AS VARCHAR[]),
                'hgdp', CAST(NULL AS VARCHAR[]), 'tgp', ['tgp-colocated']) AS colocated_variants,
            named_struct('exome', named_struct('mean', CAST(12.5 AS DOUBLE),
                'median_approx', CAST(12 AS INT), 'total_DP', CAST(4294967302 AS BIGINT)),
                'genome', named_struct('over_10', CAST(0.5 AS FLOAT))) AS coverage,
            CAST(NULL AS VARCHAR) AS caid,
            named_struct('ref', named_struct('allele_id', 'ga4gh:reference'),
                'alt', named_struct('allele_id', allele_id, 'start', CAST(99 AS INT),
                    'end', CAST(100 AS INT), 'state', 'G',
                    'repeat_subunit_lengths', CAST(7 AS INT))) AS vrs
        FROM details
        "#
    );
    context.sql(&query).await?.collect().await?;
    Ok(context)
}

async fn create_synthetic_reader(rows: &str) -> Result<GnomadV4Reader> {
    Ok(GnomadV4Reader::new(create_synthetic_context(rows).await?))
}

const SINGLE_ROW: &str = "VALUES ('1-100-A-G', '1', 100, ['rs123'], 'ga4gh:VA.test')";

#[tokio::test]
async fn reads_real_parquet_details_and_both_exome_subsets() -> Result<()> {
    let reader = GnomadV4Reader::open(fixtures::root_directory()).await?;
    let variant = reader
        .fetch_single_variant("22-37010956-G-T")
        .await?
        .expect("fixture variant exists");
    assert_eq!(variant.variant_id, "22-37010956-G-T");
    assert_eq!(variant.locus.contig, "chr22");
    assert_eq!(variant.locus.position, 37_010_956);
    assert_eq!(variant.alleles, ["G", "T"]);
    assert_eq!(
        variant
            .exome
            .freq
            .all
            .as_ref()
            .expect("all frequency")
            .ac_raw,
        Some(2)
    );
    assert!(variant.exome.freq.non_ukb.is_some());
    assert_eq!(
        variant
            .transcript_consequences
            .as_ref()
            .expect("consequences")
            .len(),
        5
    );
    assert!(variant.exome.quality_metrics.is_some());
    assert!(variant.exome.age_distribution.is_some());
    let vrs = variant.vrs.as_ref().expect("fixture VRS alleles");
    assert_eq!(
        vrs.reference
            .as_ref()
            .expect("reference allele")
            .repeat_subunit_length,
        Some(1)
    );
    assert_eq!(
        vrs.alt
            .as_ref()
            .expect("alternate allele")
            .repeat_subunit_length,
        None
    );
    let value = serde_json::to_value(variant).expect("serialize fixture record");
    assert_eq!(
        value.pointer("/vrs/ref/repeat_subunit_length"),
        Some(&json!(1))
    );
    assert!(value.pointer("/vrs/ref/repeat_subunit_lengths").is_none());
    assert!(value.pointer("/vrs/alt/repeat_subunit_length").is_none());
    assert_eq!(
        value.pointer("/coverage/exome/total_DP"),
        Some(&json!(18_566_717))
    );
    assert_eq!(
        value.pointer("/coverage/genome/median_approx"),
        Some(&json!(33))
    );
    assert_eq!(
        value.pointer("/exome/age_distribution/het/bin_freq"),
        Some(&json!([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    );
    assert_eq!(
        value.pointer("/exome/quality_metrics/allele_balance/alt_raw/bin_freq"),
        Some(&json!([
            0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0
        ]))
    );
    assert!(
        value
            .pointer("/exome/quality_metrics/allele_balance/all_adj")
            .is_none()
    );
    Ok(())
}

#[tokio::test]
async fn real_parquet_supports_rsid_and_alternate_vrs_lookups() -> Result<()> {
    let reader = GnomadV4Reader::open(fixtures::root_directory()).await?;
    let variant = reader
        .fetch_single_variant("22-37010956-G-T")
        .await?
        .expect("fixture variant exists");
    let allele_id = variant
        .vrs
        .as_ref()
        .expect("VRS alleles")
        .alt
        .as_ref()
        .expect("alternate allele")
        .allele_id
        .as_deref()
        .expect("VRS ID");
    assert_eq!(
        reader
            .fetch_single_variant(allele_id)
            .await?
            .expect("VRS match")
            .variant_id,
        variant.variant_id
    );
    assert_eq!(
        reader
            .fetch_single_variant("rs1161822213")
            .await?
            .expect("rsID match")
            .variant_id,
        "22-37010958-T-A"
    );
    Ok(())
}

#[tokio::test]
async fn all_three_identifier_forms_find_one_source_record() -> Result<()> {
    let reader = create_synthetic_reader(SINGLE_ROW).await?;
    for id in ["1-100-A-G", "rs123", "ga4gh:VA.test"] {
        let variant = reader
            .fetch_single_variant(id)
            .await?
            .expect("matching variant");
        assert_eq!(variant.variant_id, "1-100-A-G");
    }
    assert!(
        reader
            .fetch_single_variant("ga4gh:reference")
            .await?
            .is_none()
    );
    Ok(())
}

#[tokio::test]
async fn vrs_repeat_length_decodes_the_plural_source_name_and_serializes_the_singular_name()
-> Result<()> {
    let reader = create_synthetic_reader(SINGLE_ROW).await?;
    let variant = reader
        .fetch_single_variant("1-100-A-G")
        .await?
        .expect("source record");
    assert_eq!(
        variant
            .vrs
            .as_ref()
            .expect("VRS alleles")
            .alt
            .as_ref()
            .expect("alternate allele")
            .repeat_subunit_length,
        Some(7)
    );
    let value = serde_json::to_value(variant).expect("serialize source record");
    assert_eq!(
        value.pointer("/vrs/alt/repeat_subunit_length"),
        Some(&json!(7))
    );
    assert!(value.pointer("/vrs/alt/repeat_subunit_lengths").is_none());
    Ok(())
}

#[tokio::test]
async fn unknown_ids_and_same_position_other_alleles_return_none() -> Result<()> {
    let reader = create_synthetic_reader(SINGLE_ROW).await?;
    for id in [
        "1-100-A-T",
        "1-101-A-G",
        "2-100-A-G",
        "rs999",
        "ga4gh:VA.absent",
    ] {
        assert!(reader.fetch_single_variant(id).await?.is_none(), "{id}");
    }
    Ok(())
}

#[tokio::test]
async fn duplicate_records_and_ambiguous_rsid_or_vrs_ids_are_errors() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES ('1-100-A-G', '1', 100, ['rs123'], 'ga4gh:VA.shared'),
                ('1-100-A-G', '1', 100, ['rs123'], 'ga4gh:VA.shared'),
                ('1-100-A-T', '1', 100, ['rs123'], 'ga4gh:VA.shared')",
    )
    .await?;
    for id in ["1-100-A-G", "rs123", "ga4gh:VA.shared"] {
        let error = reader
            .fetch_single_variant(id)
            .await
            .expect_err("ambiguous ID");
        assert!(error.to_string().contains("Multiple gnomAD v4 records"));
        assert!(error.to_string().contains(id));
    }
    Ok(())
}

#[tokio::test]
async fn malformed_ids_fail_before_query_planning() {
    let reader = GnomadV4Reader::new(SessionContext::new());
    for id in [
        "",
        " \t",
        "rs",
        "rsabc",
        "ga4gh:",
        "1-0-A-G",
        "1-2147483648-A-G",
        "chr1-100-A-G",
        "23-100-A-G",
        "1-100--G",
        "1-100-A-Z",
        "1-100-A-G-extra",
        "1-100-A-G' OR true --",
    ] {
        let error = reader
            .fetch_single_variant(id)
            .await
            .expect_err("invalid ID");
        assert!(
            error.to_string().contains("Invalid gnomAD v4 variant ID"),
            "{id}: {error}"
        );
    }
}

#[tokio::test]
async fn lookup_values_are_bound_not_interpolated() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES ('1-100-A-G', '1', 100, ['rs123'], 'ga4gh:VA.''OR(true)--')",
    )
    .await?;
    assert_eq!(
        reader
            .fetch_single_variant("ga4gh:VA.'OR(true)--")
            .await?
            .expect("literal VRS value")
            .variant_id,
        "1-100-A-G"
    );
    assert!(
        reader
            .fetch_single_variant("ga4gh:VA.'OR(false)--")
            .await?
            .is_none()
    );
    Ok(())
}

#[tokio::test]
async fn preserves_details_without_subset_filtering_or_api_shaping() -> Result<()> {
    let reader = create_synthetic_reader(SINGLE_ROW).await?;
    let variant = reader
        .fetch_single_variant("1-100-A-G")
        .await?
        .expect("source record");
    let value = serde_json::to_value(variant).expect("serialize source record");
    for (pointer, expected) in [
        ("/exome/freq/all/ac", json!(0)),
        ("/exome/freq/all/ac_raw", json!(2)),
        ("/exome/freq/non_ukb/ac_raw", json!(0)),
        ("/exome/freq/all/homozygote_count", json!(4_294_967_300_i64)),
        ("/exome/freq/all/ancestry_groups/0/id", json!("XX")),
        ("/genome/freq/hgdp/ac_raw", json!(3)),
        ("/genome/freq/tgp/ac_raw", json!(4)),
        ("/genome/flags", json!([])),
        ("/joint/flags", json!(["joint-source-flag"])),
        ("/exome/filters", json!(["source-filter"])),
        ("/exome/faf95/grpmax", json!(0.25)),
        (
            "/exome/age_distribution/het/bin_freq",
            json!([4_294_967_301_i64]),
        ),
        (
            "/exome/quality_metrics/genotype_depth/alt_raw/n_larger",
            json!(2),
        ),
        (
            "/exome/quality_metrics/site_quality_metrics/0/value",
            json!(-1.25),
        ),
        (
            "/joint/freq_comparison_stats/stat_union/gen_ancs",
            json!(["pop-b", "pop-a"]),
        ),
        ("/colocated_variants/all", json!(["all-colocated"])),
        ("/colocated_variants/non_ukb", json!([])),
        ("/coverage/exome/total_DP", json!(4_294_967_302_i64)),
        ("/coverage/genome/over_10", json!(0.5)),
        ("/in_silico_predictors/cadd/phred", json!(0.0)),
        ("/transcript_consequences/0/gene_id", json!("ENSG002")),
        ("/transcript_consequences/1/gene_id", json!("ENSG001")),
        ("/vrs/alt/start", json!(99)),
    ] {
        assert_eq!(value.pointer(pointer), Some(&expected), "{pointer}");
    }
    for pointer in [
        "/flags",
        "/genome/filters",
        "/colocated_variants/hgdp",
        "/caid",
        "/joint/freq/non_ukb",
        "/exome/freq/all/af",
    ] {
        assert!(value.pointer(pointer).is_none(), "{pointer}");
    }
    Ok(())
}

#[tokio::test]
async fn null_optional_details_remain_absent_and_do_not_hide_the_variant() -> Result<()> {
    let context = create_synthetic_context(SINGLE_ROW).await?;
    let table_name = ParquetDataset::GnomadVariantsV4.name();
    context
        .sql(&format!(
            "CREATE TABLE missing_details AS SELECT * REPLACE (
            CAST(NULL AS VARCHAR[]) AS rsids,
            NULL AS transcript_consequences,
            NULL AS vrs,
            named_struct('freq', exome.freq, 'filters', exome.filters, 'flags', exome.flags,
                'fafmax', exome.fafmax, 'faf95', NULL, 'faf99', NULL,
                'age_distribution', NULL, 'quality_metrics', NULL) AS exome
        ) FROM {table_name}"
        ))
        .await?
        .collect()
        .await?;
    let missing = context.table_provider("missing_details").await?;
    context.deregister_table(table_name)?;
    context.register_table(table_name, missing)?;
    let reader = GnomadV4Reader::new(context);
    let variant = reader
        .fetch_single_variant("1-100-A-G")
        .await?
        .expect("source record");
    let value = serde_json::to_value(variant).expect("serialize source record");
    for pointer in [
        "/rsids",
        "/transcript_consequences",
        "/vrs",
        "/exome/faf95",
        "/exome/faf99",
        "/exome/age_distribution",
        "/exome/quality_metrics",
    ] {
        assert!(value.pointer(pointer).is_none(), "{pointer}");
    }
    assert!(reader.fetch_single_variant("rs123").await?.is_none());
    Ok(())
}

#[tokio::test]
async fn repeated_rsids_within_one_record_do_not_count_as_multiple_variants() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES ('1-100-A-G', '1', 100, ['rs123', 'rs123'], 'ga4gh:VA.test')",
    )
    .await?;
    assert_eq!(
        reader
            .fetch_single_variant("rs123")
            .await?
            .expect("one variant")
            .variant_id,
        "1-100-A-G"
    );
    Ok(())
}

#[tokio::test]
async fn query_failures_are_not_reported_as_missing_variants() {
    let reader = GnomadV4Reader::new(SessionContext::new());
    assert!(reader.fetch_single_variant("1-100-A-G").await.is_err());
}
