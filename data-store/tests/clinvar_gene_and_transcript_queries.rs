#![allow(clippy::panic_in_result_fn)]

use std::path::PathBuf;

use datafusion::common::config::Dialect;
use datafusion::error::{DataFusionError, Result};
use datafusion::prelude::{SessionConfig, SessionContext};
use gnomad_data_store::{
    ClinvarReader, ClinvarVariantListEntry, GenomicInterval, create_datafusion_context,
};

/// Supply one SQL row per consequence as (`variant_id`, `chromosome`, `position`,
/// `gene_id`, `transcript_id`, `consequence_order`).
async fn create_synthetic_reader(variant_annotations: &str) -> Result<ClinvarReader> {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    let context = SessionContext::new_with_config(config);
    let query = format!(
        r#"
        CREATE TABLE clinvar_grch38_variants AS
        SELECT
            variant_id,
            concat('chr', chromosome) AS "locus.contig",
            CAST(position AS INT) AS pos,
            'A' AS ref,
            'G' AS alt,
            'GRCh38' AS reference_genome,
            'synthetic' AS clinvar_variation_id,
            'Uncertain significance' AS clinical_significance,
            'criteria provided, single submitter' AS review_status,
            CAST(1 AS INT) AS gold_stars,
            false AS in_gnomad,
            CAST(NULL AS INT) AS "gnomad.exome.ac",
            CAST(NULL AS INT) AS "gnomad.exome.an",
            CAST(NULL AS VARCHAR[]) AS "gnomad.exome.filters",
            CAST(NULL AS INT) AS "gnomad.genome.ac",
            CAST(NULL AS INT) AS "gnomad.genome.an",
            CAST(NULL AS VARCHAR[]) AS "gnomad.genome.filters",
            array_agg(
                named_struct(
                    'gene_id', gene_id,
                    'transcript_id', transcript_id,
                    'major_consequence', 'missense_variant',
                    'hgvsc', concat('c.', CAST(position AS VARCHAR), 'A>G'),
                    'hgvsp', CAST(NULL AS VARCHAR)
                ) ORDER BY consequence_order
            ) AS transcript_consequences
        FROM ({variant_annotations}) AS annotations(
            variant_id, chromosome, position, gene_id, transcript_id, consequence_order
        )
        GROUP BY variant_id, chromosome, position
        "#
    );
    context.sql(&query).await?.collect().await?;
    Ok(ClinvarReader::new(context))
}

async fn create_parquet_reader() -> Result<ClinvarReader> {
    let path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/clinvar_grch38_variants");
    let path = path
        .to_str()
        .ok_or_else(|| DataFusionError::Execution("Fixture path is not valid UTF-8".to_owned()))?;
    let context = create_datafusion_context(path).await?;
    Ok(ClinvarReader::new(context))
}

fn collect_variant_ids(variants: &[ClinvarVariantListEntry]) -> Vec<&str> {
    variants
        .iter()
        .map(|variant| variant.variant_id.as_str())
        .collect()
}

#[tokio::test]
async fn gene_query_pads_disjoint_intervals_and_excludes_gap_records() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
            ('1-125-A-G', '1', 125, 'ENSG001', 'ENST001', 1),
            ('1-350-A-G', '1', 350, 'ENSG001', 'ENST001', 1),
            ('1-500-A-G', '1', 500, 'ENSG001', 'ENST001', 1)
        ",
    )
    .await?;
    let intervals = [
        GenomicInterval::new("1", 500, 500).expect("valid interval"),
        GenomicInterval::new("1", 200, 200).expect("valid interval"),
    ];

    let variants = reader.fetch_variants_in_gene("ENSG001", &intervals).await?;

    let variant_ids = collect_variant_ids(&variants);

    assert_eq!(variant_ids, ["1-125-A-G", "1-500-A-G"]);
    assert!(
        !variant_ids.contains(&"1-350-A-G"),
        "variant in the gap must be excluded; returned IDs: {variant_ids:?}"
    );
    Ok(())
}

