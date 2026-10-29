#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::common::config::Dialect;
use datafusion::error::Result;
use datafusion::prelude::{SessionConfig, SessionContext};
use gnomad_data_store::{
    ClinvarReader, ClinvarVariantListEntry, GenomicInterval, ParquetDataset,
    create_datafusion_context_from_root,
};

mod fixtures;

const NO_LIMIT: usize = 1_000;

/// Supply rows as (`variant_id`, `chromosome`, `position`, `annotation_state`). A `populated`
/// variant has gnomAD data and a non-Ensembl consequence before an Ensembl one; an `empty`
/// variant has neither gnomAD data nor consequences.
async fn create_synthetic_reader(variant_rows: &str) -> Result<ClinvarReader> {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    let context = SessionContext::new_with_config(config);
    let table_name = ParquetDataset::ClinvarVariantsGrch38.name();
    let query = format!(
        r#"
        CREATE TABLE {table_name} AS
        SELECT
            variant_id,
            'GRCh38' AS reference_genome,
            chromosome AS chrom,
            CAST(position AS INT) AS pos,
            'A' AS ref,
            'G' AS alt,
            concat('variation-', variant_id) AS clinvar_variation_id,
            'Pathogenic' AS clinical_significance,
            'reviewed by expert panel' AS review_status,
            CAST(3 AS INT) AS gold_stars,
            annotation_state = 'populated' AS in_gnomad,
            CASE WHEN annotation_state = 'populated' THEN CAST(3 AS INT) END AS "gnomad.exome.ac",
            CASE WHEN annotation_state = 'populated' THEN CAST(1000 AS INT) END AS "gnomad.exome.an",
            CASE WHEN annotation_state = 'populated' THEN ['AS_VQSR'] END AS "gnomad.exome.filters",
            CASE WHEN annotation_state = 'populated' THEN CAST(5 AS INT) END AS "gnomad.genome.ac",
            CASE WHEN annotation_state = 'populated' THEN CAST(2000 AS INT) END AS "gnomad.genome.an",
            CASE WHEN annotation_state = 'populated' THEN [] END AS "gnomad.genome.filters",
            CASE WHEN annotation_state = 'populated' THEN [
                named_struct(
                    'gene_id', '1234',
                    'transcript_id', 'NM_000001.1',
                    'major_consequence', 'intron_variant',
                    'hgvsc', CAST(NULL AS VARCHAR),
                    'hgvsp', CAST(NULL AS VARCHAR)
                ),
                named_struct(
                    'gene_id', 'ENSG00000000001',
                    'transcript_id', 'ENST00000000001',
                    'major_consequence', 'missense_variant',
                    'hgvsc', 'c.1A>G',
                    'hgvsp', 'p.Met1Val'
                )
            ] ELSE [] END AS transcript_consequences
        FROM ({variant_rows}) AS supplied(variant_id, chromosome, position, annotation_state)
        "#
    );
    context.sql(&query).await?.collect().await?;
    Ok(ClinvarReader::new(context))
}

fn variant_ids(variants: &[ClinvarVariantListEntry]) -> Vec<&str> {
    variants
        .iter()
        .map(|variant| variant.variant_id.as_str())
        .collect()
}

#[tokio::test]
async fn includes_both_boundaries_and_excludes_positions_outside() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('1-99-A-G', '1', 99, 'empty'),
            ('1-100-A-G', '1', 100, 'empty'),
            ('1-150-A-G', '1', 150, 'empty'),
            ('1-200-A-G', '1', 200, 'empty'),
            ('1-201-A-G', '1', 201, 'empty')",
    )
    .await?;

    let variants = reader
        .fetch_variants_in_region(
            &GenomicInterval::new("1", 100, 200).expect("valid interval"),
            NO_LIMIT,
        )
        .await?;

    assert_eq!(
        variant_ids(&variants),
        ["1-100-A-G", "1-150-A-G", "1-200-A-G"]
    );
    Ok(())
}

#[tokio::test]
async fn excludes_other_chromosomes() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('1-100-A-G', '1', 100, 'empty'),
            ('2-100-A-G', '2', 100, 'empty')",
    )
    .await?;

    let variants = reader
        .fetch_variants_in_region(
            &GenomicInterval::new("2", 100, 100).expect("valid interval"),
            NO_LIMIT,
        )
        .await?;

    assert_eq!(variant_ids(&variants), ["2-100-A-G"]);
    assert_eq!(
        variants.first().map(|variant| variant.chromosome.as_str()),
        Some("2")
    );
    Ok(())
}

#[tokio::test]
async fn orders_by_position_then_variant_id() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('1-300-A-G', '1', 300, 'empty'),
            ('1-100-A-T', '1', 100, 'empty'),
            ('1-100-A-C', '1', 100, 'empty'),
            ('1-200-A-G', '1', 200, 'empty')",
    )
    .await?;

    let variants = reader
        .fetch_variants_in_region(
            &GenomicInterval::new("1", 1, 1000).expect("valid interval"),
            NO_LIMIT,
        )
        .await?;

    assert_eq!(
        variant_ids(&variants),
        ["1-100-A-C", "1-100-A-T", "1-200-A-G", "1-300-A-G"]
    );
    Ok(())
}

