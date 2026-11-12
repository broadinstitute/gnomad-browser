#![allow(
    clippy::panic_in_result_fn,
    reason = "Test assertions must fail the test; Result propagates setup errors."
)]

use datafusion::error::{DataFusionError, Result};
use gnomad_data_store::{
    CoverageBucket, CoverageDataset, CoverageReader, GenomicInterval,
    create_datafusion_context_from_root,
};

mod fixtures;

const TTC19: &str = "ENSG00000011295";

/// Every TTC19 exon feature (CDS, UTR and exon), as the API passes them.
const TTC19_EXONS: [(i32, i32); 31] = [
    (15_999_784, 16_000_032),
    (16_000_118, 16_000_382),
    (16_001_915, 16_002_025),
    (16_002_657, 16_002_665),
    (16_002_793, 16_002_831),
    (16_003_831, 16_003_887),
    (16_004_201, 16_004_262),
    (16_006_474, 16_006_568),
    (16_025_017, 16_025_171),
    (16_026_540, 16_026_707),
    (16_027_374, 16_027_519),
    (16_044_503, 16_044_552),
    (15_999_824, 15_999_848),
    (16_001_916, 16_002_025),
    (16_002_657, 16_002_831),
    (16_003_831, 16_003_887),
    (16_004_201, 16_004_262),
    (16_006_474, 16_006_568),
    (16_025_017, 16_025_171),
    (16_026_540, 16_026_702),
    (16_026_708, 16_027_080),
    (16_027_374, 16_029_404),
    (16_044_553, 16_045_015),
    (15_999_824, 16_000_460),
    (16_001_915, 16_002_025),
    (16_002_793, 16_002_831),
    (16_003_831, 16_003_887),
    (16_004_201, 16_004_262),
    (16_006_474, 16_006_568),
    (16_023_673, 16_025_171),
    (16_026_540, 16_028_786),
];

struct ExpectedBucket {
    bucket_start: i32,
    mean: f64,
    median: f64,
    /// `over_1` to `over_100` as the API returns them, rounded up to two decimals.
    rounded_over_x: [f64; 9],
}

// From the production API's Elasticsearch-backed `gene.coverage(dataset: gnomad_r4).exome` for TTC19.
const ELASTICSEARCH_TTC19_BUCKETS: [ExpectedBucket; 4] = [
    ExpectedBucket {
        bucket_start: 15_999_704,
        mean: 26.939_767_938_791_12,
        median: 28.666_666_666_666_668,
        rounded_over_x: [1.0, 1.0, 0.96, 0.92, 0.84, 0.7, 0.44, 0.01, 0.01],
    },
    ExpectedBucket {
        bucket_start: 15_999_998,
        mean: 24.860_772_688_424_35,
        median: 30.0,
        rounded_over_x: [1.0, 0.92, 0.76, 0.73, 0.71, 0.7, 0.53, 0.02, 0.01],
    },
    ExpectedBucket {
        bucket_start: 16_026_542,
        mean: 35.529_248_554_077_306,
        median: 31.857_142_857_142_858,
        rounded_over_x: [1.0, 1.0, 1.0, 1.0, 1.0, 0.97, 0.73, 0.07, 0.04],
    },
    ExpectedBucket {
        bucket_start: 16_045_064,
        mean: 4.012_522_111_726_295,
        median: 0.0,
        rounded_over_x: [0.43, 0.34, 0.15, 0.07, 0.05, 0.03, 0.01, 0.01, 0.0],
    },
];

async fn create_reader() -> Result<CoverageReader> {
    let dataset = CoverageDataset::GnomadV4Exome;
    let context =
        create_datafusion_context_from_root(fixtures::root_directory(), dataset.parquet_dataset())
            .await?;
    Ok(CoverageReader::new(context, dataset))
}

fn intervals(chromosome: &str, bounds: &[(i32, i32)]) -> Result<Vec<GenomicInterval>> {
    bounds
        .iter()
        .map(|&(start, stop)| {
            GenomicInterval::new(chromosome, start, stop)
                .map_err(|error| DataFusionError::Plan(error.to_string()))
        })
        .collect()
}

