use std::path::Path;

use crate::ParquetDataset;
use datafusion::prelude::SessionContext;

/// # Errors
/// Return an error if the requested dataset directory cannot be resolved or registered.
pub async fn create_datafusion_context_from_root(
    root: impl AsRef<Path>,
    dataset: ParquetDataset,
) -> datafusion::error::Result<SessionContext> {
    let context = SessionContext::new();
    dataset.register(&context, root).await?;
    Ok(context)
}