#[tokio::test]
async fn gene_query_includes_padded_start_but_not_preceding_base() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
            ('1-124-A-G', '1', 124, 'ENSG001', 'ENST001', 1),
            ('1-125-A-G', '1', 125, 'ENSG001', 'ENST001', 1)
        ",
    )
    .await?;
    let intervals = [GenomicInterval::new("1", 200, 225).expect("valid interval")];

    let variants = reader.fetch_variants_in_gene("ENSG001", &intervals).await?;

    let variant_ids = collect_variant_ids(&variants);

    assert_eq!(variant_ids, ["1-125-A-G"]);
    assert!(
        !variant_ids.contains(&"1-124-A-G"),
        "position 124 is before the padded start at 125; returned IDs: {variant_ids:?}"
    );
    Ok(())
}

#[tokio::test]
async fn gene_query_excludes_variants_annotated_to_another_gene() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
            ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 1),
            ('1-110-A-G', '1', 110, 'ENSG002', 'ENST002', 1)
        ",
    )
    .await?;
    let intervals = [GenomicInterval::new("1", 100, 110).expect("valid interval")];

    let variants = reader.fetch_variants_in_gene("ENSG001", &intervals).await?;

    let variant_ids = collect_variant_ids(&variants);

    assert_eq!(variant_ids, ["1-100-A-G"]);
    assert!(
        !variant_ids.contains(&"1-110-A-G"),
        "variant annotated to ENSG002 must not match ENSG001; returned IDs: {variant_ids:?}"
    );
    Ok(())
}

#[tokio::test]
async fn gene_query_selects_requested_gene_instead_of_first_ensembl_consequence() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
            ('1-100-A-G', '1', 100, 'ENSG002', 'ENST002', 1),
            ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 2)
        ",
    )
    .await?;
    let intervals = [GenomicInterval::new("1", 100, 100).expect("valid interval")];

    let variants = reader.fetch_variants_in_gene("ENSG001", &intervals).await?;

    assert_eq!(collect_variant_ids(&variants), ["1-100-A-G"]);
    let consequence = variants
        .first()
        .and_then(|variant| variant.transcript_consequence.as_ref())
        .expect("matching gene consequence should exist");
    assert_eq!(consequence.transcript_id.as_deref(), Some("ENST001"));
    assert_ne!(
        consequence.transcript_id.as_deref(),
        Some("ENST002"),
        "the first consequence belongs to ENSG002, not the requested ENSG001"
    );
    Ok(())
}

#[tokio::test]
async fn transcript_query_requires_and_selects_the_requested_transcript() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
            ('1-100-A-G', '1', 100, 'ENSG001', 'ENST002', 1),
            ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 2),
            ('1-110-A-G', '1', 110, 'ENSG001', 'ENST002', 1)
        ",
    )
    .await?;
    let intervals = [GenomicInterval::new("1", 100, 110).expect("valid interval")];

    let variants = reader
        .fetch_variants_in_transcript("ENST001", &intervals)
        .await?;

    let variant_ids = collect_variant_ids(&variants);

    assert_eq!(variant_ids, ["1-100-A-G"]);
    assert!(
        !variant_ids.contains(&"1-110-A-G"),
        "variant annotated only to ENST002 must not match ENST001; returned IDs: {variant_ids:?}"
    );
    let consequence = variants
        .first()
        .and_then(|variant| variant.transcript_consequence.as_ref())
        .expect("matching transcript consequence should exist");
    assert_eq!(consequence.transcript_id.as_deref(), Some("ENST001"));
    assert_ne!(
        consequence.transcript_id.as_deref(),
        Some("ENST002"),
        "the first consequence is not the requested transcript ENST001"
    );
    Ok(())
}

