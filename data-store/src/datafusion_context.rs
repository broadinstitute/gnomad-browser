use std::path::Path;

use crate::ParquetDataset;
use datafusion::common::config::Dialect;
use datafusion::prelude::{SessionConfig, SessionContext};

/// Tests that register their own tables use this so they query under the readers' settings.
#[must_use]
pub fn create_datafusion_context_without_datasets() -> SessionContext {
    let mut config = SessionConfig::new();
    // DuckDB syntax supports the lambdas used to select transcript consequences.
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    SessionContext::new_with_config(config)
}

/// # Errors
/// Return an error if the requested dataset directory cannot be resolved or registered.
pub async fn create_datafusion_context_from_root(
    root: impl AsRef<Path>,
    dataset: ParquetDataset,
) -> datafusion::error::Result<SessionContext> {
    let context = create_datafusion_context_without_datasets();
    dataset.register(&context, root).await?;
    Ok(context)
}
