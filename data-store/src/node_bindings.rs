#![allow(
    clippy::trailing_empty_array,
    reason = "NAPI.rs generates callback bookkeeping structs with trailing empty arrays."
)]

use napi::bindgen_prelude::{Either, Null};
use napi_derive::napi;

use crate::{
    ClinvarCondition, ClinvarGnomadData, ClinvarGnomadSequencingData, ClinvarReader,
    ClinvarSubmission, ClinvarVariant, create_datafusion_context,
};

#[napi]
pub struct ClinvarStore {
    reader: ClinvarReader,
}

/// # Errors
/// Returns an error if the configured Parquet dataset cannot be registered.
#[allow(dead_code, reason = "Called from JavaScript through Node-API.")]
#[napi]
pub async fn open_clinvar_store(parquet_path: String) -> napi::Result<ClinvarStore> {
    let context = create_datafusion_context(&parquet_path)
        .await
        .map_err(|error| napi::Error::from_reason(error.to_string()))?;

    Ok(ClinvarStore {
        reader: ClinvarReader::new(context),
    })
}

#[napi(object)]
pub struct JsClinvarVariant {
    #[napi(js_name = "variant_id")]
    pub variant_id: String,
    pub chrom: String,
    pub pos: i32,
    #[napi(js_name = "ref")]
    pub reference_allele: String,
    pub alt: String,
    #[napi(js_name = "reference_genome")]
    pub reference_genome: String,
    #[napi(js_name = "clinvar_variation_id")]
    pub clinvar_variation_id: String,
    #[napi(js_name = "clinical_significance")]
    pub clinical_significance: String,
    #[napi(js_name = "review_status")]
    pub review_status: String,
    #[napi(js_name = "gold_stars")]
    pub gold_stars: i32,
    #[napi(js_name = "in_gnomad")]
    pub in_gnomad: bool,
    #[napi(js_name = "last_evaluated")]
    pub last_evaluated: Either<String, Null>,
    pub rsid: Either<String, Null>,
    pub submissions: Vec<JsClinvarSubmission>,
    pub gnomad: JsClinvarGnomadData,
}

impl From<ClinvarVariant> for JsClinvarVariant {
    fn from(variant: ClinvarVariant) -> Self {
        Self {
            variant_id: variant.variant_id,
            chrom: variant.chromosome,
            pos: variant.position,
            reference_allele: variant.reference_allele,
            alt: variant.alternate_allele,
            reference_genome: variant.reference_genome,
            clinvar_variation_id: variant.clinvar_variation_id,
            clinical_significance: variant.clinical_significance,
            review_status: variant.review_status,
            gold_stars: variant.gold_stars,
            in_gnomad: variant.in_gnomad,
            last_evaluated: into_nullable(variant.last_evaluated),
            rsid: into_nullable(variant.rsid),
            submissions: variant.submissions.into_iter().map(Into::into).collect(),
            gnomad: variant.gnomad.into(),
        }
    }
}

#[napi(object)]
pub struct JsClinvarSubmission {
    #[napi(js_name = "clinical_significance")]
    pub clinical_significance: Either<String, Null>,
    #[napi(js_name = "last_evaluated")]
    pub last_evaluated: Either<String, Null>,
    #[napi(js_name = "review_status")]
    pub review_status: String,
    #[napi(js_name = "submitter_name")]
    pub submitter_name: String,
    pub conditions: Vec<JsClinvarCondition>,
}

impl From<ClinvarSubmission> for JsClinvarSubmission {
    fn from(submission: ClinvarSubmission) -> Self {
        Self {
            clinical_significance: into_nullable(submission.clinical_significance),
            last_evaluated: into_nullable(submission.last_evaluated),
            review_status: submission.review_status,
            submitter_name: submission.submitter_name,
            conditions: submission.conditions.into_iter().map(Into::into).collect(),
        }
    }
}

#[napi(object)]
pub struct JsClinvarCondition {
    pub name: String,
    #[napi(js_name = "medgen_id")]
    pub medgen_id: Either<String, Null>,
}

impl From<ClinvarCondition> for JsClinvarCondition {
    fn from(condition: ClinvarCondition) -> Self {
        Self {
            name: condition.name,
            medgen_id: into_nullable(condition.medgen_id),
        }
    }
}

#[napi(object)]
pub struct JsClinvarGnomadData {
    pub exome: Either<JsClinvarGnomadSequencingData, Null>,
    pub genome: Either<JsClinvarGnomadSequencingData, Null>,
}

impl From<ClinvarGnomadData> for JsClinvarGnomadData {
    fn from(gnomad: ClinvarGnomadData) -> Self {
        Self {
            exome: into_nullable(gnomad.exome.map(Into::into)),
            genome: into_nullable(gnomad.genome.map(Into::into)),
        }
    }
}

#[napi(object)]
pub struct JsClinvarGnomadSequencingData {
    pub ac: i32,
    pub an: i32,
    pub filters: Vec<String>,
}

impl From<ClinvarGnomadSequencingData> for JsClinvarGnomadSequencingData {
    fn from(data: ClinvarGnomadSequencingData) -> Self {
        Self {
            ac: data.ac,
            an: data.an,
            filters: data.filters,
        }
    }
}

fn into_nullable<T>(value: Option<T>) -> Either<T, Null> {
    value.map_or(Either::B(Null), Either::A)
}

#[napi]
impl ClinvarStore {
    /// # Errors
    /// Returns an error if query execution, decoding, or uniqueness checks fail.
    #[napi]
    pub async fn fetch_single_variant(
        &self,
        variant_id: String,
    ) -> napi::Result<Either<JsClinvarVariant, Null>> {
        let variant = self
            .reader
            .fetch_single_variant(&variant_id)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;

        Ok(into_nullable(variant.map(JsClinvarVariant::from)))
    }
}
