use datafusion::error::Result;
use gnomad_data_store::{ClinvarReader, ParquetDataset};
use serde_json::{Value, json};

use super::{create_datafusion_context_from_json_rows, read_fixture_rows_as_json};

/// In the fixture with `gnomAD` exome and genome data, a submission and transcript consequences.
pub const ANNOTATED_VARIANT_ID: &str = "1-69134-A-G";

pub async fn read_variant_row(variant_id: &str) -> Result<Value> {
    let mut rows = read_fixture_rows_as_json(
        ParquetDataset::ClinvarVariantsGrch38,
        &format!("variant_id = '{variant_id}'"),
    )
    .await?;
    assert_eq!(
        rows.len(),
        1,
        "{variant_id} must be in the ClinVar fixture once"
    );
    Ok(rows.remove(0))
}

/// Copy `row` to `variant_id`, rewriting every column that encodes the position or alleles.
pub fn place_variant_row(row: &Value, variant_id: &str) -> Value {
    let parts: Vec<&str> = variant_id.split('-').collect();
    let [chromosome, position, reference, alternate] = parts.as_slice() else {
        panic!("{variant_id:?} is not chrom-pos-ref-alt");
    };
    let position: i32 = position.parse().expect("numeric position");

    let mut row = row.clone();
    row["variant_id"] = json!(variant_id);
    row["chrom"] = json!(chromosome);
    row["pos"] = json!(position);
    row["ref"] = json!(reference);
    row["alt"] = json!(alternate);
    row["locus.contig"] = json!(format!("chr{chromosome}"));
    row["locus.position"] = json!(position);
    row["alleles"] = json!([reference, alternate]);
    row
}

pub fn clear_gnomad_data(row: &mut Value) {
    for column in [
        "gnomad.exome.ac",
        "gnomad.exome.an",
        "gnomad.exome.filters",
        "gnomad.genome.ac",
        "gnomad.genome.an",
        "gnomad.genome.filters",
    ] {
        row[column] = Value::Null;
    }
}

pub async fn read_annotated_row_at(variant_id: &str) -> Result<Value> {
    let base = read_variant_row(ANNOTATED_VARIANT_ID).await?;
    Ok(place_variant_row(&base, variant_id))
}

pub async fn create_reader_from_rows(rows: &[Value]) -> Result<ClinvarReader> {
    let context =
        create_datafusion_context_from_json_rows(ParquetDataset::ClinvarVariantsGrch38, rows)
            .await?;
    Ok(ClinvarReader::new(context))
}

/// Place the annotated fixture variant at each of `variant_ids`.
pub async fn create_reader_with_variants(variant_ids: &[&str]) -> Result<ClinvarReader> {
    let base = read_variant_row(ANNOTATED_VARIANT_ID).await?;
    let rows: Vec<Value> = variant_ids
        .iter()
        .map(|variant_id| place_variant_row(&base, variant_id))
        .collect();
    create_reader_from_rows(&rows).await
}

/// Supply one `(variant_id, gene_id, transcript_id)` per consequence; consecutive consequences of a
/// variant keep their order.
pub async fn create_reader_with_consequences(
    consequences: &[(&str, &str, &str)],
) -> Result<ClinvarReader> {
    let base = read_variant_row(ANNOTATED_VARIANT_ID).await?;
    let mut rows: Vec<(&str, Value)> = Vec::new();
    for &(variant_id, gene_id, transcript_id) in consequences {
        if rows
            .last()
            .is_none_or(|(placed_id, _)| *placed_id != variant_id)
        {
            let mut row = place_variant_row(&base, variant_id);
            row["transcript_consequences"] = json!([]);
            rows.push((variant_id, row));
        }
        let mut consequence = base["transcript_consequences"][0].clone();
        consequence["gene_id"] = json!(gene_id);
        consequence["transcript_id"] = json!(transcript_id);
        let (_, row) = rows.last_mut().expect("a row was placed above");
        row["transcript_consequences"]
            .as_array_mut()
            .expect("consequences are a list")
            .push(consequence);
    }
    let rows: Vec<Value> = rows.into_iter().map(|(_, row)| row).collect();
    create_reader_from_rows(&rows).await
}
