#![allow(
    clippy::trailing_empty_array,
    reason = "NAPI.rs generates callback bookkeeping structs with trailing empty arrays."
)]

use napi::bindgen_prelude::{Either, Null};
use napi_derive::napi;

use crate::{
    Chromosome, ClinvarCondition as ReaderClinvarCondition,
    ClinvarGnomadData as ReaderClinvarGnomadData,
    ClinvarGnomadSequencingData as ReaderClinvarGnomadSequencingData, ClinvarReader,
    ClinvarSubmission as ReaderClinvarSubmission,
    ClinvarTranscriptConsequence as ReaderClinvarTranscriptConsequence,
    ClinvarVariant as ReaderClinvarVariant,
    ClinvarVariantListEntry as ReaderClinvarVariantListEntry, GenomicInterval,
    GenomicIntervalError, create_datafusion_context,
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
pub struct ClinvarVariant {
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
    pub submissions: Vec<ClinvarSubmission>,
    pub gnomad: ClinvarGnomadData,
}

impl From<ReaderClinvarVariant> for ClinvarVariant {
    fn from(variant: ReaderClinvarVariant) -> Self {
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
pub struct ClinvarSubmission {
    #[napi(js_name = "clinical_significance")]
    pub clinical_significance: Either<String, Null>,
    #[napi(js_name = "last_evaluated")]
    pub last_evaluated: Either<String, Null>,
    #[napi(js_name = "review_status")]
    pub review_status: String,
    #[napi(js_name = "submitter_name")]
    pub submitter_name: String,
    pub conditions: Vec<ClinvarCondition>,
}

impl From<ReaderClinvarSubmission> for ClinvarSubmission {
    fn from(submission: ReaderClinvarSubmission) -> Self {
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
pub struct ClinvarCondition {
    pub name: String,
    #[napi(js_name = "medgen_id")]
    pub medgen_id: Either<String, Null>,
}

impl From<ReaderClinvarCondition> for ClinvarCondition {
    fn from(condition: ReaderClinvarCondition) -> Self {
        Self {
            name: condition.name,
            medgen_id: into_nullable(condition.medgen_id),
        }
    }
}

#[napi(object)]
pub struct ClinvarGnomadData {
    pub exome: Either<ClinvarGnomadSequencingData, Null>,
    pub genome: Either<ClinvarGnomadSequencingData, Null>,
}

impl From<ReaderClinvarGnomadData> for ClinvarGnomadData {
    fn from(gnomad: ReaderClinvarGnomadData) -> Self {
        Self {
            exome: into_nullable(gnomad.exome.map(Into::into)),
            genome: into_nullable(gnomad.genome.map(Into::into)),
        }
    }
}

#[napi(object)]
pub struct ClinvarGnomadSequencingData {
    pub ac: i32,
    pub an: i32,
    pub filters: Vec<String>,
}

impl From<ReaderClinvarGnomadSequencingData> for ClinvarGnomadSequencingData {
    fn from(data: ReaderClinvarGnomadSequencingData) -> Self {
        Self {
            ac: data.ac,
            an: data.an,
            filters: data.filters,
        }
    }
}

#[napi(object)]
pub struct ClinvarTranscriptConsequence {
    #[napi(js_name = "transcript_id")]
    pub transcript_id: Either<String, Null>,
    #[napi(js_name = "major_consequence")]
    pub major_consequence: Either<String, Null>,
    pub hgvsc: Either<String, Null>,
    pub hgvsp: Either<String, Null>,
}

impl From<ReaderClinvarTranscriptConsequence> for ClinvarTranscriptConsequence {
    fn from(consequence: ReaderClinvarTranscriptConsequence) -> Self {
        Self {
            transcript_id: into_nullable(consequence.transcript_id),
            major_consequence: into_nullable(consequence.major_consequence),
            hgvsc: into_nullable(consequence.hgvsc),
            hgvsp: into_nullable(consequence.hgvsp),
        }
    }
}

#[napi(object)]
pub struct ClinvarVariantListEntry {
    #[napi(js_name = "variant_id")]
    pub variant_id: String,
    #[napi(js_name = "reference_genome")]
    pub reference_genome: String,
    pub chrom: String,
    pub pos: i32,
    #[napi(js_name = "ref")]
    pub reference_allele: String,
    pub alt: String,
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
    pub gnomad: ClinvarGnomadData,
    #[napi(js_name = "transcript_consequence")]
    pub transcript_consequence: Either<ClinvarTranscriptConsequence, Null>,
}

impl From<ReaderClinvarVariantListEntry> for ClinvarVariantListEntry {
    fn from(variant: ReaderClinvarVariantListEntry) -> Self {
        Self {
            variant_id: variant.variant_id,
            reference_genome: variant.reference_genome,
            chrom: variant.chromosome,
            pos: variant.position,
            reference_allele: variant.reference_allele,
            alt: variant.alternate_allele,
            clinvar_variation_id: variant.clinvar_variation_id,
            clinical_significance: variant.clinical_significance,
            review_status: variant.review_status,
            gold_stars: variant.gold_stars,
            in_gnomad: variant.in_gnomad,
            gnomad: variant.gnomad.into(),
            transcript_consequence: into_nullable(variant.transcript_consequence.map(Into::into)),
        }
    }
}

/// Use unpadded, one-based, inclusive coordinates.
#[napi(object)]
pub struct GenomicIntervalBounds {
    pub start: i32,
    pub stop: i32,
}

fn map_interval_error(error: &GenomicIntervalError) -> napi::Error {
    napi::Error::new(
        napi::Status::InvalidArg,
        format!("Invalid genomic interval: {error:?}"),
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
    ) -> napi::Result<Either<ClinvarVariant, Null>> {
        let variant = self
            .reader
            .fetch_single_variant(&variant_id)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;

        Ok(into_nullable(variant.map(ClinvarVariant::from)))
    }

    /// Pad each interval by 75 bases and select the requested gene's consequence.
    ///
    /// # Errors
    /// Rejects invalid chromosomes or bounds and propagates annotation, padding, and query errors.
    #[napi]
    pub async fn fetch_variants_in_gene(
        &self,
        gene_id: String,
        chromosome: String,
        intervals: Vec<GenomicIntervalBounds>,
    ) -> napi::Result<Vec<ClinvarVariantListEntry>> {
        let intervals = parse_genomic_intervals(&chromosome, &intervals)?;
        let variants = self
            .reader
            .fetch_variants_in_gene(&gene_id, &intervals)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;

        Ok(variants.into_iter().map(Into::into).collect())
    }

    /// Pad each interval by 75 bases and select the requested transcript's consequence.
    ///
    /// # Errors
    /// Rejects invalid chromosomes or bounds and propagates annotation, padding, and query errors.
    #[napi]
    pub async fn fetch_variants_in_transcript(
        &self,
        transcript_id: String,
        chromosome: String,
        intervals: Vec<GenomicIntervalBounds>,
    ) -> napi::Result<Vec<ClinvarVariantListEntry>> {
        let intervals = parse_genomic_intervals(&chromosome, &intervals)?;
        let variants = self
            .reader
            .fetch_variants_in_transcript(&transcript_id, &intervals)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;

        Ok(variants.into_iter().map(Into::into).collect())
    }

    /// # Errors
    /// Rejects invalid intervals and propagates query or result-decoding failures.
    #[napi]
    pub async fn fetch_variants_in_region(
        &self,
        chromosome: String,
        start: i32,
        stop: i32,
    ) -> napi::Result<Vec<ClinvarVariantListEntry>> {
        let interval = GenomicInterval::new(&chromosome, start, stop).map_err(|error| {
            napi::Error::new(
                napi::Status::InvalidArg,
                format!("Invalid genomic interval: {error:?}"),
            )
        })?;

        let variants = self
            .reader
            .fetch_variants_in_region(&interval)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;

        Ok(variants.into_iter().map(Into::into).collect())
    }
}
