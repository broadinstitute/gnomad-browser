#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates filesystem setup errors."
)]

use std::fs;
use std::io;

use gnomad_data_store::ParquetDataset;
use tempfile::tempdir;

#[test]
fn resolves_each_dataset_to_its_mapped_subdirectory() -> io::Result<()> {
    let root = tempdir()?;
    for (dataset, subdirectory) in [
        (ParquetDataset::GeneModelsGrch38, "gene_models_grch38"),
        (
            ParquetDataset::ClinvarVariantsGrch38,
            "clinvar_variants_grch38",
        ),
    ] {
        let expected = root.path().join(subdirectory);
        fs::create_dir(&expected)?;

        assert_eq!(dataset.resolve_directory(root.path())?, expected);
    }
    Ok(())
}

#[test]
fn resolves_requested_dataset_without_requiring_other_datasets() -> io::Result<()> {
    let root = tempdir()?;
    let genes_directory = root.path().join("gene_models_grch38");
    fs::create_dir(&genes_directory)?;

    assert_eq!(
        ParquetDataset::GeneModelsGrch38.resolve_directory(root.path())?,
        genes_directory
    );
    assert!(!root.path().join("clinvar_variants_grch38").exists());
    Ok(())
}

#[test]
fn reports_missing_dataset_with_its_name_and_path() -> io::Result<()> {
    let root = tempdir()?;
    let expected_path = root.path().join("gene_models_grch38");

    let result = ParquetDataset::GeneModelsGrch38.resolve_directory(root.path());

    assert!(matches!(&result, Err(error) if error.kind() == io::ErrorKind::NotFound));
    assert!(result.err().is_some_and(|error| {
        let message = error.to_string();
        message.contains("gene_models_grch38")
            && message.contains(&expected_path.display().to_string())
    }));
    Ok(())
}

#[test]
fn rejects_a_file_at_the_dataset_path() -> io::Result<()> {
    let root = tempdir()?;
    let dataset_path = root.path().join("clinvar_variants_grch38");
    fs::write(&dataset_path, b"not a directory")?;

    let result = ParquetDataset::ClinvarVariantsGrch38.resolve_directory(root.path());

    assert!(matches!(&result, Err(error) if error.kind() == io::ErrorKind::NotADirectory));
    assert!(result.err().is_some_and(|error| {
        let message = error.to_string();
        message.contains("clinvar_variants_grch38")
            && message.contains(&dataset_path.display().to_string())
    }));
    Ok(())
}

#[test]
fn reports_a_missing_root() -> io::Result<()> {
    let parent = tempdir()?;
    let missing_root = parent.path().join("missing_root");

    let result = ParquetDataset::GeneModelsGrch38.resolve_directory(&missing_root);

    assert!(matches!(&result, Err(error) if error.kind() == io::ErrorKind::NotFound));
    Ok(())
}

#[test]
fn rejects_a_file_used_as_the_root() -> io::Result<()> {
    let parent = tempdir()?;
    let root_file = parent.path().join("root_file");
    fs::write(&root_file, b"not a directory")?;

    let result = ParquetDataset::GeneModelsGrch38.resolve_directory(&root_file);

    assert!(matches!(&result, Err(error) if error.kind() == io::ErrorKind::NotADirectory));
    Ok(())
}
