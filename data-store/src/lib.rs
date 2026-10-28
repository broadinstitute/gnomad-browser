//! Read browser datasets from Parquet files.

mod datafusion_context;
mod parquet_dataset;

pub use datafusion_context::create_datafusion_context_from_root;
pub use parquet_dataset::ParquetDataset;
