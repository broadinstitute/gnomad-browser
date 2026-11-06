#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::common::config::Dialect;
use datafusion::error::Result;
use datafusion::prelude::{SessionConfig, SessionContext};
use gnomad_data_store::{GenomicInterval, GnomadV4Reader, GnomadV4Subset, ParquetDataset};
use serde_json::json;

mod fixtures;

async fn create_synthetic_reader(rows: &str) -> Result<GnomadV4Reader> {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    let context = SessionContext::new_with_config(config);
    let table_name = ParquetDataset::GnomadVariantsV4.name();
    let query = format!(
        r#"CREATE TABLE {table_name} AS
        WITH inputs AS (
            SELECT * FROM ({rows}) AS supplied(
                variant_id, chromosome, position, exome_raw, non_ukb_raw, genome_raw, annotations
            )
        ), frequencies AS (
            SELECT *, named_struct('faf95_max', CAST(0.125 AS DOUBLE)) AS fafmax,
                named_struct('ac', CAST(11 AS INT), 'ac_raw', CAST(exome_raw AS INT),
                    'an', CAST(100 AS INT), 'homozygote_count', CAST(4294967300 AS BIGINT),
                    'ancestry_groups', [named_struct('id', 'XX', 'ac', CAST(0 AS INT))]) AS frequency
            FROM inputs
        )
        SELECT chromosome AS chrom, CAST((position - 1) / 1000000 AS BIGINT) AS posbin,
            CAST(position AS INT) AS pos, 'A' AS "ref", variant_id AS alt,
            CAST([] AS VARCHAR[]) AS rsids,
            named_struct(
                'freq', named_struct('all', frequency,
                    'non_ukb', named_struct('ac', CAST(3 AS INT), 'ac_raw', CAST(non_ukb_raw AS INT))),
                'filters', CAST(NULL AS VARCHAR[]), 'flags', CAST([] AS VARCHAR[]),
                'fafmax', named_struct('gnomad', fafmax, 'non_ukb', fafmax)
            ) AS exome,
            named_struct('freq', named_struct('all', named_struct('ac_raw', CAST(genome_raw AS INT))),
                'filters', CAST([] AS VARCHAR[]), 'flags', ['source-genome-flag']) AS genome,
            named_struct('freq', named_struct('all', frequency), 'fafmax', fafmax) AS joint,
            CASE WHEN annotations = 'null' THEN NULL
                 WHEN annotations = 'empty' THEN []
                 ELSE [named_struct('gene_id', 'source-refseq', 'transcript_id', 'NM_source'),
                       named_struct('gene_id', 'ENSG002', 'transcript_id', 'ENST002'),
                       named_struct('gene_id', 'ENSG001', 'transcript_id', 'ENST001')]
            END AS transcript_consequences,
            named_struct('cadd', named_struct('phred', CAST(0 AS FLOAT)),
                'spliceai_ds_max', CAST(0 AS FLOAT)) AS in_silico_predictors
        FROM frequencies"#
    );
    context.sql(&query).await?.collect().await?;
    Ok(GnomadV4Reader::new(context))
}

#[tokio::test]
async fn reads_real_parquet_boundaries_and_multiple_alleles() -> Result<()> {
    let reader = GnomadV4Reader::open(fixtures::root_directory()).await?;
    let interval = GenomicInterval::new("22", 37_010_956, 37_010_958).expect("valid interval");
    let variants = reader
        .fetch_variants_in_region(&interval, GnomadV4Subset::All)
        .await?;
    assert_eq!(
        variants
            .iter()
            .map(|variant| variant.variant_id.as_str())
            .collect::<Vec<_>>(),
        [
            "22-37010956-G-T",
            "22-37010957-G-T",
            "22-37010958-T-A",
            "22-37010958-T-TA"
        ]
    );
    let variant = variants.first().expect("first fixture variant");
    assert_eq!(variant.locus.contig, "chr22");
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
    assert_eq!(variant.transcript_consequences.len(), 5);
    assert!(variant.flags.is_none());
    assert!(variant.joint.filters.is_none());
    Ok(())
}

