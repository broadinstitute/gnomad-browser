#![allow(
    clippy::trailing_empty_array,
    reason = "NAPI.rs generates callback bookkeeping structs with trailing empty arrays."
)]

use datafusion::arrow::json::WriterBuilder;
use datafusion::arrow::json::writer::{JsonArray, LineDelimited};
use datafusion::arrow::record_batch::RecordBatch;
use napi::bindgen_prelude::{Either, Null};
use napi_derive::napi;

use super::{GenomicIntervalBounds, into_napi_error, into_nullable, parse_genomic_intervals};
use crate::{GnomadV4Reader, GnomadV4Subset, ParquetDataset, create_datafusion_context_from_root};

#[napi]
pub struct GnomadV4Store {
    reader: GnomadV4Reader,
}

/// # Errors
/// Returns an error if the configured Parquet dataset cannot be registered.
#[allow(dead_code, reason = "Called from JavaScript through Node-API.")]
#[napi]
pub async fn open_gnomad_v4_store(parquet_root: String) -> napi::Result<GnomadV4Store> {
    let context =
        create_datafusion_context_from_root(parquet_root, ParquetDataset::GnomadVariantsV4)
            .await
            .map_err(|error| into_napi_error(&error))?;

    Ok(GnomadV4Store {
        reader: GnomadV4Reader::new(context),
    })
}

fn parse_gnomad_v4_subset(subset: &str) -> napi::Result<GnomadV4Subset> {
    match subset {
        "all" => Ok(GnomadV4Subset::All),
        "non_ukb" => Ok(GnomadV4Subset::NonUkb),
        _ => Err(napi::Error::new(
            napi::Status::InvalidArg,
            format!("Invalid gnomAD v4 subset: {subset}; expected all or non_ukb"),
        )),
    }
}

// V8's JSON.parse builds these nested rows about twice as fast as Node-API setting their
// properties one by one (BRCA1 through Node: ~2.0 s -> ~1.0 s, 4-core container).
fn write_json_array(batches: &[RecordBatch]) -> napi::Result<String> {
    let mut json = Vec::new();
    let mut writer = WriterBuilder::new()
        .with_explicit_nulls(true)
        .build::<_, JsonArray>(&mut json);
    for batch in batches {
        writer
            .write(batch)
            .map_err(|error| into_napi_error(&error))?;
    }
    writer.finish().map_err(|error| into_napi_error(&error))?;
    drop(writer);
    if json.is_empty() {
        return Ok("[]".to_owned());
    }
    String::from_utf8(json).map_err(|error| into_napi_error(&error))
}

// At most one row: a JSON object, not an array.
fn write_json_object(batches: &[RecordBatch]) -> napi::Result<Option<String>> {
    let mut json = Vec::new();
    let mut writer = WriterBuilder::new()
        .with_explicit_nulls(true)
        .build::<_, LineDelimited>(&mut json);
    for batch in batches {
        writer
            .write(batch)
            .map_err(|error| into_napi_error(&error))?;
    }
    writer.finish().map_err(|error| into_napi_error(&error))?;
    drop(writer);
    if json.is_empty() {
        return Ok(None);
    }
    let object = String::from_utf8(json).map_err(|error| into_napi_error(&error))?;
    Ok(Some(object.trim_end().to_owned()))
}

#[napi]
impl GnomadV4Store {
    /// Return the variant as a JSON object with `snake_case` fields and explicit nulls, or null if
    /// the dataset has no such variant. Subset filtering and shaping are left to the API.
    ///
    /// # Errors
    /// Rejects IDs not in `chrom-pos-ref-alt` form and propagates query, duplicate-record and
    /// serialization errors.
    #[napi]
    pub async fn fetch_single_variant_json(
        &self,
        variant_id: String,
    ) -> napi::Result<Either<String, Null>> {
        let batches = self
            .reader
            .fetch_single_variant_batches(&variant_id)
            .await
            .map_err(|error| into_napi_error(&error))?;
        Ok(into_nullable(write_json_object(&batches)?))
    }

    /// Return a JSON array of variant objects with `snake_case` fields and explicit nulls. Pad each
    /// interval by 75 bases; `subset` is `all` or `non_ukb` and selects the exome frequencies.
    /// Each variant keeps this gene's first consequence, its later consequences with a `LoF`
    /// annotation, and the ancestry groups not split by sex.
    ///
    /// # Errors
    /// Rejects invalid subsets, chromosomes or bounds, and propagates annotation, padding, query
    /// and serialization errors.
    #[napi]
    pub async fn fetch_variants_in_gene_json(
        &self,
        gene_id: String,
        chromosome: String,
        intervals: Vec<GenomicIntervalBounds>,
        subset: String,
    ) -> napi::Result<String> {
        let subset = parse_gnomad_v4_subset(&subset)?;
        let intervals = parse_genomic_intervals(&chromosome, &intervals)?;
        let batches = self
            .reader
            .fetch_variant_batches_in_gene(&gene_id, &intervals, subset)
            .await
            .map_err(|error| into_napi_error(&error))?;
        write_json_array(&batches)
    }

    /// Return a JSON array of variant objects with `snake_case` fields and explicit nulls. Pad each
    /// interval by 75 bases; `subset` is `all` or `non_ukb` and selects the exome frequencies.
    /// Each variant keeps only this transcript's consequence and the ancestry groups not split by
    /// sex.
    ///
    /// # Errors
    /// Rejects invalid subsets, chromosomes or bounds, and propagates annotation, padding, query
    /// and serialization errors.
    #[napi]
    pub async fn fetch_variants_in_transcript_json(
        &self,
        transcript_id: String,
        chromosome: String,
        intervals: Vec<GenomicIntervalBounds>,
        subset: String,
    ) -> napi::Result<String> {
        let subset = parse_gnomad_v4_subset(&subset)?;
        let intervals = parse_genomic_intervals(&chromosome, &intervals)?;
        let batches = self
            .reader
            .fetch_variant_batches_in_transcript(&transcript_id, &intervals, subset)
            .await
            .map_err(|error| into_napi_error(&error))?;
        write_json_array(&batches)
    }
}
