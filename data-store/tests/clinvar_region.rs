#![allow(clippy::panic_in_result_fn)]

use datafusion::error::Result;
use gnomad_data_store::{
    ClinvarReader, GenomicInterval, ParquetDataset, create_datafusion_context_from_root,
};

mod fixtures;

async fn fixture_reader() -> Result<ClinvarReader> {
    let context = create_datafusion_context_from_root(
        fixtures::root_directory(),
        ParquetDataset::ClinvarVariantsGrch38,
    )
    .await?;

    Ok(ClinvarReader::new(context))
}

#[tokio::test]
async fn includes_variants_at_both_interval_boundaries() -> Result<()> {
    let reader = fixture_reader().await?;
    let interval =
        GenomicInterval::new("1", 1_452_067, 1_452_068).expect("fixture interval should be valid");

    let variants = reader.fetch_variants_in_region(&interval).await?;
    let ids: Vec<_> = variants
        .iter()
        .map(|variant| variant.variant_id.as_str())
        .collect();

    assert_eq!(ids, ["1-1452067-C-T", "1-1452068-G-A"]);
    Ok(())
}

#[tokio::test]
async fn excludes_other_chromosomes_and_retains_multiple_alleles() -> Result<()> {
    let reader = fixture_reader().await?;
    let interval =
        GenomicInterval::new("2", 1_456_298, 1_456_298).expect("fixture interval should be valid");

    let variants = reader.fetch_variants_in_region(&interval).await?;
    let ids: Vec<_> = variants
        .iter()
        .map(|variant| variant.variant_id.as_str())
        .collect();

    assert_eq!(ids, ["2-1456298-C-G", "2-1456298-C-T"]);
    assert!(variants.iter().all(|variant| variant.chromosome == "2"));
    Ok(())
}

#[tokio::test]
async fn orders_results_by_position_then_variant_id() -> Result<()> {
    let reader = fixture_reader().await?;
    let interval =
        GenomicInterval::new("1", 926_026, 1_477_343).expect("fixture interval should be valid");

    let variants = reader.fetch_variants_in_region(&interval).await?;
    let ids: Vec<_> = variants
        .iter()
        .map(|variant| variant.variant_id.as_str())
        .collect();

    assert_eq!(
        ids,
        [
            "1-926026-G-A",
            "1-926026-G-T",
            "1-1452067-C-T",
            "1-1452068-G-A",
            "1-1456298-G-A",
            "1-1460750-A-G",
            "1-1477313-A-G",
            "1-1477317-G-T",
            "1-1477343-A-G",
        ]
    );
    Ok(())
}

#[tokio::test]
async fn returns_empty_results_for_interval_without_variants() -> Result<()> {
    let reader = fixture_reader().await?;
    let interval =
        GenomicInterval::new("1", 1_452_069, 1_452_070).expect("fixture interval should be valid");

    let variants = reader.fetch_variants_in_region(&interval).await?;

    assert!(variants.is_empty(), "unexpected variants: {variants:?}");
    Ok(())
}

#[tokio::test]
async fn decodes_list_entry_and_selected_transcript_consequence() -> Result<()> {
    let reader = fixture_reader().await?;
    let interval =
        GenomicInterval::new("1", 66_926, 66_926).expect("fixture interval should be valid");

    let variants = reader.fetch_variants_in_region(&interval).await?;

    assert_eq!(variants.len(), 1);
    let variant = variants.first().expect("fixture variant should exist");
    assert_eq!(variant.variant_id, "1-66926-AG-A");
    assert_eq!(variant.reference_genome, "GRCh38");
    assert_eq!(variant.chromosome, "1");
    assert_eq!(variant.position, 66_926);
    assert_eq!(variant.reference_allele, "AG");
    assert_eq!(variant.alternate_allele, "A");
    assert_eq!(variant.clinvar_variation_id, "3385321");
    assert_eq!(variant.clinical_significance, "Uncertain significance");
    assert_eq!(variant.review_status, "criteria provided, single submitter");
    assert_eq!(variant.gold_stars, 1);
    assert!(!variant.in_gnomad);
    assert!(variant.gnomad.exome.is_none());
    assert!(variant.gnomad.genome.is_none());

    let consequence = variant
        .transcript_consequence
        .as_ref()
        .expect("selected transcript consequence should exist");
    assert_eq!(
        consequence.transcript_id.as_deref(),
        Some("ENST00000641515")
    );
    assert_eq!(
        consequence.major_consequence.as_deref(),
        Some("intron_variant")
    );
    assert_eq!(consequence.hgvsc.as_deref(), Some("c.9+1354del"));
    assert!(consequence.hgvsp.is_none());
    Ok(())
}

#[tokio::test]
async fn decodes_populated_gnomad_data_in_list_entry() -> Result<()> {
    let reader = fixture_reader().await?;
    let interval =
        GenomicInterval::new("1", 69_134, 69_134).expect("fixture interval should be valid");

    let variants = reader.fetch_variants_in_region(&interval).await?;

    assert_eq!(variants.len(), 1);
    let variant = variants.first().expect("fixture variant should exist");
    assert!(variant.in_gnomad);
    let exome = variant
        .gnomad
        .exome
        .as_ref()
        .expect("exome data should exist");
    assert_eq!(exome.ac, 1373);
    assert_eq!(exome.an, 315_270);
    assert_eq!(exome.filters, ["AS_VQSR"]);
    let genome = variant
        .gnomad
        .genome
        .as_ref()
        .expect("genome data should exist");
    assert_eq!(genome.ac, 10);
    assert_eq!(genome.an, 31_428);
    assert_eq!(genome.filters, ["AS_VQSR"]);
    Ok(())
}