#[tokio::test]
async fn reads_real_parquet_non_ukb_without_changing_genome_and_joint_cohorts() -> Result<()> {
    let reader = GnomadV4Reader::open(fixtures::root_directory()).await?;
    let interval = GenomicInterval::new("22", 37_010_958, 37_010_958).expect("single base");
    let variants = reader
        .fetch_variants_in_region(&interval, GnomadV4Subset::NonUkb)
        .await?;
    assert_eq!(variants.len(), 2);
    let variant = variants.last().expect("insertion fixture");
    assert_eq!(variant.variant_id, "22-37010958-T-TA");
    assert!(variant.exome.freq.all.is_none());
    assert_eq!(
        variant
            .exome
            .freq
            .non_ukb
            .as_ref()
            .expect("non-UKB frequency")
            .ac_raw,
        Some(5)
    );
    assert!(variant.genome.freq.all.is_some());
    assert!(variant.joint.freq.all.is_some());
    assert!(variant.joint.freq.non_ukb.is_none());
    Ok(())
}

#[tokio::test]
async fn uses_inclusive_unpadded_bounds_and_numeric_position_then_id_order() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES ('before', '22', 99, 1, 1, 1, 'present'),
            ('z-start', '22', 100, 1, 1, 1, 'present'),
            ('a-start', '22', 100, 1, 1, 1, 'present'),
            ('stop', '22', 200, 1, 1, 1, 'present'),
            ('after', '22', 201, 1, 1, 1, 'present'),
            ('other-chromosome', '1', 100, 1, 1, 1, 'present')",
    )
    .await?;
    let interval = GenomicInterval::new("22", 100, 200).expect("valid interval");
    let variants = reader
        .fetch_variants_in_region(&interval, GnomadV4Subset::All)
        .await?;
    assert_eq!(
        variants
            .iter()
            .map(|variant| variant.variant_id.splitn(4, '-').last().unwrap_or_default())
            .collect::<Vec<_>>(),
        ["a-start", "z-start", "stop"]
    );
    Ok(())
}

#[tokio::test]
async fn includes_intergenic_records_with_null_or_empty_consequences() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES ('missing', '22', 100, 1, 1, 1, 'null'),
            ('empty', '22', 100, 1, 1, 1, 'empty')",
    )
    .await?;
    let interval = GenomicInterval::new("22", 100, 100).expect("single base");
    let variants = reader
        .fetch_variants_in_region(&interval, GnomadV4Subset::All)
        .await?;
    assert_eq!(variants.len(), 2);
    assert!(
        variants
            .iter()
            .all(|variant| variant.transcript_consequences.is_empty())
    );
    Ok(())
}

#[tokio::test]
async fn preserves_all_consequences_and_source_values_without_api_shaping() -> Result<()> {
    let reader =
        create_synthetic_reader("VALUES ('source', '22', 100, 13, 5, 9, 'present')").await?;
    let interval = GenomicInterval::new("22", 100, 100).expect("single base");
    let variants = reader
        .fetch_variants_in_region(&interval, GnomadV4Subset::All)
        .await?;
    let value =
        serde_json::to_value(variants.first().expect("source variant")).expect("serialize variant");
    for (pointer, expected) in [
        ("/exome/freq/all/homozygote_count", json!(4_294_967_300_i64)),
        ("/exome/freq/all/ancestry_groups/0/id", json!("XX")),
        ("/rsids", json!([])),
        ("/exome/flags", json!([])),
        ("/genome/filters", json!([])),
        ("/genome/flags", json!(["source-genome-flag"])),
        ("/in_silico_predictors/cadd/phred", json!(0.0)),
        (
            "/transcript_consequences/0/transcript_id",
            json!("NM_source"),
        ),
        ("/transcript_consequences/1/gene_id", json!("ENSG002")),
        ("/transcript_consequences/2/gene_id", json!("ENSG001")),
    ] {
        assert_eq!(value.pointer(pointer), Some(&expected), "{pointer}");
    }
    for pointer in [
        "/flags",
        "/exome/filters",
        "/joint/filters",
        "/chrom",
        "/transcript_consequence",
    ] {
        assert!(value.pointer(pointer).is_none(), "{pointer}");
    }
    Ok(())
}

