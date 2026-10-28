mod clinvar;

use napi::bindgen_prelude::{Either, Null};

fn into_nullable<T>(value: Option<T>) -> Either<T, Null> {
    value.map_or(Either::B(Null), Either::A)
}

fn into_napi_error(error: &impl std::fmt::Display) -> napi::Error {
    napi::Error::from_reason(error.to_string())
}