fn collect_bucket_starts(buckets: &[CoverageBucket]) -> Vec<i32> {
    buckets.iter().map(|bucket| bucket.bucket_start).collect()
}

const fn over_x(bucket: &CoverageBucket) -> [Option<f64>; 9] {
    [
        bucket.over_1,
        bucket.over_5,
        bucket.over_10,
        bucket.over_15,
        bucket.over_20,
        bucket.over_25,
        bucket.over_30,
        bucket.over_50,
        bucket.over_100,
    ]
}

fn assert_close(actual: Option<f64>, expected: f64, label: &str) {
    let actual = actual.unwrap_or(f64::NAN);
    assert!(
        (actual - expected).abs() < 1e-9,
        "{label}: {actual} != {expected}"
    );
}

#[tokio::test]
async fn ttc19_buckets_are_the_non_empty_buckets_of_the_elasticsearch_histogram() -> Result<()> {
    let reader = create_reader().await?;

    let histogram = reader
        .fetch_coverage_in_gene(TTC19, &intervals("17", &TTC19_EXONS)?)
        .await?;

    assert_eq!(histogram.bucket_size, 14);
    let bucket_starts = collect_bucket_starts(&histogram.buckets);
    assert_eq!(bucket_starts.len(), 514);
    assert_eq!(bucket_starts.first(), Some(&15_999_704));
    assert_eq!(bucket_starts.last(), Some(&16_045_064));
    assert!(bucket_starts.windows(2).all(|pair| pair[0] < pair[1]));
    assert!(bucket_starts.iter().all(|start| start % 14 == 0));
    Ok(())
}

#[tokio::test]
async fn ttc19_bucket_averages_match_elasticsearch() -> Result<()> {
    let reader = create_reader().await?;

    let histogram = reader
        .fetch_coverage_in_gene(TTC19, &intervals("17", &TTC19_EXONS)?)
        .await?;

    for expected in &ELASTICSEARCH_TTC19_BUCKETS {
        let start = expected.bucket_start;
        let bucket = histogram
            .buckets
            .iter()
            .find(|bucket| bucket.bucket_start == start)
            .ok_or_else(|| DataFusionError::Execution(format!("bucket {start} missing")))?;
        assert_close(bucket.mean, expected.mean, &format!("{start} mean"));
        assert_close(bucket.median, expected.median, &format!("{start} median"));
        for (actual, rounded) in over_x(bucket).into_iter().zip(expected.rounded_over_x) {
            let actual = actual.unwrap_or(f64::NAN);
            assert!(
                actual > rounded - 0.01 && actual <= rounded,
                "{start} over_x: {actual} does not round up to {rounded}"
            );
        }
    }
    Ok(())
}

#[tokio::test]
async fn positions_beyond_the_75_base_padding_are_excluded() -> Result<()> {
    let reader = create_reader().await?;

    // The fixture holds covered positions 16,044,423 to 16,045,065 without gaps.
    let histogram = reader
        .fetch_coverage_in_gene(TTC19, &intervals("17", &[(16_044_503, 16_044_503)])?)
        .await?;

    assert_eq!(histogram.bucket_size, 1);
    let bucket_starts = collect_bucket_starts(&histogram.buckets);
    assert_eq!(bucket_starts, (16_044_428..=16_044_578).collect::<Vec<_>>());
    Ok(())
}

#[tokio::test]
async fn no_exons_return_no_buckets() -> Result<()> {
    let reader = create_reader().await?;

    let histogram = reader.fetch_coverage_in_gene(TTC19, &[]).await?;

    assert_eq!(histogram.buckets, []);
    Ok(())
}

#[tokio::test]
async fn exons_on_two_chromosomes_are_rejected() -> Result<()> {
    let reader = create_reader().await?;
    let mut exons = intervals("17", &[(16_044_503, 16_044_552)])?;
    exons.extend(intervals("1", &[(100, 200)])?);

    let result = reader.fetch_coverage_in_gene(TTC19, &exons).await;

    assert!(
        result.is_err_and(|error| error.to_string().contains("more than one chromosome")),
        "expected a chromosome error"
    );
    Ok(())
}