#[tokio::test]
async fn transcript_query_uses_multiple_padded_intervals() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
            ('1-200-A-G', '1', 200, 'ENSG001', 'ENST001', 1),
            ('1-350-A-G', '1', 350, 'ENSG001', 'ENST001', 1),
            ('1-500-A-G', '1', 500, 'ENSG001', 'ENST001', 1)
        ",
    )
    .await?;
    let intervals = [
        GenomicInterval::new("1", 200, 200).expect("valid interval"),
        GenomicInterval::new("1", 500, 500).expect("valid interval"),
    ];

    let variants = reader
        .fetch_variants_in_transcript("ENST001", &intervals)
        .await?;

    let variant_ids = collect_variant_ids(&variants);

    assert_eq!(variant_ids, ["1-200-A-G", "1-500-A-G"]);
    assert!(
        !variant_ids.contains(&"1-350-A-G"),
        "variant in the gap between padded intervals must be excluded; returned IDs: {variant_ids:?}"
    );
    Ok(())
}

#[tokio::test]
async fn overlapping_exons_do_not_duplicate_variant_records() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
            ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 1),
            ('1-110-A-G', '1', 110, 'ENSG001', 'ENST001', 1)
        ",
    )
    .await?;
    let intervals = [
        GenomicInterval::new("1", 100, 100).expect("valid interval"),
        GenomicInterval::new("1", 110, 110).expect("valid interval"),
    ];

    let variants = reader.fetch_variants_in_gene("ENSG001", &intervals).await?;

    assert_eq!(collect_variant_ids(&variants), ["1-100-A-G", "1-110-A-G"]);
    Ok(())
}

#[tokio::test]
async fn annotation_membership_does_not_bypass_chromosome_filtering() -> Result<()> {
    let reader = create_synthetic_reader(
        r"VALUES
            ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 1),
            ('2-100-A-G', '2', 100, 'ENSG001', 'ENST001', 1)
        ",
    )
    .await?;
    let intervals = [GenomicInterval::new("1", 100, 100).expect("valid interval")];

    let variants = reader.fetch_variants_in_gene("ENSG001", &intervals).await?;

    let variant_ids = collect_variant_ids(&variants);

    assert_eq!(variant_ids, ["1-100-A-G"]);
    assert!(
        !variant_ids.contains(&"2-100-A-G"),
        "chromosome 2 must be excluded even with the same position and annotation; returned IDs: {variant_ids:?}"
    );
    Ok(())
}

#[tokio::test]
async fn empty_exon_input_returns_no_variants() -> Result<()> {
    let reader =
        create_synthetic_reader(r"VALUES ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 1)").await?;

    let variants = reader.fetch_variants_in_gene("ENSG001", &[]).await?;
    let variant_ids = collect_variant_ids(&variants);

    assert!(variants.is_empty(), "unexpected variants: {variants:?}");
    assert!(
        !variant_ids.contains(&"1-100-A-G"),
        "no intervals were supplied, so even an annotation match must be excluded; returned IDs: {variant_ids:?}"
    );
    Ok(())
}

#[tokio::test]
async fn unknown_transcript_returns_no_variants() -> Result<()> {
    let reader =
        create_synthetic_reader(r"VALUES ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 1)").await?;
    let intervals = [GenomicInterval::new("1", 100, 100).expect("valid interval")];

    let variants = reader
        .fetch_variants_in_transcript("ENST999", &intervals)
        .await?;
    let variant_ids = collect_variant_ids(&variants);

    assert!(variants.is_empty(), "unexpected variants: {variants:?}");
    assert!(
        !variant_ids.contains(&"1-100-A-G"),
        "variant annotated to ENST001 must not match ENST999; returned IDs: {variant_ids:?}"
    );
    Ok(())
}

#[tokio::test]
async fn intervals_without_records_return_no_variants() -> Result<()> {
    let reader =
        create_synthetic_reader(r"VALUES ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 1)").await?;
    let intervals = [GenomicInterval::new("1", 500, 500).expect("valid interval")];

    let variants = reader.fetch_variants_in_gene("ENSG001", &intervals).await?;

    let variant_ids = collect_variant_ids(&variants);

    assert!(variants.is_empty(), "unexpected variants: {variants:?}");
    assert!(
        !variant_ids.contains(&"1-100-A-G"),
        "position 100 lies outside the padded interval 425..575; returned IDs: {variant_ids:?}"
    );
    Ok(())
}

