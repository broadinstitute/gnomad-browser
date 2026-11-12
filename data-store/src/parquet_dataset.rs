use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use datafusion::arrow::datatypes::{DataType, SchemaRef};
use datafusion::datasource::file_format::options::ReadOptions;
use datafusion::datasource::listing::ListingTableUrl;
use datafusion::error::DataFusionError;
use datafusion::logical_expr::SortExpr;
use datafusion::prelude::{ParquetReadOptions, SessionContext, col};

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
            Self::ClinvarVariantsGrch38 | Self::GnomadVariantsV4 => vec![
                chromosome_partition(),
                ("posbin".to_owned(), DataType::Utf8),
            ],
            Self::GeneModelsGrch38 => Vec::new(),
        }
    }

    /// Every file of the dataset is written in this order; `DataFusion` trusts it instead of sorting.
    #[must_use]
    pub fn file_sort_order(self) -> Vec<SortExpr> {
        match self {
            Self::GnomadVariantsV4 => ["pos", "ref", "alt"]
                .into_iter()
                .map(|column| col(column).sort(true, false))
                .collect(),
            Self::ClinvarVariantsGrch38 | Self::GeneModelsGrch38 => Vec::new(),
        }
    }

    /// Take the schema from the first Parquet file in path order and assume every file shares it.
    ///
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
        self.register_with_one_file_schema(context, &directory, path)
            .await
            .map_err(|error| {
                DataFusionError::Context(
                    format!("Cannot register Parquet dataset {} at {path}", self.name()),
                    Box::new(error),
                )
            })
    }

    // DataFusion would otherwise read every file's footer at registration to merge their schemas:
    // ~0.9 s for chr17 of gnomAD v4 (353 files), and proportionally more with every chromosome.
    async fn register_with_one_file_schema(
        self,
        context: &SessionContext,
        directory: &Path,
        path: &str,
    ) -> datafusion::error::Result<()> {
        let file_sort_order = self.file_sort_order();
        let read_options = ParquetReadOptions::default()
            .table_partition_cols(self.partition_columns())
            .file_sort_order(if file_sort_order.is_empty() {
                Vec::new()
            } else {
                vec![file_sort_order]
            });
        let file_schema = match find_first_parquet_file(directory)? {
            Some(file) => Some(infer_file_schema(context, &file, &read_options).await?),
            None => None,
        };
        let read_options = match &file_schema {
            Some(schema) => read_options.schema(schema),
            None => read_options,
        };
        context
            .register_parquet(self.name(), path, read_options)
            .await
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

fn find_first_parquet_file(directory: &Path) -> io::Result<Option<PathBuf>> {
    let mut paths = fs::read_dir(directory)?
        .map(|entry| entry.map(|entry| entry.path()))
        .collect::<io::Result<Vec<_>>>()?;
    paths.sort();
    for path in paths {
        if path.is_dir() {
            if let Some(file) = find_first_parquet_file(&path)? {
                return Ok(Some(file));
            }
        } else if path
            .extension()
            .is_some_and(|extension| extension == "parquet")
        {
            return Ok(Some(path));
        }
    }
    Ok(None)
}

// Infer through DataFusion rather than reading the footer directly, so the schema gets the same
// type mapping (for example `Utf8View` strings) that full inference applies.
async fn infer_file_schema(
    context: &SessionContext,
    file: &Path,
    read_options: &ParquetReadOptions<'_>,
) -> datafusion::error::Result<SchemaRef> {
    let file_path = file.to_str().ok_or_else(|| {
        DataFusionError::Plan(format!(
            "Parquet file path is not valid UTF-8: {}",
            file.display()
        ))
    })?;
    let listing_options =
        read_options.to_listing_options(&context.copied_config(), context.copied_table_options());
    listing_options
        .infer_schema(&context.state(), &ListingTableUrl::parse(file_path)?)
        .await
}
