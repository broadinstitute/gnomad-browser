#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::arrow::datatypes::{DataType, Fields};
use datafusion::arrow::json::WriterBuilder;
use datafusion::arrow::json::writer::LineDelimited;
use datafusion::arrow::record_batch::RecordBatch;
use datafusion::error::{DataFusionError, Result};
use gnomad_data_store::{GnomadV4Reader, ParquetDataset, create_datafusion_context_from_root};

mod fixtures;

async fn create_reader() -> Result<GnomadV4Reader> {
    let context = create_datafusion_context_from_root(
        fixtures::root_directory(),
        ParquetDataset::GnomadVariantsV4,
    )
    .await?;
    Ok(GnomadV4Reader::new(context))
}

fn write_json_lines(batches: &[RecordBatch]) -> Result<String> {
    let mut json = Vec::new();
    let mut writer = WriterBuilder::new()
        .with_explicit_nulls(true)
        .build::<_, LineDelimited>(&mut json);
    for batch in batches {
        writer.write(batch)?;
    }
    writer.finish()?;
    drop(writer);
    String::from_utf8(json).map_err(|error| DataFusionError::External(Box::new(error)))
}

fn count_rows(batches: &[RecordBatch]) -> usize {
    batches.iter().map(RecordBatch::num_rows).sum()
}

fn struct_field_names(batch: &RecordBatch, column: &str) -> Result<Vec<String>> {
    match batch.schema().field_with_name(column)?.data_type() {
        DataType::Struct(fields) => Ok(field_names(fields)),
        other => Err(DataFusionError::Execution(format!(
            "{column} is {other}, not a struct"
        ))),
    }
}

fn field_names(fields: &Fields) -> Vec<String> {
    fields.iter().map(|field| field.name().clone()).collect()
}

#[tokio::test]
async fn returns_the_record_with_rebuilt_identifiers() -> Result<()> {
    let reader = create_reader().await?;

    let batches = reader
        .fetch_single_variant_batches("17-16000457-T-C")
        .await?;

    assert_eq!(count_rows(&batches), 1);
    let json = write_json_lines(&batches)?;
    assert!(json.starts_with(
        r#"{"variant_id":"17-16000457-T-C","locus":{"contig":"chr17","position":16000457},"alleles":["T","C"],"rsids":["rs960724070"],"#
    ));
    assert!(json.contains(r#""caid":"CA726478728""#));
    Ok(())
}

#[tokio::test]
async fn keeps_every_sequencing_type_field_except_vep() -> Result<()> {
    let reader = create_reader().await?;

    let batches = reader
        .fetch_single_variant_batches("17-16000457-T-C")
        .await?;

    let batch = batches
        .first()
        .ok_or_else(|| DataFusionError::Execution("no batch".into()))?;
    let expected = [
        "colocated_variants",
        "subsets",
        "flags",
        "freq",
        "faf95",
        "faf99",
        "fafmax",
        "age_distribution",
        "filters",
        "quality_metrics",
    ];
    assert_eq!(struct_field_names(batch, "exome")?, expected);
    assert_eq!(struct_field_names(batch, "genome")?, expected);
    assert_eq!(
        field_names(batch.schema().fields()),
        [
            "variant_id",
            "locus",
            "alleles",
            "rsids",
            "exome",
            "genome",
            "joint",
            "in_silico_predictors",
            "colocated_variants",
            "coverage",
            "transcript_consequences",
            "caid",
            "vrs",
        ]
    );
    Ok(())
}

#[tokio::test]
async fn widens_float32_in_silico_scores_and_keeps_coverage_as_exported() -> Result<()> {
    let reader = create_reader().await?;

    let batches = reader
        .fetch_single_variant_batches("17-16000457-T-C")
        .await?;

    let json = write_json_lines(&batches)?;
    assert!(json.contains(r#""cadd":{"phred":9.723999977111816,"#));
    assert!(json.contains(r#""over_1":0.99990237,"#));
    Ok(())
}

#[tokio::test]
async fn returns_only_the_requested_allele_at_a_shared_position() -> Result<()> {
    let reader = create_reader().await?;

    let batches = reader
        .fetch_single_variant_batches("17-16000457-T-G")
        .await?;

    assert_eq!(count_rows(&batches), 1);
    assert!(write_json_lines(&batches)?.starts_with(r#"{"variant_id":"17-16000457-T-G","#));
    Ok(())
}

#[tokio::test]
async fn reads_a_variant_at_a_megabase_edge_from_the_lower_bin() -> Result<()> {
    let reader = create_reader().await?;

    let batches = reader
        .fetch_single_variant_batches("17-16000000-GC-G")
        .await?;

    assert_eq!(count_rows(&batches), 1);
    Ok(())
}

#[tokio::test]
async fn leaves_absent_sequencing_types_as_null_counts() -> Result<()> {
    let reader = create_reader().await?;

    let batches = reader
        .fetch_single_variant_batches("17-16001839-T-G")
        .await?;

    let json = write_json_lines(&batches)?;
    assert!(json.contains(r#""exome":{"colocated_variants":{"all":null,"non_ukb":null},"#));
    assert!(json.contains(r#""freq":{"all":{"ac":null,"ac_raw":null,"#));
    Ok(())
}

#[tokio::test]
async fn returns_no_rows_for_an_absent_variant_or_chromosome() -> Result<()> {
    let reader = create_reader().await?;

    for variant_id in ["17-16000457-T-A", "17-16000456-T-C", "22-16000457-T-C"] {
        let batches = reader.fetch_single_variant_batches(variant_id).await?;
        assert_eq!(count_rows(&batches), 0, "{variant_id}");
    }
    Ok(())
}

#[tokio::test]
async fn rejects_a_malformed_variant_id() -> Result<()> {
    let reader = create_reader().await?;

    for variant_id in [
        "17-16000457-T",
        "chr17-16000457-T-C",
        "17-x-T-C",
        "17-16000457-T-Z",
    ] {
        let result = reader.fetch_single_variant_batches(variant_id).await;
        assert!(
            result.is_err_and(|error| error.to_string().contains("Invalid gnomAD v4 variant ID")),
            "{variant_id}"
        );
    }
    Ok(())
}
