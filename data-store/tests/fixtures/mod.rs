use std::io;
use std::path::PathBuf;

use gnomad_data_store::ParquetDataset;

pub fn resolve_dataset_directory(dataset: ParquetDataset) -> io::Result<PathBuf> {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures");
    dataset.resolve_directory(root)
}
