use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use datafusion::arrow::datatypes::DataType;
use datafusion::error::DataFusionError;
use datafusion::prelude::{ParquetReadOptions, SessionContext};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParquetDataset {
    ClinvarVariantsGrch38,
    GeneModelsGrch38,
    GnomadVariantsV4,
}

fn chromosome_partition() -> (String, DataType) {
    ("chrom".to_owned(), DataType::Utf8)
}

impl ParquetDataset {
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::ClinvarVariantsGrch38 => "clinvar_variants_grch38",
            Self::GeneModelsGrch38 => "gene_models_grch38",
            Self::GnomadVariantsV4 => "gnomad_variants_v4",
        }
    }

    /// Columns read from `name=value` directory names rather than from the files.
    #[must_use]
    pub fn partition_columns(self) -> Vec<(String, DataType)> {
        match self {
            Self::ClinvarVariantsGrch38 => vec![chromosome_partition()],
            Self::GeneModelsGrch38 => Vec::new(),
            Self::GnomadVariantsV4 => vec![
                chromosome_partition(),
                ("posbin".to_owned(), DataType::Utf8),
            ],
        }
    }

    /// # Errors
    /// Return an error if the requested directory cannot be resolved or its Parquet files cannot be registered.
    pub async fn register(
        self,
        context: &SessionContext,
        root: impl AsRef<Path>,
    ) -> datafusion::error::Result<()> {
        let directory = self.resolve_directory(root)?;
        let path = directory.to_str().ok_or_else(|| {
            DataFusionError::Plan(format!(
                "Parquet dataset {} path is not valid UTF-8: {}",
                self.name(),
                directory.display()
            ))
        })?;
        context
            .register_parquet(
                self.name(),
                path,
                ParquetReadOptions::default().table_partition_cols(self.partition_columns()),
            )
            .await
            .map_err(|error| {
                DataFusionError::Context(
                    format!("Cannot register Parquet dataset {} at {path}", self.name()),
                    Box::new(error),
                )
            })
    }

    /// # Errors
    /// Return an I/O error naming the dataset directory if it is missing, inaccessible, or not a directory.
    pub fn resolve_directory(self, root: impl AsRef<Path>) -> io::Result<PathBuf> {
        let subdirectory = self.name();
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
