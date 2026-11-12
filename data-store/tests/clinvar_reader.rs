#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::common::config::Dialect;
use datafusion::error::Result;
use datafusion::prelude::{SessionConfig, SessionContext};
use gnomad_data_store::{ClinvarReader, ParquetDataset, create_datafusion_context_from_root};

mod fixtures;

/// Derive every detail column from `annotation_state`: `populated` fills each field and
/// collection, `empty` leaves collections empty with exome-only gnomAD data, and `null` leaves
/// optional fields and gnomAD data absent.
const SYNTHETIC_DETAIL_COLUMNS: &str = r#"
    'GRCh38' AS reference_genome,
    concat('variation-', CAST(position AS VARCHAR)) AS clinvar_variation_id,
    'Pathogenic' AS clinical_significance,
    'reviewed by expert panel' AS review_status,
    CAST(3 AS INT) AS gold_stars,
    annotation_state = 'populated' AS in_gnomad,
    CASE WHEN annotation_state <> 'null' THEN '2024-01-31' END AS last_evaluated,
    CASE WHEN annotation_state <> 'null' THEN 'rs123' END AS rsid,
    CASE WHEN annotation_state = 'populated' THEN [
        named_struct(
            'clinical_significance', 'Pathogenic',
            'last_evaluated', '2024-01-31',
            'review_status', 'reviewed by expert panel',
            'submitter_name', 'Submitter A',
            'conditions', [
                named_struct('name', 'Condition A', 'medgen_id', 'C0000001'),
                named_struct('name', 'Condition B', 'medgen_id', CAST(NULL AS VARCHAR))
            ]
        ),
        named_struct(
            'clinical_significance', CAST(NULL AS VARCHAR),
            'last_evaluated', CAST(NULL AS VARCHAR),
            'review_status', 'no assertion criteria provided',
            'submitter_name', 'Submitter B',
            'conditions', [named_struct('name', 'Condition C', 'medgen_id', 'C0000003')]
        )
    ] ELSE [] END AS submissions,
    CASE WHEN annotation_state <> 'null' THEN CAST(3 AS INT) END AS "gnomad.exome.ac",
    CASE WHEN annotation_state <> 'null' THEN CAST(1000 AS INT) END AS "gnomad.exome.an",
    CASE
        WHEN annotation_state = 'populated' THEN ['AS_VQSR']
        WHEN annotation_state = 'empty' THEN []
    END AS "gnomad.exome.filters",
    CASE WHEN annotation_state = 'populated' THEN CAST(5 AS INT) END AS "gnomad.genome.ac",
    CASE WHEN annotation_state = 'populated' THEN CAST(2000 AS INT) END AS "gnomad.genome.an",
    CASE WHEN annotation_state = 'populated' THEN ['AC0', 'RF'] END AS "gnomad.genome.filters"
"#;

async fn create_reader_from_rows(supplied_rows: &str) -> Result<ClinvarReader> {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    let context = SessionContext::new_with_config(config);
    let table_name = ParquetDataset::ClinvarVariantsGrch38.name();
    let query = format!(
        r"
        CREATE TABLE {table_name} AS
        SELECT
            variant_id,
            chromosome AS chrom,
            CAST(position AS INT) AS pos,
            reference_allele AS ref,
            alternate_allele AS alt,
            {SYNTHETIC_DETAIL_COLUMNS}
        FROM ({supplied_rows})
        "
    );
    context.sql(&query).await?.collect().await?;
    Ok(ClinvarReader::new(context))
}

/// Supply rows as (`variant_id`, `chromosome`, `position`, `reference_allele`, `alternate_allele`).
async fn create_synthetic_reader(variant_rows: &str) -> Result<ClinvarReader> {
    create_reader_from_rows(&format!(
        "SELECT *, 'populated' AS annotation_state
        FROM ({variant_rows}) AS supplied(
            variant_id, chromosome, position, reference_allele, alternate_allele
        )"
    ))
    .await
}

/// Supply rows as (`variant_id`, `annotation_state`).
async fn create_synthetic_detail_reader(detail_rows: &str) -> Result<ClinvarReader> {
    create_reader_from_rows(&format!(
        "SELECT variant_id, '1' AS chromosome, 100 AS position,
            'A' AS reference_allele, 'G' AS alternate_allele, annotation_state
        FROM ({detail_rows}) AS supplied(variant_id, annotation_state)"
    ))
    .await
}

