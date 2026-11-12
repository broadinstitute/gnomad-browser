#![allow(
    clippy::trailing_empty_array,
    reason = "NAPI.rs generates callback bookkeeping structs with trailing empty arrays."
)]

use napi::bindgen_prelude::{Either, Null};
use napi_derive::napi;

use super::{GenomicIntervalBounds, into_napi_error, into_nullable, parse_genomic_intervals};
use crate::{
    CoverageBucket as ReaderCoverageBucket, CoverageDataset,
    CoverageHistogram as ReaderCoverageHistogram, CoverageReader,
    create_datafusion_context_from_root,
};

#[napi]
pub struct CoverageStore {
    reader: CoverageReader,
}

fn parse_coverage_dataset(dataset: &str) -> napi::Result<CoverageDataset> {
    match dataset {
        "gnomad_v3_genome" => Ok(CoverageDataset::GnomadV3Genome),
        "gnomad_v4_exome" => Ok(CoverageDataset::GnomadV4Exome),
        _ => Err(napi::Error::new(
            napi::Status::InvalidArg,
            format!(
                "Invalid coverage dataset: {dataset}; expected gnomad_v3_genome or gnomad_v4_exome"
            ),
        )),
    }
}

/// `dataset` is `gnomad_v3_genome` or `gnomad_v4_exome`.
///
/// # Errors
/// Rejects an unknown dataset and returns an error if its Parquet dataset cannot be registered.
#[allow(dead_code, reason = "Called from JavaScript through Node-API.")]
#[napi]
pub async fn open_coverage_store(
    parquet_root: String,
    dataset: String,
) -> napi::Result<CoverageStore> {
    let dataset = parse_coverage_dataset(&dataset)?;
    let context = create_datafusion_context_from_root(parquet_root, dataset.parquet_dataset())
        .await
        .map_err(|error| into_napi_error(&error))?;

    Ok(CoverageStore {
        reader: CoverageReader::new(context, dataset),
    })
}

#[napi]
impl CoverageStore {
    /// Average coverage per bucket over `exons` padded by 75 bases; pass every exon feature type,
    /// unpadded.
    ///
    /// # Errors
    /// Rejects invalid chromosomes or bounds and propagates padding and query errors.
    #[napi]
    pub async fn fetch_coverage_in_gene(
        &self,
        gene_id: String,
        chromosome: String,
        exons: Vec<GenomicIntervalBounds>,
    ) -> napi::Result<CoverageHistogram> {
        let exons = parse_genomic_intervals(&chromosome, &exons)?;
        let histogram = self
            .reader
            .fetch_coverage_in_gene(&gene_id, &exons)
            .await
            .map_err(|error| into_napi_error(&error))?;

        Ok(histogram.into())
    }
}

#[napi(object)]
pub struct CoverageHistogram {
    #[napi(js_name = "bucket_size")]
    pub bucket_size: i32,
    /// Only buckets containing a covered position, in ascending order; Elasticsearch histograms
    /// also returned the empty buckets between them.
    pub buckets: Vec<CoverageBucket>,
}

impl From<ReaderCoverageHistogram> for CoverageHistogram {
    fn from(histogram: ReaderCoverageHistogram) -> Self {
        Self {
            bucket_size: histogram.bucket_size,
            buckets: histogram.buckets.into_iter().map(Into::into).collect(),
        }
    }
}

#[napi(object)]
pub struct CoverageBucket {
    /// A multiple of `bucket_size`.
    #[napi(js_name = "bucket_start")]
    pub bucket_start: i32,
    pub mean: Either<f64, Null>,
    pub median: Either<f64, Null>,
    #[napi(js_name = "over_1")]
    pub over_1: Either<f64, Null>,
    #[napi(js_name = "over_5")]
    pub over_5: Either<f64, Null>,
    #[napi(js_name = "over_10")]
    pub over_10: Either<f64, Null>,
    #[napi(js_name = "over_15")]
    pub over_15: Either<f64, Null>,
    #[napi(js_name = "over_20")]
    pub over_20: Either<f64, Null>,
    #[napi(js_name = "over_25")]
    pub over_25: Either<f64, Null>,
    #[napi(js_name = "over_30")]
    pub over_30: Either<f64, Null>,
    #[napi(js_name = "over_50")]
    pub over_50: Either<f64, Null>,
    #[napi(js_name = "over_100")]
    pub over_100: Either<f64, Null>,
}

impl From<ReaderCoverageBucket> for CoverageBucket {
    fn from(bucket: ReaderCoverageBucket) -> Self {
        Self {
            bucket_start: bucket.bucket_start,
            mean: into_nullable(bucket.mean),
            median: into_nullable(bucket.median),
            over_1: into_nullable(bucket.over_1),
            over_5: into_nullable(bucket.over_5),
            over_10: into_nullable(bucket.over_10),
            over_15: into_nullable(bucket.over_15),
            over_20: into_nullable(bucket.over_20),
            over_25: into_nullable(bucket.over_25),
            over_30: into_nullable(bucket.over_30),
            over_50: into_nullable(bucket.over_50),
            over_100: into_nullable(bucket.over_100),
        }
    }
}
