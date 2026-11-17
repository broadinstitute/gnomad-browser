use std::env::{self, VarError};
use std::future::Future;
use std::time::{Duration, Instant};

const DEFAULT_ITERATIONS: usize = 20;
const LABEL_WIDTH: usize = 18;

/// Read the number of warm repeats from `ITERATIONS`, defaulting to 20.
///
/// # Errors
/// Returns an error if `ITERATIONS` is set but is not a non-negative integer.
pub fn iterations_from_environment() -> Result<usize, String> {
    match env::var("ITERATIONS") {
        Ok(value) => value
            .parse()
            .map_err(|_| format!("ITERATIONS must be a non-negative integer, got {value}")),
        Err(VarError::NotPresent) => Ok(DEFAULT_ITERATIONS),
        Err(error) => Err(format!("ITERATIONS: {error}")),
    }
}

/// # Errors
/// Returns the error from `open`.
pub async fn time_open<T, E>(
    open: impl Future<Output = Result<T, E>> + Send,
) -> Result<(T, Duration), E> {
    let started = Instant::now();
    let opened = open.await?;
    Ok((opened, started.elapsed()))
}

/// # Errors
/// Returns the first error from `query`.
pub async fn time_queries<T, E, Query, QueryFuture>(
    open_duration: Duration,
    iterations: usize,
    mut query: Query,
) -> Result<T, E>
where
    T: Send,
    Query: FnMut() -> QueryFuture + Send,
    QueryFuture: Future<Output = Result<T, E>> + Send,
{
    let started = Instant::now();
    let first_result = query().await?;
    let first_duration = started.elapsed();

    let mut warm_durations = Vec::with_capacity(iterations);
    for _ in 0..iterations {
        let started = Instant::now();
        query().await?;
        warm_durations.push(started.elapsed());
    }
    warm_durations.sort_unstable();

    print_duration("open dataset", open_duration);
    print_duration("first query", first_duration);
    print_warm_durations(&warm_durations);
    Ok(first_result)
}

fn print_warm_durations(sorted: &[Duration]) {
    let Some(&min) = sorted.first() else {
        eprintln!("{:<LABEL_WIDTH$}skipped", "warm");
        return;
    };
    let repeats = sorted.len();
    print_duration(&format!("warm min (x{repeats})"), min);
    for (name, percent) in [("p50", 50), ("p95", 95), ("p99", 99)] {
        if let Some(duration) = percentile(sorted, percent) {
            print_duration(&format!("warm {name} (x{repeats})"), duration);
        }
    }
}

fn print_duration(label: &str, duration: Duration) {
    eprintln!("{label:<LABEL_WIDTH$}{:>8.1} ms", milliseconds(duration));
}

/// Nearest-rank percentile of an ascending slice.
fn percentile(sorted: &[Duration], percent: usize) -> Option<Duration> {
    let rank = sorted.len().saturating_mul(percent).div_ceil(100);
    sorted.get(rank.saturating_sub(1)).copied()
}

fn milliseconds(duration: Duration) -> f64 {
    duration.as_secs_f64() * 1000.0
}