#[tokio::test]
async fn padding_overflow_is_reported_as_an_error() -> Result<()> {
    let reader =
        create_synthetic_reader(r"VALUES ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 1)").await?;
    let intervals = [GenomicInterval::new("1", i32::MAX, i32::MAX).expect("valid interval")];

    let error = reader
        .fetch_variants_in_gene("ENSG001", &intervals)
        .await
        .expect_err("padding should overflow");

    assert!(error.to_string().contains("PaddingOverflow"));
    Ok(())
}

#[tokio::test]
async fn empty_annotation_id_is_rejected() -> Result<()> {
    let reader =
        create_synthetic_reader(r"VALUES ('1-100-A-G', '1', 100, 'ENSG001', 'ENST001', 1)").await?;
    let intervals = [GenomicInterval::new("1", 100, 100).expect("valid interval")];

    let error = reader
        .fetch_variants_in_gene("", &intervals)
        .await
        .expect_err("gene ID is required");

    assert!(error.to_string().contains("gene_id must not be empty"));
    Ok(())
}

#[tokio::test]
async fn gene_query_reads_real_parquet_annotations() -> Result<()> {
    let reader = create_parquet_reader().await?;
    let intervals =
        [GenomicInterval::new("2", 1_453_592, 1_453_592).expect("valid fixture interval")];

    let variants = reader
        .fetch_variants_in_gene("ENSG00000231482", &intervals)
        .await?;

    assert_eq!(collect_variant_ids(&variants), ["2-1453592-A-G"]);
    let variant = variants.first().expect("fixture variant should exist");
    assert_eq!(variant.reference_genome, "GRCh38");
    assert_eq!(variant.chromosome, "2");
    assert_eq!(variant.position, 1_453_592);
    let consequence = variant
        .transcript_consequence
        .as_ref()
        .expect("matching gene consequence should exist");
    assert_eq!(
        consequence.transcript_id.as_deref(),
        Some("ENST00000650512")
    );
    assert_ne!(
        consequence.transcript_id.as_deref(),
        Some("ENST00000329066"),
        "the first ENSG consequence belongs to ENSG00000115705, not ENSG00000231482"
    );
    assert_eq!(
        consequence.major_consequence.as_deref(),
        Some("intron_variant")
    );
    assert_eq!(consequence.hgvsc.as_deref(), Some("n.548-35131T>C"));
    assert!(consequence.hgvsp.is_none());
    Ok(())
}

#[tokio::test]
async fn transcript_query_reads_real_parquet_annotations() -> Result<()> {
    let reader = create_parquet_reader().await?;
    let intervals =
        [GenomicInterval::new("2", 1_453_500, 1_477_400).expect("valid fixture interval")];

    let variants = reader
        .fetch_variants_in_transcript("ENST00000423320", &intervals)
        .await?;

    let variant_ids = collect_variant_ids(&variants);

    assert_eq!(variant_ids, ["2-1453592-A-G"]);
    for excluded_variant_id in [
        "2-1456298-C-G",
        "2-1456298-C-T",
        "2-1476904-G-C",
        "2-1477313-G-A",
        "2-1477317-C-T",
        "2-1477343-C-T",
    ] {
        assert!(
            !variant_ids.contains(&excluded_variant_id),
            "variant {excluded_variant_id} lacks ENST00000423320 and must be excluded; returned IDs: {variant_ids:?}"
        );
    }
    let variant = variants.first().expect("fixture variant should exist");
    assert_eq!(variant.reference_genome, "GRCh38");
    assert_eq!(variant.chromosome, "2");
    let consequence = variant
        .transcript_consequence
        .as_ref()
        .expect("matching transcript consequence should exist");
    assert_eq!(
        consequence.transcript_id.as_deref(),
        Some("ENST00000423320")
    );
    assert_ne!(
        consequence.transcript_id.as_deref(),
        Some("ENST00000329066"),
        "the first transcript consequence is not the requested ENST00000423320"
    );
    assert_eq!(consequence.hgvsc.as_deref(), Some("c.483-102A>G"));
    Ok(())
}
