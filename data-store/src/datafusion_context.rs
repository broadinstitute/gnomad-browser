use std::path::Path;

use crate::ParquetDataset;
use datafusion::common::config::Dialect;
use datafusion::prelude::{ParquetReadOptions, SessionConfig, SessionContext};

/// # Errors
/// Returns an error if the Parquet dataset cannot be registered.
pub async fn create_datafusion_context(
    clinvar_parquet_path: &str,
) -> datafusion::error::Result<SessionContext> {
    let context = create_session_context(ParquetDataset::ClinvarVariantsGrch38);

    context
        .register_parquet(
            ParquetDataset::ClinvarVariantsGrch38.name(),
            clinvar_parquet_path,
            ParquetReadOptions::default(),
        )
        .await?;

    Ok(context)
}

/// # Errors
/// Return an error if the requested dataset directory cannot be resolved or registered.
pub async fn create_datafusion_context_from_root(
    root: impl AsRef<Path>,
    dataset: ParquetDataset,
) -> datafusion::error::Result<SessionContext> {
    let context = create_session_context(dataset);
    dataset.register(&context, root).await?;
    Ok(context)
}

fn create_session_context(dataset: ParquetDataset) -> SessionContext {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;
    if dataset == ParquetDataset::GnomadVariantsV4 {
        // Avoid costly nested-statistics aggregation during planning; retain reader-level pruning.
        config.options_mut().execution.collect_statistics = false;
        config.options_mut().execution.parquet.pushdown_filters = true;
        config.options_mut().execution.parquet.reorder_filters = true;
    }
    SessionContext::new_with_config(config)
}
