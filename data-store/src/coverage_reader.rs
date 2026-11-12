use datafusion::common::ScalarValue;
use datafusion::error::{DataFusionError, Result};
use datafusion::prelude::SessionContext;
use serde::{Deserialize, Serialize};

use crate::exon_query::{PaddedExonIntervals, bind_parameter};
use crate::position_bin::bind_position_bins;
use crate::record_batch_decoding::decode_record_batches;
use crate::{GenomicInterval, ParquetDataset};

const TARGET_BUCKET_COUNT: i64 = 500;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CoverageDataset {
    GnomadV3Genome,
    GnomadV4Exome,
}

impl CoverageDataset {
    #[must_use]
    pub const fn parquet_dataset(self) -> ParquetDataset {
        match self {
            Self::GnomadV3Genome => ParquetDataset::GnomadV3GenomeCoverage,
            Self::GnomadV4Exome => ParquetDataset::GnomadV4ExomeCoverage,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct CoverageBucket {
    /// A multiple of the histogram's bucket size.
    pub bucket_start: i32,
    pub mean: Option<f64>,
    pub median: Option<f64>,
    pub over_1: Option<f64>,
    pub over_5: Option<f64>,
    pub over_10: Option<f64>,
    pub over_15: Option<f64>,
    pub over_20: Option<f64>,
    pub over_25: Option<f64>,
    pub over_30: Option<f64>,
    pub over_50: Option<f64>,
    pub over_100: Option<f64>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CoverageHistogram {
    pub bucket_size: i32,
    /// Only buckets containing a covered position, in ascending order; Elasticsearch histograms also
    /// returned the empty buckets between them.
    pub buckets: Vec<CoverageBucket>,
}

pub struct CoverageReader {
    context: SessionContext,
    dataset: CoverageDataset,
}

impl CoverageReader {
    /// `context` must have `dataset`'s Parquet dataset registered.
    #[must_use]
    pub const fn new(context: SessionContext, dataset: CoverageDataset) -> Self {
        Self { context, dataset }
    }

    /// Average coverage per bucket over `exons` padded by 75 bases; pass every exon feature type,
    /// unpadded.
    ///
    /// # Errors
    /// Returns an error for exons on more than one chromosome, padding overflow, or query failure.
    pub async fn fetch_coverage_in_gene(
        &self,
        gene_id: &str,
        exons: &[GenomicInterval],
    ) -> Result<CoverageHistogram> {
        let Some(padded_exons) = PaddedExonIntervals::prepare(exons, gene_id)? else {
            return Ok(CoverageHistogram {
                bucket_size: 1,
                buckets: Vec::new(),
            });
        };
        let bucket_size = choose_bucket_size(&padded_exons.intervals)?;

        let mut parameters = Vec::new();
        let bucket_size_parameter =
            bind_parameter(&mut parameters, ScalarValue::Int32(Some(bucket_size)));
        let chromosome_parameter = bind_parameter(
            &mut parameters,
            ScalarValue::Utf8(Some(padded_exons.chromosome.as_str().to_owned())),
        );
        let bin_parameters = bind_position_bins(&padded_exons.intervals, &mut parameters);
        let position_predicate = padded_exons.bind_position_predicate(&mut parameters);
        let table_name = self.dataset.parquet_dataset().name();
        let query = format!(
            r"
            SELECT
                pos / {bucket_size_parameter} * {bucket_size_parameter} AS bucket_start,
                avg(mean) AS mean,
                avg(median) AS median,
                avg(over_1) AS over_1,
                avg(over_5) AS over_5,
                avg(over_10) AS over_10,
                avg(over_15) AS over_15,
                avg(over_20) AS over_20,
                avg(over_25) AS over_25,
                avg(over_30) AS over_30,
                avg(over_50) AS over_50,
                avg(over_100) AS over_100
            FROM {table_name}
            WHERE chrom = {chromosome_parameter}
              AND posbin IN ({bin_parameters})
              AND ({position_predicate})
            GROUP BY bucket_start
            ORDER BY bucket_start
            "
        );
        let batches = self
            .context
            .sql(&query)
            .await?
            .with_param_values(parameters)?
            .collect()
            .await?;
        let buckets = decode_record_batches(&batches, format_args!("coverage for {gene_id}"))?;
        Ok(CoverageHistogram {
            bucket_size,
            buckets,
        })
    }
}

/// Matches the API's `max(floor(totalRegionSize / 500), 1)`, which sums `stop - start` per interval.
fn choose_bucket_size(padded_intervals: &[GenomicInterval]) -> Result<i32> {
    let total_size = padded_intervals
        .iter()
        .map(|interval| i64::from(interval.stop()).saturating_sub(i64::from(interval.start())))
        .fold(0_i64, i64::saturating_add);
    let bucket_size = total_size.saturating_div(TARGET_BUCKET_COUNT).max(1);
    i32::try_from(bucket_size).map_err(|_| {
        DataFusionError::Plan(format!(
            "Coverage bucket size {bucket_size} does not fit a position"
        ))
    })
}

#[cfg(test)]
mod tests {
    use super::choose_bucket_size;
    use crate::GenomicInterval;

    fn bucket_size(bounds: &[(i32, i32)]) -> i32 {
        let intervals: Vec<_> = bounds
            .iter()
            .map(|&(start, stop)| GenomicInterval::new("17", start, stop).expect("valid interval"))
            .collect();
        choose_bucket_size(&intervals).expect("bucket size fits")
    }

    #[test]
    fn divides_the_summed_lengths_into_about_500_buckets() {
        assert_eq!(bucket_size(&[(1, 7_001)]), 14);
        assert_eq!(bucket_size(&[(1, 3_001), (10_001, 14_001)]), 14);
    }

    #[test]
    fn measures_each_interval_as_stop_minus_start() {
        assert_eq!(bucket_size(&[(1, 1_000)]), 1);
        assert_eq!(bucket_size(&[(1, 1_001)]), 2);
    }

    #[test]
    fn uses_one_base_buckets_for_short_intervals() {
        assert_eq!(bucket_size(&[(100, 100)]), 1);
        assert_eq!(bucket_size(&[(100, 400)]), 1);
    }
}
