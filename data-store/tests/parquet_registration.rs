#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use std::fs;

use datafusion::common::ScalarValue;
use datafusion::error::Result;
use datafusion::physical_plan::displayable;
use datafusion::prelude::SessionContext;
use gnomad_data_store::{ParquetDataset, create_datafusion_context_from_root};
use tempfile::tempdir;

mod fixtures;

#[tokio::test]
async fn registers_every_partition_with_a_metadata_sidecar_present() -> Result<()> {
    let root = tempdir()?;
    let dataset = ParquetDataset::ClinvarVariantsGrch38;
    let directory = root.path().join(dataset.name());
    for partition in ["chrom=1", "chrom=2"] {
        let destination = directory.join(partition);
        fs::create_dir_all(&destination)?;
        fs::copy(
            fixtures::root_directory()
                .join(dataset.name())
                .join(partition)
                .join("data_0.parquet"),
            destination.join("data_0.parquet"),
        )?;
    }
    fs::write(directory.join("_export_metadata.json"), b"{}")?;

    let context = create_datafusion_context_from_root(root.path(), dataset).await?;

    for chromosome in ["1", "2"] {
        let rows = context
            .sql(&format!(
                "SELECT variant_id FROM {} WHERE chrom = '{chromosome}'",
                dataset.name()
            ))
            .await?
            .count()
            .await?;
        assert!(rows > 0, "expected rows registered from chrom={chromosome}");
    }
    Ok(())
}

#[tokio::test]
async fn reads_each_row_chromosome_from_its_partition_directory() -> Result<()> {
    let dataset = ParquetDataset::ClinvarVariantsGrch38;
    let context = create_datafusion_context_from_root(fixtures::root_directory(), dataset).await?;

    for chromosome in ["1", "2"] {
        let rows_in_partition = context
            .sql(&format!(
                "SELECT variant_id FROM {} WHERE chrom = '{chromosome}'",
                dataset.name()
            ))
            .await?
            .count()
            .await?;
        let rows_with_other_contig = context
            .sql(&format!(
                r#"SELECT variant_id FROM {} WHERE chrom = '{chromosome}' AND "locus.contig" <> 'chr{chromosome}'"#,
                dataset.name()
            ))
            .await?
            .count()
            .await?;

        assert!(rows_in_partition > 0, "chrom={chromosome} has no rows");
        assert_eq!(rows_with_other_contig, 0, "chrom={chromosome}");
    }
    Ok(())
}

#[tokio::test]
async fn a_bound_chromosome_filter_scans_only_that_partition() -> Result<()> {
    let dataset = ParquetDataset::ClinvarVariantsGrch38;
    let context = create_datafusion_context_from_root(fixtures::root_directory(), dataset).await?;

    let plan = context
        .sql(&format!(
            "SELECT variant_id FROM {} WHERE chrom = $1",
            dataset.name()
        ))
        .await?
        .with_param_values(vec![ScalarValue::Utf8(Some("1".to_owned()))])?
        .create_physical_plan()
        .await?;
    let plan = displayable(plan.as_ref()).indent(true).to_string();

    assert!(
        plan.contains("chrom=1/"),
        "chrom=1 must be scanned:\n{plan}"
    );
    assert!(
        !plan.contains("chrom=2/"),
        "chrom=2 must be pruned:\n{plan}"
    );
    Ok(())
}

#[tokio::test]
async fn registers_gene_models_with_their_own_chromosome_column() -> Result<()> {
    let dataset = ParquetDataset::GeneModelsGrch38;
    let partition_columns = dataset.partition_columns();
    assert!(
        partition_columns.is_empty(),
        "gene models must not declare partition columns, got {partition_columns:?}"
    );
    let context = create_datafusion_context_from_root(fixtures::root_directory(), dataset).await?;

    let genes_on_chromosome_22 = context
        .sql(&format!(
            "SELECT gene_id FROM {} WHERE chrom = '22'",
            dataset.name()
        ))
        .await?
        .count()
        .await?;

    assert_eq!(genes_on_chromosome_22, 2);
    Ok(())
}

#[tokio::test]
async fn contexts_filter_rows_while_decoding_parquet() -> Result<()> {
    let context = create_datafusion_context_from_root(
        fixtures::root_directory(),
        ParquetDataset::ClinvarVariantsGrch38,
    )
    .await?;

    let config = context.copied_config();
    let parquet_options = &config.options().execution.parquet;
    assert!(parquet_options.pushdown_filters);
    assert!(parquet_options.reorder_filters);
    Ok(())
}

#[tokio::test]
async fn registration_reports_missing_dataset_with_name_and_path() -> Result<()> {
    let root = tempdir()?;
    let dataset = ParquetDataset::ClinvarVariantsGrch38;
    let expected_path = root.path().join(dataset.name());
    let context = SessionContext::new();

    let error = dataset
        .register(&context, root.path())
        .await
        .expect_err("missing dataset must fail registration");

    let message = error.to_string();
    assert!(message.contains(dataset.name()));
    assert!(message.contains(&expected_path.display().to_string()));
    assert!(!context.table_exist(dataset.name())?);
    Ok(())
}

#[tokio::test]
async fn registration_rejects_invalid_parquet_with_name_and_path() -> Result<()> {
    let root = tempdir()?;
    let dataset = ParquetDataset::ClinvarVariantsGrch38;
    let directory = root.path().join(dataset.name());
    let partition = directory.join("chrom=1");
    fs::create_dir_all(&partition)?;
    fs::write(partition.join("invalid.parquet"), b"not Parquet")?;
    let context = SessionContext::new();

    let error = dataset
        .register(&context, root.path())
        .await
        .expect_err("invalid Parquet must fail registration");

    let message = error.to_string();
    assert!(message.contains(dataset.name()));
    assert!(message.contains(&directory.display().to_string()));
    assert!(!context.table_exist(dataset.name())?);
    Ok(())
}
