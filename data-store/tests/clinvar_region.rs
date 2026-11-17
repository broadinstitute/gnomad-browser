#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::error::Result;
use datafusion::prelude::SessionContext;
use gnomad_data_store::{
    ClinvarReader, ClinvarVariantListEntry, GenomicInterval, ParquetDataset,
    create_datafusion_context_from_root,
};
use serde_json::json;

mod fixtures;

use fixtures::clinvar;

const NO_LIMIT: usize = 1_000;

fn variant_ids(variants: &[ClinvarVariantListEntry]) -> Vec<&str> {
    variants
        .iter()
        .map(|variant| variant.variant_id.as_str())
        .collect()
}

#[tokio::test]
async fn includes_both_boundaries_and_excludes_positions_outside() -> Result<()> {
    let reader = clinvar::create_reader_with_variants(&[
        "1-99-A-G",
        "1-100-A-G",
        "1-150-A-G",
        "1-200-A-G",
        "1-201-A-G",
    ])
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
    let reader = clinvar::create_reader_with_variants(&["1-100-A-G", "2-100-A-G"]).await?;

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
    let reader =
        clinvar::create_reader_with_variants(&["1-300-A-G", "1-100-A-T", "1-100-A-C", "1-200-A-G"])
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
    let reader =
        clinvar::create_reader_with_variants(&["1-300-A-G", "1-100-A-G", "1-200-A-G"]).await?;

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
    let reader = clinvar::create_reader_with_variants(&[
        "1-99-A-G",
        "1-100-A-G",
        "1-200-A-G",
        "1-201-A-G",
        "2-150-A-G",
    ])
    .await?;

    let count = reader
        .count_variants_in_region(&GenomicInterval::new("1", 100, 200).expect("valid interval"))
        .await?;

    assert_eq!(count, 2);
    Ok(())
}

#[tokio::test]
async fn returns_no_variants_for_an_empty_interval() -> Result<()> {
    let reader = clinvar::create_reader_with_variants(&["1-100-A-G"]).await?;

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
    let mut row = clinvar::read_annotated_row_at("1-100-A-G").await?;
    let mut refseq_consequence = row["transcript_consequences"][0].clone();
    refseq_consequence["gene_id"] = json!("1234");
    refseq_consequence["transcript_id"] = json!("NM_000001.1");
    let mut ensembl_consequence = refseq_consequence.clone();
    ensembl_consequence["gene_id"] = json!("ENSG00000000001");
    ensembl_consequence["transcript_id"] = json!("ENST00000000001");
    ensembl_consequence["major_consequence"] = json!("missense_variant");
    ensembl_consequence["hgvsc"] = json!("c.1A>G");
    ensembl_consequence["hgvsp"] = json!("p.Met1Val");
    row["transcript_consequences"] = json!([refseq_consequence, ensembl_consequence]);
    row["in_gnomad"] = json!(true);
    row["gnomad.exome.ac"] = json!(3);
    row["gnomad.exome.an"] = json!(1000);
    row["gnomad.exome.filters"] = json!(["AS_VQSR"]);
    row["gnomad.genome.ac"] = json!(5);
    row["gnomad.genome.an"] = json!(2000);
    row["gnomad.genome.filters"] = json!([]);
    let reader = clinvar::create_reader_from_rows(&[row]).await?;

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
    let mut row = clinvar::read_annotated_row_at("1-100-A-G").await?;
    row["transcript_consequences"] = json!([]);
    row["in_gnomad"] = json!(false);
    clinvar::clear_gnomad_data(&mut row);
    let reader = clinvar::create_reader_from_rows(&[row]).await?;

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