#[tokio::test]
async fn maps_source_columns() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('1-100-AG-A', '1', 100, 'AG', 'A'),
            ('X-200-C-T', 'X', 200, 'C', 'T')",
    )
    .await?;

    let autosomal = reader
        .fetch_single_variant("1-100-AG-A")
        .await?
        .expect("supplied variant should exist");
    assert_eq!(autosomal.variant_id, "1-100-AG-A");
    assert_eq!(autosomal.chromosome, "1");
    assert_eq!(autosomal.position, 100);
    assert_eq!(autosomal.reference_allele, "AG");
    assert_eq!(autosomal.alternate_allele, "A");

    let x_linked = reader
        .fetch_single_variant("X-200-C-T")
        .await?
        .expect("supplied variant should exist");
    assert_eq!(x_linked.chromosome, "X");
    Ok(())
}

#[tokio::test]
async fn matches_the_exact_variant_id_without_interpreting_sql_in_input() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('1-100-A-G', '1', 100, 'A', 'G'),
            ('1-100-A-T', '1', 100, 'A', 'T')",
    )
    .await?;

    let variant = reader
        .fetch_single_variant("1-100-A-T")
        .await?
        .expect("supplied variant should exist");
    assert_eq!(variant.alternate_allele, "T");

    assert!(reader.fetch_single_variant("1-100-A-C").await?.is_none());
    assert!(
        reader
            .fetch_single_variant("1-100-A-G' OR TRUE --")
            .await
            .is_err()
    );
    Ok(())
}

#[tokio::test]
async fn decodes_populated_details_in_supplied_order() -> Result<()> {
    let reader = create_synthetic_detail_reader("VALUES ('1-100-A-G', 'populated')").await?;

    let variant = reader
        .fetch_single_variant("1-100-A-G")
        .await?
        .expect("supplied variant should exist");

    assert_eq!(variant.reference_genome, "GRCh38");
    assert_eq!(variant.clinvar_variation_id, "variation-100");
    assert_eq!(variant.clinical_significance, "Pathogenic");
    assert_eq!(variant.review_status, "reviewed by expert panel");
    assert_eq!(variant.gold_stars, 3);
    assert!(variant.in_gnomad);
    assert_eq!(variant.last_evaluated.as_deref(), Some("2024-01-31"));
    assert_eq!(variant.rsid.as_deref(), Some("rs123"));

    let submitters: Vec<&str> = variant
        .submissions
        .iter()
        .map(|submission| submission.submitter_name.as_str())
        .collect();
    assert_eq!(submitters, ["Submitter A", "Submitter B"]);

    let first = variant.submissions.first().expect("first submission");
    assert_eq!(first.clinical_significance.as_deref(), Some("Pathogenic"));
    assert_eq!(first.last_evaluated.as_deref(), Some("2024-01-31"));
    let conditions: Vec<(&str, Option<&str>)> = first
        .conditions
        .iter()
        .map(|condition| (condition.name.as_str(), condition.medgen_id.as_deref()))
        .collect();
    assert_eq!(
        conditions,
        [("Condition A", Some("C0000001")), ("Condition B", None)]
    );

    let second = variant.submissions.get(1).expect("second submission");
    assert!(second.clinical_significance.is_none());
    assert!(second.last_evaluated.is_none());
    assert_eq!(second.review_status, "no assertion criteria provided");

    let exome = variant.gnomad.exome.expect("exome data should exist");
    assert_eq!((exome.ac, exome.an), (3, 1000));
    assert_eq!(exome.filters, ["AS_VQSR"]);
    let genome = variant.gnomad.genome.expect("genome data should exist");
    assert_eq!((genome.ac, genome.an), (5, 2000));
    assert_eq!(genome.filters, ["AC0", "RF"]);
    Ok(())
}

#[tokio::test]
async fn decodes_empty_collections_and_exome_only_gnomad_data() -> Result<()> {
    let reader = create_synthetic_detail_reader("VALUES ('1-100-A-G', 'empty')").await?;

    let variant = reader
        .fetch_single_variant("1-100-A-G")
        .await?
        .expect("supplied variant should exist");

    assert!(variant.submissions.is_empty());
    let exome = variant.gnomad.exome.expect("exome data should exist");
    assert_eq!(exome.filters, Vec::<String>::new());
    assert!(variant.gnomad.genome.is_none());
    Ok(())
}

#[tokio::test]
async fn decodes_missing_optional_fields_and_gnomad_data_as_absent() -> Result<()> {
    let reader = create_synthetic_detail_reader("VALUES ('1-100-A-G', 'null')").await?;

    let variant = reader
        .fetch_single_variant("1-100-A-G")
        .await?
        .expect("supplied variant should exist");

    assert!(!variant.in_gnomad);
    assert!(variant.last_evaluated.is_none());
    assert!(variant.rsid.is_none());
    assert!(variant.submissions.is_empty());
    assert!(variant.gnomad.exome.is_none());
    assert!(variant.gnomad.genome.is_none());
    Ok(())
}

