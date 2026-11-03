use std::fmt::Arguments;

use datafusion::arrow::record_batch::RecordBatch;
use datafusion::error::{DataFusionError, Result};
use serde::de::DeserializeOwned;

/// # Errors
/// Return an execution error naming `description` if any batch fails to decode.
pub fn decode_record_batches<T: DeserializeOwned>(
    batches: &[RecordBatch],
    description: Arguments<'_>,
) -> Result<Vec<T>> {
    let mut records = Vec::new();
    for batch in batches {
        let decoded: Vec<T> = serde_arrow::from_record_batch(batch).map_err(|error| {
            DataFusionError::Execution(format!("Failed to decode {description}: {error}"))
        })?;
        records.extend(decoded);
    }
    Ok(records)
}
