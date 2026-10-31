#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use std::fs;

use datafusion::error::Result;
use datafusion::prelude::SessionContext;
use gnomad_data_store::{ClinvarReader, ParquetDataset, create_datafusion_context_from_root};
use tempfile::tempdir;

mod fixtures;

#[tokio::test]
async fn registers_real_parquet_with_metadata_sidecar_and_no_other_datasets() -> Result<()> {
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

    assert_eq!(context.table(dataset.name()).await?.count().await?, 19);
    let reader = ClinvarReader::new(context);
    let variant = reader
        .fetch_single_variant("2-1456298-C-G")
        .await?
        .expect("fixture variant should exist");
    assert_eq!(variant.variant_id, "2-1456298-C-G");
    assert_eq!(variant.chromosome, "2");
    assert!(!root.path().join("gene_models_grch38").exists());
    Ok(())
}

#[tokio::test]
async fn registration_reports_missing_dataset_with_name_and_path() -> Result<()> {
    let root = tempdir()?;
    let dataset = ParquetDataset::GeneModelsGrch38;
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
    fs::create_dir(&directory)?;
    fs::write(directory.join("invalid.parquet"), b"not Parquet")?;
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
