#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::error::Result;
use datafusion::prelude::SessionContext;
use gnomad_data_store::{ClinvarReader, ParquetDataset, create_datafusion_context_from_root};

mod fixtures;

/// Supply rows as (`variant_id`, `chromosome`, `position`, `reference_allele`, `alternate_allele`).
async fn create_synthetic_reader(variant_rows: &str) -> Result<ClinvarReader> {
    let context = SessionContext::new();
    let table_name = ParquetDataset::ClinvarVariantsGrch38.name();
    let query = format!(
        r"
        CREATE TABLE {table_name} AS
        SELECT
            variant_id,
            chromosome AS chrom,
            CAST(position AS INT) AS pos,
            reference_allele AS ref,
            alternate_allele AS alt
        FROM ({variant_rows}) AS supplied(
            variant_id, chromosome, position, reference_allele, alternate_allele
        )
        "
    );
    context.sql(&query).await?.collect().await?;
    Ok(ClinvarReader::new(context))
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

    for variant_id in ["1-100-A-C", "1-100-A", "1-100-A-G' OR TRUE --"] {
        assert!(reader.fetch_single_variant(variant_id).await?.is_none());
    }
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
async fn returns_none_without_querying_for_an_id_lacking_a_chromosome_and_position() -> Result<()> {
    let reader_without_tables = ClinvarReader::new(SessionContext::new());

    for variant_id in ["", "1", "1-", "1-abc-A-G", "1-100.5-A-G"] {
        assert!(
            reader_without_tables
                .fetch_single_variant(variant_id)
                .await?
                .is_none(),
            "{variant_id:?} must not be queried"
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
