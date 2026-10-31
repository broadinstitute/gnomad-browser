use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParquetDataset {
    GeneModelsGrch38,
    ClinvarVariantsGrch38,
}

impl ParquetDataset {
    /// # Errors
    /// Return an I/O error naming the dataset directory if it is missing, inaccessible, or not a directory.
    pub fn resolve_directory(self, root: impl AsRef<Path>) -> io::Result<PathBuf> {
        let subdirectory = match self {
            Self::GeneModelsGrch38 => "gene_models_grch38",
            Self::ClinvarVariantsGrch38 => "clinvar_variants_grch38",
        };
        let path = root.as_ref().join(subdirectory);
        let metadata = fs::metadata(&path).map_err(|error| {
            io::Error::new(
                error.kind(),
                format!(
                    "Cannot open Parquet dataset {subdirectory} at {}: {error}",
                    path.display()
                ),
            )
        })?;
        if !metadata.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::NotADirectory,
                format!(
                    "Parquet dataset {subdirectory} at {} is not a directory",
                    path.display()
                ),
            ));
        }
        Ok(path)
    }
}
