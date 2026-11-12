#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::error::Result;
use datafusion::prelude::SessionContext;
use gnomad_data_store::{ClinvarReader, ParquetDataset, create_datafusion_context_from_root};
use serde_json::{Value, json};

mod fixtures;

use fixtures::clinvar;

#[tokio::test]
async fn maps_source_columns() -> Result<()> {
    let reader = clinvar::create_reader_with_variants(&["1-100-AG-A", "X-200-C-T"]).await?;

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
    let reader = clinvar::create_reader_with_variants(&["1-100-A-G", "1-100-A-T"]).await?;

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
    let mut row = clinvar::read_annotated_row_at("1-100-A-G").await?;
    row["submissions"] = json!([
        {
            "id": "SCV000000001",
            "submitter_name": "Submitter A",
            "clinical_significance": "Pathogenic",
            "last_evaluated": "2024-01-31",
            "review_status": "reviewed by expert panel",
            "conditions": [
                { "name": "Condition A", "medgen_id": "C0000001" },
                { "name": "Condition B", "medgen_id": null }
            ]
        },
        {
            "id": "SCV000000002",
            "submitter_name": "Submitter B",
            "clinical_significance": null,
            "last_evaluated": null,
            "review_status": "no assertion criteria provided",
            "conditions": [{ "name": "Condition C", "medgen_id": "C0000003" }]
        }
    ]);
    row["gnomad"]["exome"]["ac"] = json!(3);
    row["gnomad"]["exome"]["an"] = json!(1000);
    row["gnomad"]["exome"]["filters"] = json!(["AS_VQSR"]);
    row["gnomad"]["genome"]["ac"] = json!(5);
    row["gnomad"]["genome"]["an"] = json!(2000);
    row["gnomad"]["genome"]["filters"] = json!(["AC0", "RF"]);
    let reader = clinvar::create_reader_from_rows(&[row.clone()]).await?;

    let variant = reader
        .fetch_single_variant("1-100-A-G")
        .await?
        .expect("supplied variant should exist");

    assert_eq!(row["reference_genome"], variant.reference_genome);
    assert_eq!(row["clinvar_variation_id"], variant.clinvar_variation_id);
    assert_eq!(row["clinical_significance"], variant.clinical_significance);
    assert_eq!(row["review_status"], variant.review_status);
    assert_eq!(row["gold_stars"], variant.gold_stars);
    assert_eq!(row["in_gnomad"], variant.in_gnomad);
    assert_eq!(
        row["last_evaluated"].as_str(),
        variant.last_evaluated.as_deref()
    );
    assert_eq!(row["rsid"].as_str(), variant.rsid.as_deref());

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
    let mut row = clinvar::read_annotated_row_at("1-100-A-G").await?;
    row["submissions"] = json!([]);
    row["gnomad"]["exome"]["filters"] = json!([]);
    row["gnomad"]["genome"]["ac"] = Value::Null;
    row["gnomad"]["genome"]["an"] = Value::Null;
    row["gnomad"]["genome"]["filters"] = Value::Null;
    let reader = clinvar::create_reader_from_rows(&[row]).await?;

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
    let mut row = clinvar::read_annotated_row_at("1-100-A-G").await?;
    row["in_gnomad"] = json!(false);
    row["last_evaluated"] = Value::Null;
    row["rsid"] = Value::Null;
    row["submissions"] = json!([]);
    clinvar::clear_gnomad_data(&mut row);
    let reader = clinvar::create_reader_from_rows(&[row]).await?;

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
    let reader = clinvar::create_reader_with_variants(&["1-100-A-G", "1-100-A-G"]).await?;

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
    let mut row = clinvar::read_annotated_row_at("1-100-A-G").await?;
    row["reference_genome"] = Value::Null;
    let reader = clinvar::create_reader_from_rows(&[row]).await?;

    let error = reader
        .fetch_single_variant("1-100-A-G")
        .await
        .expect_err("missing reference genome must fail decoding");

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
    let reader = clinvar::create_reader_with_variants(&["1-100-A-G"]).await?;

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
