#![allow(
    dead_code,
    reason = "Each integration test crate compiles this module and uses only part of it."
)]
#![allow(
    clippy::expect_used,
    clippy::indexing_slicing,
    clippy::panic,
    clippy::panic_in_result_fn,
    reason = "Test helpers outside #[test] functions; a panic fails the calling test."
)]

pub mod clinvar;
pub mod genes;

use std::path::PathBuf;
use std::sync::Arc;

use datafusion::arrow::datatypes::{Schema, SchemaRef};
use datafusion::arrow::json::writer::JsonArray;
use datafusion::arrow::json::{ReaderBuilder, WriterBuilder};
use datafusion::datasource::MemTable;
use datafusion::error::{DataFusionError, Result};
use datafusion::prelude::SessionContext;
use gnomad_data_store::{
    ParquetDataset, create_datafusion_context_from_root, create_datafusion_context_without_datasets,
};
use serde_json::Value;

pub fn root_directory() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

/// The fixtures are real export rows and may be re-exported: assert only on values a test patches
/// into a row or reads back from it, never on literal fixture values.
pub async fn read_fixture_rows_as_json(
    dataset: ParquetDataset,
    filter: &str,
) -> Result<Vec<Value>> {
    let context = create_datafusion_context_from_root(root_directory(), dataset).await?;
    let batches = context
        .sql(&format!("SELECT * FROM {} WHERE {filter}", dataset.name()))
        .await?
        .collect()
        .await?;

    let mut writer = WriterBuilder::new()
        .with_explicit_nulls(true)
        .build::<_, JsonArray>(Vec::new());
    for batch in &batches {
        writer.write(batch)?;
    }
    writer.finish()?;
    serde_json::from_slice(&writer.into_inner())
        .map_err(|error| DataFusionError::External(Box::new(error)))
}

/// Register `rows` under the dataset's name with the schema of its real fixture.
pub async fn create_datafusion_context_from_json_rows(
    dataset: ParquetDataset,
    rows: &[Value],
) -> Result<SessionContext> {
    let fixture_context = create_datafusion_context_from_root(root_directory(), dataset).await?;
    let fixture_schema = fixture_context
        .table_provider(dataset.name())
        .await?
        .schema();
    let schema = with_nullable_columns(&fixture_schema);

    let mut decoder = ReaderBuilder::new(Arc::clone(&schema)).build_decoder()?;
    decoder.serialize(rows)?;
    let batches = decoder.flush()?.into_iter().collect();

    let context = create_datafusion_context_without_datasets();
    context.register_table(
        dataset.name(),
        Arc::new(MemTable::try_new(schema, vec![batches])?),
    )?;
    Ok(context)
}

// Tests supply rows the export never contains, such as a required column left null.
fn with_nullable_columns(schema: &Schema) -> SchemaRef {
    let fields: Vec<_> = schema
        .fields()
        .iter()
        .map(|field| field.as_ref().clone().with_nullable(true))
        .collect();
    Arc::new(Schema::new(fields))
}