#[tokio::test]
async fn rejects_duplicate_ids_instead_of_selecting_an_arbitrary_record() -> Result<()> {
    let reader = create_synthetic_reader(
        "VALUES
            ('1-100-A-G', '1', 100, 'A', 'G'),
            ('1-100-A-G', '1', 100, 'A', 'G')",
    )
    .await?;

    let error = reader
        .fetch_single_variant("1-100-A-G")
        .await
        .expect_err("duplicate ID must not return an arbitrary variant");

    assert!(error.to_string().contains("Multiple ClinVar records"));
    assert!(error.to_string().contains("1-100-A-G"));
    Ok(())
}

#[tokio::test]
async fn reports_decode_errors_with_the_requested_variant_id() -> Result<()> {
    let reader =
        create_synthetic_reader("VALUES ('1-100-A-G', '1', 100, CAST(NULL AS VARCHAR), 'G')")
            .await?;

    let error = reader
        .fetch_single_variant("1-100-A-G")
        .await
        .expect_err("missing reference allele must fail decoding");

    assert!(
        error
            .to_string()
            .contains("Failed to decode ClinVar result")
    );
    assert!(error.to_string().contains("1-100-A-G"));
    Ok(())
}

#[tokio::test]
async fn rejects_ids_not_in_chrom_pos_ref_alt_form_without_querying() {
    let reader_without_tables = ClinvarReader::new(SessionContext::new());

    for variant_id in [
        "",
        "1",
        "1-100-A",
        "1-100-A-G-T",
        "1-abc-A-G",
        "1-100.5-A-G",
        "1-+100-A-G",
        "1-3000000000-A-G",
        "0-100-A-G",
        "23-100-A-G",
        "chr1-100-A-G",
        "1-100-a-g",
        "1-100--G",
        "1-100-A-R",
        "rs123",
    ] {
        let error = reader_without_tables
            .fetch_single_variant(variant_id)
            .await
            .expect_err("malformed ID must be rejected");
        assert!(
            error.to_string().contains("Invalid ClinVar variant ID"),
            "{variant_id:?} must fail validation, not the query: {error}"
        );
    }
}

#[tokio::test]
async fn accepts_every_form_the_api_normalizer_produces() -> Result<()> {
    let reader = create_synthetic_reader("VALUES ('1-100-A-G', '1', 100, 'A', 'G')").await?;

    for variant_id in [
        "1-100-A-C",
        "22-5-ACGT-T",
        "X-1000-A-G",
        "Y-1-C-T",
        "M-100-A-G",
        "MT-100-A-G",
        "1-0-A-G",
        "1-100-N-A",
    ] {
        assert!(
            reader.fetch_single_variant(variant_id).await?.is_none(),
            "{variant_id:?} is well-formed and absent"
        );
    }
    Ok(())
}

#[tokio::test]
async fn query_failure_is_not_reported_as_a_missing_variant() {
    let reader = ClinvarReader::new(SessionContext::new());
    assert!(reader.fetch_single_variant("1-100-A-G").await.is_err());
}

#[tokio::test]
async fn reads_variants_from_each_chromosome_partition_of_the_real_export() -> Result<()> {
    let context = create_datafusion_context_from_root(
        fixtures::root_directory(),
        ParquetDataset::ClinvarVariantsGrch38,
    )
    .await?;
    let reader = ClinvarReader::new(context);

    for (variant_id, chromosome) in [("1-1456298-G-A", "1"), ("2-1456298-C-G", "2")] {
        let variant = reader
            .fetch_single_variant(variant_id)
            .await?
            .expect("fixture variant should exist");
        assert_eq!(variant.chromosome, chromosome);
    }
    Ok(())
}

#[tokio::test]
async fn decodes_details_from_the_real_export() -> Result<()> {
    let context = create_datafusion_context_from_root(
        fixtures::root_directory(),
        ParquetDataset::ClinvarVariantsGrch38,
    )
    .await?;
    let reader = ClinvarReader::new(context);

    let variant = reader
        .fetch_single_variant("1-69134-A-G")
        .await?
        .expect("fixture variant should exist");

    assert!(variant.in_gnomad);
    assert!(!variant.submissions.is_empty());
    assert!(variant.gnomad.exome.is_some());
    assert!(variant.gnomad.genome.is_some());
    Ok(())
}
