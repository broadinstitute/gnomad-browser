mod clinvar;
mod gene;

use napi::bindgen_prelude::{Either, Null};
use napi_derive::napi;

use crate::{Chromosome, GenomicInterval, GenomicIntervalError};

/// Use unpadded, one-based, inclusive coordinates.
#[napi(object)]
pub struct GenomicIntervalBounds {
    pub start: i32,
    pub stop: i32,
}

fn into_nullable<T>(value: Option<T>) -> Either<T, Null> {
    value.map_or(Either::B(Null), Either::A)
}

fn into_napi_error(error: &impl std::fmt::Display) -> napi::Error {
    napi::Error::from_reason(error.to_string())
}

fn map_interval_error(error: &GenomicIntervalError) -> napi::Error {
    napi::Error::new(
        napi::Status::InvalidArg,
        format!("Invalid genomic interval: {error}"),
    )
}

fn parse_genomic_intervals(
    chromosome: &str,
    intervals: &[GenomicIntervalBounds],
) -> napi::Result<Vec<GenomicInterval>> {
    let chromosome = chromosome
        .parse::<Chromosome>()
        .map_err(|error| map_interval_error(&error))?;
    intervals
        .iter()
        .map(|interval| {
            GenomicInterval::new(chromosome.as_str(), interval.start, interval.stop)
                .map_err(|error| map_interval_error(&error))
        })
        .collect()
}