#[tokio::test]
async fn returns_at_most_the_limit_in_order() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('1-300-A-G', '1', 300, 'empty'),
            ('1-100-A-G', '1', 100, 'empty'),
            ('1-200-A-G', '1', 200, 'empty')",
    )
    .await?;

    let variants = reader
        .fetch_variants_in_region(
            &GenomicInterval::new("1", 1, 1000).expect("valid interval"),
            2,
        )
        .await?;

    assert_eq!(variant_ids(&variants), ["1-100-A-G", "1-200-A-G"]);
    Ok(())
}

#[tokio::test]
async fn counts_every_variant_in_the_interval_on_its_chromosome() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('1-99-A-G', '1', 99, 'empty'),
            ('1-100-A-G', '1', 100, 'empty'),
            ('1-200-A-G', '1', 200, 'populated'),
            ('1-201-A-G', '1', 201, 'empty'),
            ('2-150-A-G', '2', 150, 'empty')",
    )
    .await?;

    let count = reader
        .count_variants_in_region(&GenomicInterval::new("1", 100, 200).expect("valid interval"))
        .await?;

    assert_eq!(count, 2);
    Ok(())
}

#[tokio::test]
async fn returns_no_variants_for_an_empty_interval() -> Result<()> {
    let reader = create_synthetic_reader("VALUES ('1-100-A-G', '1', 100, 'empty')").await?;

    let variants = reader
        .fetch_variants_in_region(
            &GenomicInterval::new("1", 101, 200).expect("valid interval"),
            NO_LIMIT,
        )
        .await?;

    assert!(variants.is_empty(), "unexpected variants: {variants:?}");
    Ok(())
}

#[tokio::test]
async fn selects_the_first_ensembl_consequence_and_decodes_gnomad_data() -> Result<()> {
    let reader = create_synthetic_reader("VALUES ('1-100-A-G', '1', 100, 'populated')").await?;

    let variants = reader
        .fetch_variants_in_region(
            &GenomicInterval::new("1", 100, 100).expect("valid interval"),
            NO_LIMIT,
        )
        .await?;

    let variant = variants.first().expect("supplied variant should exist");
    assert!(variant.in_gnomad);
    let consequence = variant
        .transcript_consequence
        .as_ref()
        .expect("Ensembl consequence should be selected");
    assert_eq!(
        consequence.transcript_id.as_deref(),
        Some("ENST00000000001")
    );
    assert_eq!(
        consequence.major_consequence.as_deref(),
        Some("missense_variant")
    );
    assert_eq!(consequence.hgvsc.as_deref(), Some("c.1A>G"));
    assert_eq!(consequence.hgvsp.as_deref(), Some("p.Met1Val"));

    let exome = variant
        .gnomad
        .exome
        .as_ref()
        .expect("exome data should exist");
    assert_eq!((exome.ac, exome.an), (3, 1000));
    assert_eq!(exome.filters, ["AS_VQSR"]);
    let genome = variant
        .gnomad
        .genome
        .as_ref()
        .expect("genome data should exist");
    assert_eq!((genome.ac, genome.an), (5, 2000));
    assert_eq!(genome.filters, Vec::<String>::new());
    Ok(())
}

#[tokio::test]
async fn decodes_variants_without_consequences_or_gnomad_data() -> Result<()> {
    let reader = create_synthetic_reader("VALUES ('1-100-A-G', '1', 100, 'empty')").await?;

    let variants = reader
        .fetch_variants_in_region(
            &GenomicInterval::new("1", 100, 100).expect("valid interval"),
            NO_LIMIT,
        )
        .await?;

    let variant = variants.first().expect("supplied variant should exist");
    assert!(!variant.in_gnomad);
    assert!(variant.transcript_consequence.is_none());
    assert!(variant.gnomad.exome.is_none());
    assert!(variant.gnomad.genome.is_none());
    Ok(())
}

#[tokio::test]
async fn query_failure_is_not_reported_as_an_empty_region() {
    let reader = ClinvarReader::new(SessionContext::new());
    assert!(
        reader
            .fetch_variants_in_region(
                &GenomicInterval::new("1", 1, 100).expect("valid interval"),
                NO_LIMIT
            )
            .await
            .is_err()
    );
}

#[tokio::test]
async fn reads_a_region_from_the_real_export() -> Result<()> {
    let context = create_datafusion_context_from_root(
        fixtures::root_directory(),
        ParquetDataset::ClinvarVariantsGrch38,
    )
    .await?;
    let reader = ClinvarReader::new(context);

    let variants = reader
        .fetch_variants_in_region(
            &GenomicInterval::new("2", 1_456_298, 1_456_298).expect("valid interval"),
            NO_LIMIT,
        )
        .await?;

    assert!(!variants.is_empty());
    assert!(variants.iter().all(|variant| variant.chromosome == "2"));
    Ok(())
}