#[tokio::test]
async fn projects_only_the_selected_exome_frequency() -> Result<()> {
    let reader =
        create_synthetic_reader("VALUES ('source', '22', 100, 13, 5, 9, 'present')").await?;
    let interval = GenomicInterval::new("22", 100, 100).expect("single base");
    for subset in [GnomadV4Subset::All, GnomadV4Subset::NonUkb] {
        let variants = reader.fetch_variants_in_region(&interval, subset).await?;
        let variant = variants.first().expect("source variant");
        match subset {
            GnomadV4Subset::All => {
                assert_eq!(
                    variant
                        .exome
                        .freq
                        .all
                        .as_ref()
                        .expect("all frequency")
                        .ac_raw,
                    Some(13)
                );
                assert!(variant.exome.freq.non_ukb.is_none());
            }
            GnomadV4Subset::NonUkb => {
                assert_eq!(
                    variant
                        .exome
                        .freq
                        .non_ukb
                        .as_ref()
                        .expect("non-UKB frequency")
                        .ac_raw,
                    Some(5)
                );
                assert!(variant.exome.freq.all.is_none());
            }
        }
        assert_eq!(
            variant
                .genome
                .freq
                .all
                .as_ref()
                .expect("genome frequency")
                .ac_raw,
            Some(9)
        );
        assert_eq!(
            variant
                .joint
                .freq
                .all
                .as_ref()
                .expect("joint frequency")
                .ac_raw,
            Some(13)
        );
    }
    Ok(())
}

#[tokio::test]
async fn returns_zero_and_missing_raw_frequency_records_for_api_filtering() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES ('missing', '22', 100, NULL, NULL, NULL, 'empty'),
            ('zero', '22', 101, 0, 0, 0, 'empty')",
    )
    .await?;
    let interval = GenomicInterval::new("22", 100, 101).expect("valid interval");
    for subset in [GnomadV4Subset::All, GnomadV4Subset::NonUkb] {
        let variants = reader.fetch_variants_in_region(&interval, subset).await?;
        assert_eq!(variants.len(), 2);
        assert_eq!(
            variants
                .first()
                .expect("missing-frequency variant")
                .genome
                .freq
                .all
                .as_ref()
                .expect("genome object")
                .ac_raw,
            None
        );
        assert_eq!(
            variants
                .last()
                .expect("zero-frequency variant")
                .genome
                .freq
                .all
                .as_ref()
                .expect("genome object")
                .ac_raw,
            Some(0)
        );
    }
    Ok(())
}

#[tokio::test]
async fn returns_no_records_for_absent_intervals_and_chromosomes() -> Result<()> {
    let reader =
        create_synthetic_reader("VALUES ('source', '22', 100, 1, 1, 1, 'present')").await?;
    for interval in [
        GenomicInterval::new("22", 101, 200).expect("absent interval"),
        GenomicInterval::new("1", 100, 100).expect("absent chromosome"),
    ] {
        assert!(
            reader
                .fetch_variants_in_region(&interval, GnomadV4Subset::All)
                .await?
                .is_empty()
        );
    }
    Ok(())
}

#[tokio::test]
async fn returns_more_than_thirty_thousand_records_without_truncation() -> Result<()> {
    let reader = create_synthetic_reader(
        "SELECT concat('dense-', value) AS variant_id, '22' AS chromosome, value AS position,
             1 AS exome_raw, 1 AS non_ukb_raw, 1 AS genome_raw, 'empty' AS annotations
         FROM generate_series(1, 30001) AS positions(value)",
    )
    .await?;
    let interval = GenomicInterval::new("22", 1, 30_001).expect("dense interval");
    let variants = reader
        .fetch_variants_in_region(&interval, GnomadV4Subset::All)
        .await?;
    assert_eq!(variants.len(), 30_001);
    assert_eq!(variants.first().expect("first position").locus.position, 1);
    assert_eq!(
        variants.last().expect("last position").locus.position,
        30_001
    );
    Ok(())
}

#[tokio::test]
async fn propagates_query_failures_instead_of_returning_an_empty_region() {
    let reader = GnomadV4Reader::new(SessionContext::new());
    let interval = GenomicInterval::new("22", 100, 100).expect("single base");
    assert!(
        reader
            .fetch_variants_in_region(&interval, GnomadV4Subset::All)
            .await
            .is_err()
    );
}
