//! Read browser datasets from Parquet files.

mod clinvar_reader;
mod clinvar_variant;
mod datafusion_context;
mod parquet_dataset;
mod record_batch_decoding;

pub use clinvar_reader::ClinvarReader;
pub use clinvar_variant::ClinvarVariant;
pub use datafusion_context::create_datafusion_context_from_root;
pub use parquet_dataset::ParquetDataset;
