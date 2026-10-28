use datafusion::prelude::{ParquetReadOptions, SessionContext};

/// # Errors
/// Returns an error if the Parquet dataset cannot be registered.
pub async fn create_datafusion_context(
    clinvar_parquet_path: &str,
) -> datafusion::error::Result<SessionContext> {
    let context = SessionContext::new();

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
