mod clinvar;

use napi::bindgen_prelude::{Either, Null};

use crate::GenomicIntervalError;

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
