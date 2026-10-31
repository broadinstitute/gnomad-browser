#![allow(clippy::panic_in_result_fn)]

use std::path::PathBuf;

use datafusion::error::Result;
use gnomad_data_store::{ClinvarReader, ParquetDataset, create_datafusion_context};

mod fixtures;

const CLINVAR_TABLE_NAME: &str = "clinvar_grch38_variants";

fn fixture_directory() -> std::io::Result<PathBuf> {
    fixtures::resolve_dataset_directory(ParquetDataset::ClinvarVariantsGrch38)
}

fn fixture_path() -> std::io::Result<PathBuf> {
    Ok(fixture_directory()?.join("chrom=1/data_0.parquet"))
}

#[tokio::test]
async fn registers_clinvar_table_with_fixture_records() -> Result<()> {
    let path = fixture_path()?;
    let context = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await?;

    let row_count = context.table(CLINVAR_TABLE_NAME).await?.count().await?;

    assert_eq!(row_count, 11);
    Ok(())
}

#[tokio::test]
async fn reads_both_chromosomes_from_one_registered_directory() -> Result<()> {
    let path = fixture_directory()?;
    let context = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await?;
    let row_count = context.table(CLINVAR_TABLE_NAME).await?.count().await?;
    assert_eq!(row_count, 19);
    let reader = ClinvarReader::new(context);

    for (variant_id, chromosome, reference_allele, alternate_allele) in [
        ("1-1456298-G-A", "1", "G", "A"),
        ("2-1456298-C-G", "2", "C", "G"),
        ("2-1456298-C-T", "2", "C", "T"),
    ] {
        let variant = reader
            .fetch_single_variant(variant_id)
            .await?
            .expect("fixture variant should exist");

        assert_eq!(variant.variant_id, variant_id);
        assert_eq!(variant.chromosome, chromosome);
        assert_eq!(variant.position, 1_456_298);
        assert_eq!(variant.reference_allele, reference_allele);
        assert_eq!(variant.alternate_allele, alternate_allele);
    }

    Ok(())
}

#[tokio::test]
async fn registration_fails_for_missing_file() -> Result<()> {
    let path = fixture_path()?.with_file_name("missing_clinvar.parquet");
    assert!(!path.exists());

    let result = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await;

    assert!(result.is_err());
    Ok(())
}

#[tokio::test]
async fn fetches_expected_fields_for_each_variant_id() -> Result<()> {
    let path = fixture_path()?;
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
        assert_eq!(variant.reference_genome, "GRCh38");
        assert_eq!(variant.chromosome, "1");
        assert_eq!(variant.position, position);
        assert_eq!(variant.reference_allele, reference_allele);
        assert_eq!(variant.alternate_allele, alternate_allele);
    }

    Ok(())
}

#[tokio::test]
async fn decodes_submissions_and_absent_gnomad_data() -> Result<()> {
    let path = fixture_path()?;
    let context = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await?;
    let reader = ClinvarReader::new(context);

    let variant = reader
        .fetch_single_variant("1-66926-AG-A")
        .await?
        .expect("fixture variant should exist");

    assert_eq!(variant.clinvar_variation_id, "3385321");
    assert_eq!(variant.clinical_significance, "Uncertain significance");
    assert_eq!(variant.review_status, "criteria provided, single submitter");
    assert_eq!(variant.gold_stars, 1);
    assert_eq!(variant.last_evaluated.as_deref(), Some("2024-11-30"));
    assert!(variant.rsid.is_none());
    assert!(!variant.in_gnomad);
    assert!(variant.gnomad.exome.is_none());
    assert!(variant.gnomad.genome.is_none());

    assert_eq!(variant.submissions.len(), 1);
    let submission = variant
        .submissions
        .first()
        .expect("submission should exist");
    assert_eq!(
        submission.submitter_name,
        "SN ONGC Dept of Genetics and Molecular biology Vision Research Foundation"
    );
    assert_eq!(
        submission.clinical_significance.as_deref(),
        Some("Uncertain significance")
    );
    assert_eq!(submission.last_evaluated.as_deref(), Some("2024-11-30"));
    assert_eq!(
        submission.review_status,
        "criteria provided, single submitter"
    );
    assert_eq!(submission.conditions.len(), 1);
    let condition = submission
        .conditions
        .first()
        .expect("condition should exist");
    assert_eq!(condition.name, "Retinitis pigmentosa");
    assert_eq!(condition.medgen_id.as_deref(), Some("C0035334"));

    Ok(())
}

#[tokio::test]
async fn decodes_exome_only_gnomad_data_with_empty_filters() -> Result<()> {
    let path = fixture_path()?;
    let context = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await?;
    let reader = ClinvarReader::new(context);

    let variant = reader
        .fetch_single_variant("1-926026-G-A")
        .await?
        .expect("fixture variant should exist");

    assert!(variant.in_gnomad);
    assert_eq!(variant.rsid.as_deref(), Some("942779903"));
    assert!(variant.gnomad.genome.is_none());
    let exome = variant.gnomad.exome.expect("exome data should exist");
    assert_eq!(exome.ac, 3);
    assert_eq!(exome.an, 1_457_038);
    assert!(
        exome.filters.is_empty(),
        "unexpected filters: {:?}",
        exome.filters
    );

    Ok(())
}

#[tokio::test]
async fn decodes_exome_and_genome_gnomad_data_with_filters() -> Result<()> {
    let path = fixture_path()?;
    let context = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await?;
    let reader = ClinvarReader::new(context);

    let variant = reader
        .fetch_single_variant("1-69134-A-G")
        .await?
        .expect("fixture variant should exist");

    assert_eq!(variant.reference_genome, "GRCh38");
    assert_eq!(variant.chromosome, "1");
    assert_eq!(variant.position, 69_134);
    assert_eq!(variant.reference_allele, "A");
    assert_eq!(variant.alternate_allele, "G");
    assert_eq!(variant.clinvar_variation_id, "2205837");
    assert_eq!(variant.clinical_significance, "Likely benign");
    assert_eq!(variant.last_evaluated.as_deref(), Some("2021-08-23"));
    assert_eq!(variant.rsid.as_deref(), Some("781394307"));
    assert!(variant.in_gnomad);

    let exome = variant.gnomad.exome.expect("exome data should exist");
    assert_eq!(exome.ac, 1373);
    assert_eq!(exome.an, 315_270);
    assert_eq!(exome.filters, ["AS_VQSR"]);

    let genome = variant.gnomad.genome.expect("genome data should exist");
    assert_eq!(genome.ac, 10);
    assert_eq!(genome.an, 31_428);
    assert_eq!(genome.filters, ["AS_VQSR"]);

    Ok(())
}

#[tokio::test]
async fn returns_none_for_unknown_variant_id() -> Result<()> {
    let path = fixture_path()?;
    let context = create_datafusion_context(path.to_str().expect("UTF-8 fixture path")).await?;
    let reader = ClinvarReader::new(context);

    let variant = reader.fetch_single_variant("1-926026-G-C").await?;

    assert!(variant.is_none());
    Ok(())
}
