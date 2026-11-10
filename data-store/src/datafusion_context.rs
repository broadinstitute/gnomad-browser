use std::path::Path;

use crate::ParquetDataset;
use datafusion::common::config::Dialect;
use datafusion::prelude::{SessionConfig, SessionContext};

/// # Errors
/// Return an error if the requested dataset directory cannot be resolved or registered.
pub async fn create_datafusion_context_from_root(
    root: impl AsRef<Path>,
    dataset: ParquetDataset,
) -> datafusion::error::Result<SessionContext> {
    let mut config = SessionConfig::new();
    // DuckDB syntax supports the lambdas used to select transcript consequences.
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    // decode only columns to filter on first, big speed up
    config.options_mut().execution.parquet.pushdown_filters = true;
    config.options_mut().execution.parquet.reorder_filters = true;
    let context = SessionContext::new_with_config(config);
    dataset.register(&context, root).await?;
    Ok(context)
}
