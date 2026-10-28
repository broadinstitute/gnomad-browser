#![allow(clippy::panic_in_result_fn)]

use std::path::PathBuf;

use datafusion::error::Result;
use gnomad_data_store::{ClinvarReader, create_datafusion_context};

const CLINVAR_TABLE_NAME: &str = "clinvar_grch38_variants";

fn fixture_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/clinvar_grch38_variants.parquet")
}

#[tokio::test]
async fn registers_clinvar_table_with_fixture_records() -> Result<()> {
    let path = fixture_path();
    let context = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await?;

    let row_count = context.table(CLINVAR_TABLE_NAME).await?.count().await?;

    assert_eq!(row_count, 3);
    Ok(())
}

#[tokio::test]
async fn registration_fails_for_missing_file() {
    let path = fixture_path().with_file_name("missing_clinvar.parquet");
    assert!(!path.exists());

    let result = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await;

    assert!(result.is_err());
}

#[tokio::test]
async fn fetches_expected_fields_for_each_variant_id() -> Result<()> {
    let path = fixture_path();
    let context = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await?;
    let reader = ClinvarReader::new(context);

    for (variant_id, position, reference_allele, alternate_allele) in [
        ("1-66926-AG-A", 66_926, "AG", "A"),
        ("1-926026-G-A", 926_026, "G", "A"),
        ("1-926026-G-T", 926_026, "G", "T"),
    ] {
        let variant = reader
            .fetch_single_variant(variant_id)
            .await?
            .expect("fixture variant should exist");

        assert_eq!(variant.variant_id, variant_id);
        assert_eq!(variant.chromosome, "1");
        assert_eq!(variant.position, position);
        assert_eq!(variant.reference_allele, reference_allele);
        assert_eq!(variant.alternate_allele, alternate_allele);
    }

    Ok(())
}

#[tokio::test]
async fn returns_none_for_unknown_variant_id() -> Result<()> {
    let path = fixture_path();
    let context = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await?;
    let reader = ClinvarReader::new(context);

    let variant = reader.fetch_single_variant("1-926026-G-C").await?;

    assert!(variant.is_none());
    Ok(())
}
