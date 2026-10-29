use datafusion::common::config::Dialect;
use datafusion::prelude::{ParquetReadOptions, SessionConfig, SessionContext};

/// # Errors
/// Returns an error if the Parquet dataset cannot be registered.
pub async fn create_datafusion_context(
    clinvar_parquet_path: &str,
) -> datafusion::error::Result<SessionContext> {
    let mut config = SessionConfig::new();
    config.options_mut().sql_parser.dialect = Dialect::DuckDB;

    let context = SessionContext::new_with_config(config);

    let clinvar_table_name = "clinvar_grch38_variants";

    context
        .register_parquet(
            clinvar_table_name,
            clinvar_parquet_path,
            ParquetReadOptions::default(),
        )
        .await?;

    Ok(context)
}
