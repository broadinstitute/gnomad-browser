#![allow(
    clippy::trailing_empty_array,
    reason = "NAPI.rs generates callback bookkeeping structs with trailing empty arrays."
)]

use datafusion::arrow::json::WriterBuilder;
use datafusion::arrow::json::writer::JsonArray;
use datafusion::arrow::record_batch::RecordBatch;
use napi_derive::napi;

use super::{GenomicIntervalBounds, into_napi_error, parse_genomic_intervals};
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

#[napi]
impl GnomadV4Store {
    /// Return a JSON array of variant objects with `snake_case` fields and explicit nulls. Pad each
    /// interval by 75 bases; `subset` is `all` or `non_ukb` and selects the exome frequencies.
    /// Each variant keeps only this gene's consequences and the ancestry groups not split by sex.
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
