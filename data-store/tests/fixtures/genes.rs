use datafusion::error::Result;
use gnomad_data_store::{GeneReader, ParquetDataset};
use serde_json::Value;

use super::{create_datafusion_context_from_json_rows, read_fixture_rows_as_json};

/// In the fixture with MANE Select, pext and constraint annotations.
pub const ANNOTATED_GENE_ID: &str = "ENSG00000169174";

pub async fn read_gene_row(gene_id: &str) -> Result<Value> {
    let mut rows = read_fixture_rows_as_json(
        ParquetDataset::GeneModelsGrch38,
        &format!("gene_id = '{gene_id}'"),
    )
    .await?;
    assert_eq!(rows.len(), 1, "{gene_id} must be in the gene fixture once");
    Ok(rows.remove(0))
}

pub async fn create_reader_from_rows(rows: &[Value]) -> Result<GeneReader> {
    let context =
        create_datafusion_context_from_json_rows(ParquetDataset::GeneModelsGrch38, rows).await?;
    Ok(GeneReader::new(context))
}
