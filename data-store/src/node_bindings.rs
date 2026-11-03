#![allow(
    clippy::trailing_empty_array,
    reason = "NAPI.rs generates callback bookkeeping structs with trailing empty arrays."
)]

use napi::bindgen_prelude::{Either, Null};
use napi_derive::napi;

use crate::gnomad_v4_variant as source;
use crate::gnomad_v4_variant_list_entry as gnomad_v4_source;
use crate::{
    Chromosome, ClinvarCondition as ReaderClinvarCondition,
    ClinvarGnomadData as ReaderClinvarGnomadData,
    ClinvarGnomadSequencingData as ReaderClinvarGnomadSequencingData, ClinvarReader,
    ClinvarSubmission as ReaderClinvarSubmission,
    ClinvarTranscriptConsequence as ReaderClinvarTranscriptConsequence,
    ClinvarVariant as ReaderClinvarVariant,
    ClinvarVariantListEntry as ReaderClinvarVariantListEntry, Gene as ReaderGene,
    GeneExon as ReaderGeneExon, GeneGnomadConstraint as ReaderGeneGnomadConstraint,
    GeneInterval as ReaderGeneInterval, GeneLocus as ReaderGeneLocus,
    GeneManeSelectTranscript as ReaderGeneManeSelectTranscript, GenePext as ReaderGenePext,
    GenePextRegion as ReaderGenePextRegion, GeneReader,
    GeneTissueExpression as ReaderGeneTissueExpression, GeneTranscript as ReaderGeneTranscript,
    GenomicInterval, GenomicIntervalError, GnomadV4Reader, GnomadV4Subset, ParquetDataset,
    RegionGene as ReaderRegionGene, RegionGeneTranscript as ReaderRegionGeneTranscript,
    create_datafusion_context_from_root,
};

#[napi]
pub struct ClinvarStore {
    reader: ClinvarReader,
}

/// # Errors
/// Returns an error if the configured Parquet dataset cannot be registered.
#[allow(dead_code, reason = "Called from JavaScript through Node-API.")]
#[napi]
pub async fn open_clinvar_store(parquet_root: String) -> napi::Result<ClinvarStore> {
    let context =
        create_datafusion_context_from_root(parquet_root, ParquetDataset::ClinvarVariantsGrch38)
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

#[napi]
pub struct GnomadV4Store {
    reader: GnomadV4Reader,
}

/// # Errors
/// Reject dataset registration failures under the supplied Parquet root.
#[allow(dead_code, reason = "Called from JavaScript through Node-API.")]
#[napi]
pub async fn open_gnomad_v4_store(parquet_root: String) -> napi::Result<GnomadV4Store> {
    let reader = GnomadV4Reader::open(parquet_root)
        .await
        .map_err(|error| napi::Error::from_reason(error.to_string()))?;
    Ok(GnomadV4Store { reader })
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

#[napi]
impl GnomadV4Store {
    /// # Errors
    /// Reject invalid IDs, query/decoding failures, multiple matches, or unsafe JavaScript integers.
    #[napi]
    pub async fn fetch_single_variant(
        &self,
        variant_id: String,
    ) -> napi::Result<Either<GnomadV4Variant, Null>> {
        let variant = self
            .reader
            .fetch_single_variant(&variant_id)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;
        let variant = variant
            .map(GnomadV4Variant::try_from)
            .transpose()
            .map_err(|error| {
                napi::Error::from_reason(format!(
                    "Cannot convert gnomAD v4 variant {variant_id} to JavaScript: {error}"
                ))
            })?;
        Ok(into_nullable(variant))
    }

    /// # Errors
    /// Reject invalid subsets, intervals, query failures, or unsafe JavaScript integer conversions.
    #[napi]
    pub async fn fetch_variants_in_region(
        &self,
        chromosome: String,
        start: i32,
        stop: i32,
        subset: String,
    ) -> napi::Result<Vec<GnomadV4VariantListEntry>> {
        let subset = parse_gnomad_v4_subset(&subset)?;
        let interval = GenomicInterval::new(&chromosome, start, stop)
            .map_err(|error| map_interval_error(&error))?;
        let variants = self
            .reader
            .fetch_variants_in_region(&interval, subset)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;
        variants.into_iter().map(TryInto::try_into).collect()
    }

    /// # Errors
    /// Reject invalid subsets, intervals, query failures, or unsafe JavaScript integer conversions.
    #[napi]
    pub async fn fetch_variants_in_gene(
        &self,
        gene_id: String,
        chromosome: String,
        intervals: Vec<GenomicIntervalBounds>,
        subset: String,
    ) -> napi::Result<Vec<GnomadV4VariantListEntry>> {
        let subset = parse_gnomad_v4_subset(&subset)?;
        let intervals = parse_genomic_intervals(&chromosome, &intervals)?;
        let variants = self
            .reader
            .fetch_variants_in_gene(&gene_id, &intervals, subset)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;
        variants.into_iter().map(TryInto::try_into).collect()
    }

    /// # Errors
    /// Reject invalid subsets, intervals, query failures, or unsafe JavaScript integer conversions.
    #[napi]
    pub async fn fetch_variants_in_transcript(
        &self,
        transcript_id: String,
        chromosome: String,
        intervals: Vec<GenomicIntervalBounds>,
        subset: String,
    ) -> napi::Result<Vec<GnomadV4VariantListEntry>> {
        let subset = parse_gnomad_v4_subset(&subset)?;
        let intervals = parse_genomic_intervals(&chromosome, &intervals)?;
        let variants = self
            .reader
            .fetch_variants_in_transcript(&transcript_id, &intervals, subset)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;
        variants.into_iter().map(TryInto::try_into).collect()
    }
}

#[napi(object)]
pub struct GnomadV4VariantListEntry {
    #[napi(js_name = "variant_id")]
    pub variant_id: String,
    pub locus: GnomadV4Locus,
    pub alleles: Vec<String>,
    pub rsids: Option<Vec<String>>,
    pub flags: Option<Vec<String>>,
    pub exome: GnomadV4ExomeData,
    pub genome: GnomadV4GenomeData,
    pub joint: GnomadV4JointData,
    #[napi(js_name = "transcript_consequences")]
    pub transcript_consequences: Vec<GnomadV4TranscriptConsequence>,
    #[napi(js_name = "in_silico_predictors")]
    pub in_silico_predictors: GnomadV4InSilicoPredictors,
}

impl TryFrom<gnomad_v4_source::GnomadV4VariantListEntry> for GnomadV4VariantListEntry {
    type Error = napi::Error;

    fn try_from(variant: gnomad_v4_source::GnomadV4VariantListEntry) -> napi::Result<Self> {
        Ok(Self {
            variant_id: variant.variant_id,
            locus: variant.locus.into(),
            alleles: variant.alleles,
            rsids: variant.rsids,
            flags: variant.flags,
            exome: variant.exome.try_into()?,
            genome: variant.genome.try_into()?,
            joint: variant.joint.try_into()?,
            transcript_consequences: variant
                .transcript_consequences
                .into_iter()
                .map(Into::into)
                .collect(),
            in_silico_predictors: variant.in_silico_predictors.into(),
        })
    }
}

#[napi(object)]
pub struct GnomadV4Locus {
    pub contig: String,
    pub position: i32,
}

impl From<gnomad_v4_source::GnomadV4Locus> for GnomadV4Locus {
    fn from(locus: gnomad_v4_source::GnomadV4Locus) -> Self {
        Self {
            contig: locus.contig,
            position: locus.position,
        }
    }
}

#[napi(object)]
pub struct GnomadV4ExomeData {
    pub freq: GnomadV4FrequencySubsets,
    pub filters: Option<Vec<String>>,
    pub flags: Option<Vec<String>>,
    pub fafmax: GnomadV4ExomeFilteringAlleleFrequencies,
}

impl TryFrom<gnomad_v4_source::GnomadV4ExomeData> for GnomadV4ExomeData {
    type Error = napi::Error;

    fn try_from(data: gnomad_v4_source::GnomadV4ExomeData) -> napi::Result<Self> {
        Ok(Self {
            freq: data.freq.try_into()?,
            filters: data.filters,
            flags: data.flags,
            fafmax: data.fafmax.into(),
        })
    }
}

#[napi(object)]
pub struct GnomadV4GenomeData {
    pub freq: GnomadV4FrequencySubsets,
    pub filters: Option<Vec<String>>,
    pub flags: Option<Vec<String>>,
}

impl TryFrom<gnomad_v4_source::GnomadV4GenomeData> for GnomadV4GenomeData {
    type Error = napi::Error;

    fn try_from(data: gnomad_v4_source::GnomadV4GenomeData) -> napi::Result<Self> {
        Ok(Self {
            freq: data.freq.try_into()?,
            filters: data.filters,
            flags: data.flags,
        })
    }
}

#[napi(object)]
pub struct GnomadV4JointData {
    pub freq: GnomadV4FrequencySubsets,
    pub filters: Option<Vec<String>>,
    pub fafmax: GnomadV4FilteringAlleleFrequency,
}

impl TryFrom<gnomad_v4_source::GnomadV4JointData> for GnomadV4JointData {
    type Error = napi::Error;

    fn try_from(data: gnomad_v4_source::GnomadV4JointData) -> napi::Result<Self> {
        Ok(Self {
            freq: data.freq.try_into()?,
            filters: data.filters,
            fafmax: data.fafmax.into(),
        })
    }
}

#[napi(object)]
pub struct GnomadV4FrequencySubsets {
    pub all: Option<GnomadV4Frequency>,
    #[napi(js_name = "non_ukb")]
    pub non_ukb: Option<GnomadV4Frequency>,
}

impl TryFrom<gnomad_v4_source::GnomadV4FrequencySubsets> for GnomadV4FrequencySubsets {
    type Error = napi::Error;

    fn try_from(frequencies: gnomad_v4_source::GnomadV4FrequencySubsets) -> napi::Result<Self> {
        Ok(Self {
            all: frequencies.all.map(TryInto::try_into).transpose()?,
            non_ukb: frequencies.non_ukb.map(TryInto::try_into).transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4Frequency {
    pub ac: Option<i32>,
    #[napi(js_name = "ac_raw")]
    pub ac_raw: Option<i32>,
    pub an: Option<i32>,
    #[napi(js_name = "hemizygote_count")]
    pub hemizygote_count: Option<i32>,
    #[napi(js_name = "homozygote_count")]
    pub homozygote_count: Option<i64>,
    #[napi(js_name = "ancestry_groups")]
    pub ancestry_groups: Option<Vec<GnomadV4AncestryFrequency>>,
}

impl TryFrom<gnomad_v4_source::GnomadV4Frequency> for GnomadV4Frequency {
    type Error = napi::Error;

    fn try_from(frequency: gnomad_v4_source::GnomadV4Frequency) -> napi::Result<Self> {
        Ok(Self {
            ac: frequency.ac,
            ac_raw: frequency.ac_raw,
            an: frequency.an,
            hemizygote_count: frequency.hemizygote_count,
            homozygote_count: frequency
                .homozygote_count
                .map(|value| checked_js_integer(value, "freq.homozygote_count"))
                .transpose()?,
            ancestry_groups: frequency
                .ancestry_groups
                .map(|groups| {
                    groups
                        .into_iter()
                        .map(TryInto::try_into)
                        .collect::<napi::Result<Vec<_>>>()
                })
                .transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4AncestryFrequency {
    pub id: String,
    pub ac: Option<i32>,
    pub an: Option<i32>,
    #[napi(js_name = "hemizygote_count")]
    pub hemizygote_count: Option<i32>,
    #[napi(js_name = "homozygote_count")]
    pub homozygote_count: Option<i64>,
}

impl TryFrom<gnomad_v4_source::GnomadV4AncestryFrequency> for GnomadV4AncestryFrequency {
    type Error = napi::Error;

    fn try_from(frequency: gnomad_v4_source::GnomadV4AncestryFrequency) -> napi::Result<Self> {
        Ok(Self {
            id: frequency.id,
            ac: frequency.ac,
            an: frequency.an,
            hemizygote_count: frequency.hemizygote_count,
            homozygote_count: frequency
                .homozygote_count
                .map(|value| checked_js_integer(value, "ancestry_groups.homozygote_count"))
                .transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4ExomeFilteringAlleleFrequencies {
    pub gnomad: GnomadV4FilteringAlleleFrequency,
    #[napi(js_name = "non_ukb")]
    pub non_ukb: GnomadV4FilteringAlleleFrequency,
}

impl From<gnomad_v4_source::GnomadV4ExomeFilteringAlleleFrequencies>
    for GnomadV4ExomeFilteringAlleleFrequencies
{
    fn from(frequencies: gnomad_v4_source::GnomadV4ExomeFilteringAlleleFrequencies) -> Self {
        Self {
            gnomad: frequencies.gnomad.into(),
            non_ukb: frequencies.non_ukb.into(),
        }
    }
}

#[napi(object)]
pub struct GnomadV4FilteringAlleleFrequency {
    #[napi(js_name = "faf95_max")]
    pub faf95_max: Option<f64>,
    #[napi(js_name = "faf95_max_gen_anc")]
    pub faf95_max_gen_anc: Option<String>,
    #[napi(js_name = "faf99_max")]
    pub faf99_max: Option<f64>,
    #[napi(js_name = "faf99_max_gen_anc")]
    pub faf99_max_gen_anc: Option<String>,
}

impl From<gnomad_v4_source::GnomadV4FilteringAlleleFrequency> for GnomadV4FilteringAlleleFrequency {
    fn from(frequency: gnomad_v4_source::GnomadV4FilteringAlleleFrequency) -> Self {
        Self {
            faf95_max: frequency.faf95_max,
            faf95_max_gen_anc: frequency.faf95_max_gen_anc,
            faf99_max: frequency.faf99_max,
            faf99_max_gen_anc: frequency.faf99_max_gen_anc,
        }
    }
}

#[napi(object)]
pub struct GnomadV4TranscriptConsequence {
    #[napi(js_name = "gene_id")]
    pub gene_id: Option<String>,
    #[napi(js_name = "gene_version")]
    pub gene_version: Option<String>,
    #[napi(js_name = "gene_symbol")]
    pub gene_symbol: Option<String>,
    #[napi(js_name = "transcript_id")]
    pub transcript_id: Option<String>,
    #[napi(js_name = "transcript_version")]
    pub transcript_version: Option<String>,
    pub biotype: Option<String>,
    #[napi(js_name = "consequence_terms")]
    pub consequence_terms: Option<Vec<String>>,
    #[napi(js_name = "major_consequence")]
    pub major_consequence: Option<String>,
    pub hgvsc: Option<String>,
    pub hgvsp: Option<String>,
    #[napi(js_name = "is_canonical")]
    pub is_canonical: Option<bool>,
    #[napi(js_name = "is_mane_select")]
    pub is_mane_select: Option<bool>,
    #[napi(js_name = "is_mane_select_version")]
    pub is_mane_select_version: Option<bool>,
    #[napi(js_name = "refseq_id")]
    pub refseq_id: Option<String>,
    #[napi(js_name = "refseq_version")]
    pub refseq_version: Option<String>,
    pub domains: Option<Vec<String>>,
    pub lof: Option<String>,
    #[napi(js_name = "lof_filter")]
    pub lof_filter: Option<String>,
    #[napi(js_name = "lof_flags")]
    pub lof_flags: Option<String>,
}

impl From<gnomad_v4_source::GnomadV4TranscriptConsequence> for GnomadV4TranscriptConsequence {
    fn from(consequence: gnomad_v4_source::GnomadV4TranscriptConsequence) -> Self {
        Self {
            gene_id: consequence.gene_id,
            gene_version: consequence.gene_version,
            gene_symbol: consequence.gene_symbol,
            transcript_id: consequence.transcript_id,
            transcript_version: consequence.transcript_version,
            biotype: consequence.biotype,
            consequence_terms: consequence.consequence_terms,
            major_consequence: consequence.major_consequence,
            hgvsc: consequence.hgvsc,
            hgvsp: consequence.hgvsp,
            is_canonical: consequence.is_canonical,
            is_mane_select: consequence.is_mane_select,
            is_mane_select_version: consequence.is_mane_select_version,
            refseq_id: consequence.refseq_id,
            refseq_version: consequence.refseq_version,
            domains: consequence.domains,
            lof: consequence.lof,
            lof_filter: consequence.lof_filter,
            lof_flags: consequence.lof_flags,
        }
    }
}

#[napi(object)]
pub struct GnomadV4InSilicoPredictors {
    pub cadd: GnomadV4Cadd,
    #[napi(js_name = "revel_max")]
    pub revel_max: Option<f64>,
    #[napi(js_name = "spliceai_ds_max")]
    pub spliceai_ds_max: Option<f64>,
    #[napi(js_name = "pangolin_largest_ds")]
    pub pangolin_largest_ds: Option<f64>,
    pub phylop: Option<f64>,
    #[napi(js_name = "sift_max")]
    pub sift_max: Option<f64>,
    #[napi(js_name = "polyphen_max")]
    pub polyphen_max: Option<f64>,
}

impl From<gnomad_v4_source::GnomadV4InSilicoPredictors> for GnomadV4InSilicoPredictors {
    fn from(predictors: gnomad_v4_source::GnomadV4InSilicoPredictors) -> Self {
        Self {
            cadd: predictors.cadd.into(),
            revel_max: predictors.revel_max,
            spliceai_ds_max: predictors.spliceai_ds_max.map(f64::from),
            pangolin_largest_ds: predictors.pangolin_largest_ds,
            phylop: predictors.phylop,
            sift_max: predictors.sift_max,
            polyphen_max: predictors.polyphen_max,
        }
    }
}

#[napi(object)]
pub struct GnomadV4Cadd {
    pub phred: Option<f64>,
    #[napi(js_name = "raw_score")]
    pub raw_score: Option<f64>,
}

impl From<gnomad_v4_source::GnomadV4Cadd> for GnomadV4Cadd {
    fn from(cadd: gnomad_v4_source::GnomadV4Cadd) -> Self {
        Self {
            phred: cadd.phred.map(f64::from),
            raw_score: cadd.raw_score.map(f64::from),
        }
    }
}

#[napi(object)]
pub struct GnomadV4Variant {
    #[napi(js_name = "variant_id")]
    pub variant_id: String,
    pub locus: GnomadV4Locus,
    pub alleles: Vec<String>,
    pub rsids: Option<Vec<String>>,
    pub exome: GnomadV4ExomeVariantData,
    pub genome: GnomadV4GenomeVariantData,
    pub joint: GnomadV4JointVariantData,
    #[napi(js_name = "transcript_consequences")]
    pub transcript_consequences: Option<Vec<GnomadV4TranscriptConsequence>>,
    #[napi(js_name = "in_silico_predictors")]
    pub in_silico_predictors: GnomadV4InSilicoPredictors,
    #[napi(js_name = "colocated_variants")]
    pub colocated_variants: GnomadV4ColocatedVariants,
    pub coverage: GnomadV4VariantCoverage,
    pub caid: Option<String>,
    pub vrs: Option<GnomadV4VrsAlleles>,
}

impl TryFrom<source::GnomadV4Variant> for GnomadV4Variant {
    type Error = napi::Error;

    fn try_from(variant: source::GnomadV4Variant) -> napi::Result<Self> {
        Ok(Self {
            variant_id: variant.variant_id,
            locus: variant.locus.into(),
            alleles: variant.alleles,
            rsids: variant.rsids,
            exome: variant.exome.try_into()?,
            genome: variant.genome.try_into()?,
            joint: variant.joint.try_into()?,
            transcript_consequences: variant
                .transcript_consequences
                .map(|consequences| consequences.into_iter().map(Into::into).collect()),
            in_silico_predictors: variant.in_silico_predictors.into(),
            colocated_variants: variant.colocated_variants.into(),
            coverage: variant.coverage.try_into()?,
            caid: variant.caid,
            vrs: variant.vrs.map(Into::into),
        })
    }
}

#[napi(object)]
pub struct GnomadV4ExomeVariantData {
    pub freq: GnomadV4FrequencySubsets,
    pub filters: Option<Vec<String>>,
    pub flags: Option<Vec<String>>,
    pub fafmax: GnomadV4ExomeFilteringAlleleFrequencies,
    pub faf95: Option<GnomadV4GroupMaximum>,
    pub faf99: Option<GnomadV4GroupMaximum>,
    #[napi(js_name = "age_distribution")]
    pub age_distribution: Option<GnomadV4AgeDistribution>,
    #[napi(js_name = "quality_metrics")]
    pub quality_metrics: Option<GnomadV4QualityMetrics>,
}

impl TryFrom<source::GnomadV4ExomeVariantData> for GnomadV4ExomeVariantData {
    type Error = napi::Error;

    fn try_from(data: source::GnomadV4ExomeVariantData) -> napi::Result<Self> {
        Ok(Self {
            freq: data.freq.try_into()?,
            filters: data.filters,
            flags: data.flags,
            fafmax: data.fafmax.into(),
            faf95: data.faf95.map(Into::into),
            faf99: data.faf99.map(Into::into),
            age_distribution: data.age_distribution.map(TryInto::try_into).transpose()?,
            quality_metrics: data.quality_metrics.map(TryInto::try_into).transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4GenomeVariantData {
    pub freq: GnomadV4GenomeFrequencies,
    pub filters: Option<Vec<String>>,
    pub flags: Option<Vec<String>>,
    pub fafmax: GnomadV4FilteringAlleleFrequency,
    pub faf95: Option<GnomadV4GroupMaximum>,
    pub faf99: Option<GnomadV4GroupMaximum>,
    #[napi(js_name = "age_distribution")]
    pub age_distribution: Option<GnomadV4AgeDistribution>,
    #[napi(js_name = "quality_metrics")]
    pub quality_metrics: Option<GnomadV4QualityMetrics>,
}

impl TryFrom<source::GnomadV4GenomeVariantData> for GnomadV4GenomeVariantData {
    type Error = napi::Error;

    fn try_from(data: source::GnomadV4GenomeVariantData) -> napi::Result<Self> {
        Ok(Self {
            freq: data.freq.try_into()?,
            filters: data.filters,
            flags: data.flags,
            fafmax: data.fafmax.into(),
            faf95: data.faf95.map(Into::into),
            faf99: data.faf99.map(Into::into),
            age_distribution: data.age_distribution.map(TryInto::try_into).transpose()?,
            quality_metrics: data.quality_metrics.map(TryInto::try_into).transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4GenomeFrequencies {
    pub all: Option<GnomadV4Frequency>,
    pub hgdp: Option<GnomadV4Frequency>,
    pub tgp: Option<GnomadV4Frequency>,
}

impl TryFrom<source::GnomadV4GenomeFrequencies> for GnomadV4GenomeFrequencies {
    type Error = napi::Error;

    fn try_from(frequencies: source::GnomadV4GenomeFrequencies) -> napi::Result<Self> {
        Ok(Self {
            all: frequencies.all.map(TryInto::try_into).transpose()?,
            hgdp: frequencies.hgdp.map(TryInto::try_into).transpose()?,
            tgp: frequencies.tgp.map(TryInto::try_into).transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4JointVariantData {
    pub freq: GnomadV4FrequencySubsets,
    pub fafmax: GnomadV4FilteringAlleleFrequency,
    pub flags: Option<Vec<String>>,
    #[napi(js_name = "freq_comparison_stats")]
    pub freq_comparison_stats: Option<GnomadV4FrequencyComparisonStats>,
}

impl TryFrom<source::GnomadV4JointVariantData> for GnomadV4JointVariantData {
    type Error = napi::Error;

    fn try_from(data: source::GnomadV4JointVariantData) -> napi::Result<Self> {
        Ok(Self {
            freq: data.freq.try_into()?,
            fafmax: data.fafmax.into(),
            flags: data.flags,
            freq_comparison_stats: data.freq_comparison_stats.map(Into::into),
        })
    }
}

#[napi(object)]
pub struct GnomadV4FrequencyComparisonStats {
    #[napi(js_name = "contingency_table_test")]
    pub contingency_table_test: Option<Vec<GnomadV4ContingencyTableTest>>,
    #[napi(js_name = "cochran_mantel_haenszel_test")]
    pub cochran_mantel_haenszel_test: Option<GnomadV4CochranMantelHaenszelTest>,
    #[napi(js_name = "stat_union")]
    pub stat_union: Option<GnomadV4StatUnion>,
}

impl From<source::GnomadV4FrequencyComparisonStats> for GnomadV4FrequencyComparisonStats {
    fn from(stats: source::GnomadV4FrequencyComparisonStats) -> Self {
        Self {
            contingency_table_test: stats
                .contingency_table_test
                .map(|tests| tests.into_iter().map(Into::into).collect()),
            cochran_mantel_haenszel_test: stats.cochran_mantel_haenszel_test.map(Into::into),
            stat_union: stats.stat_union.map(Into::into),
        }
    }
}

#[napi(object)]
pub struct GnomadV4ContingencyTableTest {
    #[napi(js_name = "p_value")]
    pub p_value: Option<f64>,
    #[napi(js_name = "odds_ratio")]
    pub odds_ratio: Option<f64>,
}

impl From<source::GnomadV4ContingencyTableTest> for GnomadV4ContingencyTableTest {
    fn from(test: source::GnomadV4ContingencyTableTest) -> Self {
        Self {
            p_value: test.p_value,
            odds_ratio: test.odds_ratio,
        }
    }
}

#[napi(object)]
pub struct GnomadV4CochranMantelHaenszelTest {
    #[napi(js_name = "p_value")]
    pub p_value: Option<f64>,
    pub chisq: Option<f64>,
}

impl From<source::GnomadV4CochranMantelHaenszelTest> for GnomadV4CochranMantelHaenszelTest {
    fn from(test: source::GnomadV4CochranMantelHaenszelTest) -> Self {
        Self {
            p_value: test.p_value,
            chisq: test.chisq,
        }
    }
}

#[napi(object)]
pub struct GnomadV4StatUnion {
    #[napi(js_name = "p_value")]
    pub p_value: Option<f64>,
    #[napi(js_name = "stat_test_name")]
    pub stat_test_name: Option<String>,
    #[napi(js_name = "gen_ancs")]
    pub gen_ancs: Option<Vec<String>>,
}

impl From<source::GnomadV4StatUnion> for GnomadV4StatUnion {
    fn from(stats: source::GnomadV4StatUnion) -> Self {
        Self {
            p_value: stats.p_value,
            stat_test_name: stats.stat_test_name,
            gen_ancs: stats.gen_ancs,
        }
    }
}

#[napi(object)]
pub struct GnomadV4GroupMaximum {
    pub grpmax: Option<f64>,
    #[napi(js_name = "grpmax_gen_anc")]
    pub grpmax_gen_anc: Option<String>,
}

impl From<source::GnomadV4GroupMaximum> for GnomadV4GroupMaximum {
    fn from(maximum: source::GnomadV4GroupMaximum) -> Self {
        Self {
            grpmax: maximum.grpmax,
            grpmax_gen_anc: maximum.grpmax_gen_anc,
        }
    }
}

#[napi(object)]
pub struct GnomadV4Histogram {
    #[napi(js_name = "bin_edges")]
    pub bin_edges: Option<Vec<f64>>,
    #[napi(js_name = "bin_freq")]
    pub bin_freq: Option<Vec<i64>>,
    #[napi(js_name = "n_smaller")]
    pub n_smaller: Option<i64>,
    #[napi(js_name = "n_larger")]
    pub n_larger: Option<i64>,
}

impl TryFrom<source::GnomadV4Histogram> for GnomadV4Histogram {
    type Error = napi::Error;

    fn try_from(histogram: source::GnomadV4Histogram) -> napi::Result<Self> {
        Ok(Self {
            bin_edges: histogram.bin_edges,
            bin_freq: histogram
                .bin_freq
                .map(|counts| {
                    counts
                        .into_iter()
                        .map(|count| checked_js_integer(count, "histogram.bin_freq"))
                        .collect::<napi::Result<Vec<_>>>()
                })
                .transpose()?,
            n_smaller: histogram
                .n_smaller
                .map(|count| checked_js_integer(count, "histogram.n_smaller"))
                .transpose()?,
            n_larger: histogram
                .n_larger
                .map(|count| checked_js_integer(count, "histogram.n_larger"))
                .transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4AgeDistribution {
    pub het: Option<GnomadV4Histogram>,
    pub hom: Option<GnomadV4Histogram>,
}

impl TryFrom<source::GnomadV4AgeDistribution> for GnomadV4AgeDistribution {
    type Error = napi::Error;

    fn try_from(distribution: source::GnomadV4AgeDistribution) -> napi::Result<Self> {
        Ok(Self {
            het: distribution.het.map(TryInto::try_into).transpose()?,
            hom: distribution.hom.map(TryInto::try_into).transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4QualityMetrics {
    #[napi(js_name = "allele_balance")]
    pub allele_balance: GnomadV4QualityHistograms,
    #[napi(js_name = "genotype_depth")]
    pub genotype_depth: GnomadV4QualityHistograms,
    #[napi(js_name = "genotype_quality")]
    pub genotype_quality: GnomadV4QualityHistograms,
    #[napi(js_name = "site_quality_metrics")]
    pub site_quality_metrics: Option<Vec<GnomadV4SiteQualityMetric>>,
}

impl TryFrom<source::GnomadV4QualityMetrics> for GnomadV4QualityMetrics {
    type Error = napi::Error;

    fn try_from(metrics: source::GnomadV4QualityMetrics) -> napi::Result<Self> {
        Ok(Self {
            allele_balance: metrics.allele_balance.try_into()?,
            genotype_depth: metrics.genotype_depth.try_into()?,
            genotype_quality: metrics.genotype_quality.try_into()?,
            site_quality_metrics: metrics
                .site_quality_metrics
                .map(|metrics| metrics.into_iter().map(Into::into).collect()),
        })
    }
}

#[napi(object)]
pub struct GnomadV4QualityHistograms {
    #[napi(js_name = "all_adj")]
    pub all_adj: Option<GnomadV4Histogram>,
    #[napi(js_name = "all_raw")]
    pub all_raw: Option<GnomadV4Histogram>,
    #[napi(js_name = "alt_adj")]
    pub alt_adj: Option<GnomadV4Histogram>,
    #[napi(js_name = "alt_raw")]
    pub alt_raw: Option<GnomadV4Histogram>,
}

impl TryFrom<source::GnomadV4QualityHistograms> for GnomadV4QualityHistograms {
    type Error = napi::Error;

    fn try_from(histograms: source::GnomadV4QualityHistograms) -> napi::Result<Self> {
        Ok(Self {
            all_adj: histograms.all_adj.map(TryInto::try_into).transpose()?,
            all_raw: histograms.all_raw.map(TryInto::try_into).transpose()?,
            alt_adj: histograms.alt_adj.map(TryInto::try_into).transpose()?,
            alt_raw: histograms.alt_raw.map(TryInto::try_into).transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4SiteQualityMetric {
    pub metric: String,
    pub value: Option<f64>,
}

impl From<source::GnomadV4SiteQualityMetric> for GnomadV4SiteQualityMetric {
    fn from(metric: source::GnomadV4SiteQualityMetric) -> Self {
        Self {
            metric: metric.metric,
            value: metric.value,
        }
    }
}

#[napi(object)]
pub struct GnomadV4ColocatedVariants {
    pub all: Option<Vec<String>>,
    #[napi(js_name = "non_ukb")]
    pub non_ukb: Option<Vec<String>>,
    pub hgdp: Option<Vec<String>>,
    pub tgp: Option<Vec<String>>,
}

impl From<source::GnomadV4ColocatedVariants> for GnomadV4ColocatedVariants {
    fn from(variants: source::GnomadV4ColocatedVariants) -> Self {
        Self {
            all: variants.all,
            non_ukb: variants.non_ukb,
            hgdp: variants.hgdp,
            tgp: variants.tgp,
        }
    }
}

#[napi(object)]
pub struct GnomadV4VariantCoverage {
    pub exome: Option<GnomadV4Coverage>,
    pub genome: Option<GnomadV4Coverage>,
}

impl TryFrom<source::GnomadV4VariantCoverage> for GnomadV4VariantCoverage {
    type Error = napi::Error;

    fn try_from(coverage: source::GnomadV4VariantCoverage) -> napi::Result<Self> {
        Ok(Self {
            exome: coverage.exome.map(TryInto::try_into).transpose()?,
            genome: coverage.genome.map(TryInto::try_into).transpose()?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4Coverage {
    pub mean: Option<f64>,
    #[napi(js_name = "median_approx")]
    pub median_approx: Option<i32>,
    #[napi(js_name = "total_DP")]
    pub total_depth: Option<i64>,
    #[napi(js_name = "over_1")]
    pub over_1: Option<f64>,
    #[napi(js_name = "over_5")]
    pub over_5: Option<f64>,
    #[napi(js_name = "over_10")]
    pub over_10: Option<f64>,
    #[napi(js_name = "over_15")]
    pub over_15: Option<f64>,
    #[napi(js_name = "over_20")]
    pub over_20: Option<f64>,
    #[napi(js_name = "over_25")]
    pub over_25: Option<f64>,
    #[napi(js_name = "over_30")]
    pub over_30: Option<f64>,
    #[napi(js_name = "over_50")]
    pub over_50: Option<f64>,
    #[napi(js_name = "over_100")]
    pub over_100: Option<f64>,
}

impl TryFrom<source::GnomadV4Coverage> for GnomadV4Coverage {
    type Error = napi::Error;

    fn try_from(coverage: source::GnomadV4Coverage) -> napi::Result<Self> {
        Ok(Self {
            mean: coverage.mean,
            median_approx: coverage.median_approx,
            total_depth: coverage
                .total_depth
                .map(|value| checked_js_integer(value, "coverage.total_DP"))
                .transpose()?,
            over_1: coverage.over_1,
            over_5: coverage.over_5,
            over_10: coverage.over_10,
            over_15: coverage.over_15,
            over_20: coverage.over_20,
            over_25: coverage.over_25,
            over_30: coverage.over_30,
            over_50: coverage.over_50,
            over_100: coverage.over_100,
        })
    }
}

#[napi(object)]
pub struct GnomadV4VrsAlleles {
    #[napi(js_name = "ref")]
    pub reference: Option<GnomadV4VrsAllele>,
    pub alt: Option<GnomadV4VrsAllele>,
}

impl From<source::GnomadV4VrsAlleles> for GnomadV4VrsAlleles {
    fn from(alleles: source::GnomadV4VrsAlleles) -> Self {
        Self {
            reference: alleles.reference.map(Into::into),
            alt: alleles.alt.map(Into::into),
        }
    }
}

#[napi(object)]
pub struct GnomadV4VrsAllele {
    #[napi(js_name = "allele_id")]
    pub allele_id: Option<String>,
    pub start: Option<i32>,
    pub end: Option<i32>,
    pub state: Option<String>,
    pub length: Option<i32>,
    #[napi(js_name = "repeat_subunit_length")]
    pub repeat_subunit_length: Option<i32>,
}

impl From<source::GnomadV4VrsAllele> for GnomadV4VrsAllele {
    fn from(allele: source::GnomadV4VrsAllele) -> Self {
        Self {
            allele_id: allele.allele_id,
            start: allele.start,
            end: allele.end,
            state: allele.state,
            length: allele.length,
            repeat_subunit_length: allele.repeat_subunit_length,
        }
    }
}

const MAX_SAFE_JS_INTEGER: i64 = 9_007_199_254_740_991;

#[napi]
pub struct GeneStore {
    reader: GeneReader,
}

/// # Errors
/// Return an error if `gene_models_grch38` cannot be resolved or registered under the supplied root.
#[allow(dead_code, reason = "Called from JavaScript through Node-API.")]
#[napi]
pub async fn open_gene_store(parquet_root: String) -> napi::Result<GeneStore> {
    let context =
        create_datafusion_context_from_root(parquet_root, ParquetDataset::GeneModelsGrch38)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;
    Ok(GeneStore {
        reader: GeneReader::new(context),
    })
}

#[napi]
impl GeneStore {
    /// # Errors
    /// Reject query, decoding, duplicate-ID, or unsafe JavaScript integer conversions.
    #[napi]
    pub async fn fetch_gene_by_id(&self, gene_id: String) -> napi::Result<Either<Gene, Null>> {
        let gene = self
            .reader
            .fetch_gene_by_id(&gene_id)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;
        let gene = gene.map(Gene::try_from).transpose().map_err(|error| {
            napi::Error::from_reason(format!(
                "Cannot convert gene {gene_id} to JavaScript: {error}"
            ))
        })?;
        Ok(into_nullable(gene))
    }

    /// # Errors
    /// Reject invalid intervals, query or decoding failures, or unsafe JavaScript integer conversions.
    #[napi]
    pub async fn fetch_genes_in_region(
        &self,
        chromosome: String,
        start: i32,
        stop: i32,
    ) -> napi::Result<Vec<RegionGene>> {
        let interval = GenomicInterval::new(&chromosome, start, stop)
            .map_err(|error| map_interval_error(&error))?;
        let genes = self
            .reader
            .fetch_genes_in_region(&interval)
            .await
            .map_err(|error| napi::Error::from_reason(error.to_string()))?;
        genes.into_iter().map(TryInto::try_into).collect()
    }
}

#[allow(
    clippy::struct_field_names,
    reason = "Preserve gene_id and gene_version in the JavaScript API."
)]
#[napi(object)]
pub struct Gene {
    #[napi(js_name = "gene_id")]
    pub gene_id: String,
    #[napi(js_name = "gene_version")]
    pub gene_version: String,
    pub symbol: String,
    #[napi(js_name = "gencode_symbol")]
    pub gencode_symbol: String,
    #[napi(js_name = "reference_genome")]
    pub reference_genome: String,
    pub chrom: String,
    pub strand: String,
    pub start: i32,
    pub stop: i32,
    pub xstart: i64,
    pub xstop: i64,
    pub interval: GeneInterval,
    pub exons: Vec<GeneExon>,
    pub transcripts: Vec<GeneTranscript>,
    #[napi(js_name = "hgnc_id")]
    pub hgnc_id: Either<String, Null>,
    #[napi(js_name = "ncbi_id")]
    pub ncbi_id: Either<String, Null>,
    #[napi(js_name = "omim_id")]
    pub omim_id: Either<String, Null>,
    pub name: Either<String, Null>,
    pub flags: Vec<String>,
    #[napi(js_name = "canonical_transcript_id")]
    pub canonical_transcript_id: Either<String, Null>,
    #[napi(js_name = "mane_select_transcript")]
    pub mane_select_transcript: Either<GeneManeSelectTranscript, Null>,
    pub pext: Either<GenePext, Null>,
    #[napi(js_name = "gnomad_constraint")]
    pub gnomad_constraint: Either<GeneGnomadConstraint, Null>,
    #[napi(js_name = "previous_symbols")]
    pub previous_symbols: Either<Vec<String>, Null>,
    #[napi(js_name = "alias_symbols")]
    pub alias_symbols: Either<Vec<String>, Null>,
    #[napi(js_name = "symbol_upper_case")]
    pub symbol_upper_case: String,
    #[napi(js_name = "search_terms")]
    pub search_terms: Vec<String>,
    #[napi(js_name = "preferred_transcript_id")]
    pub preferred_transcript_id: Either<String, Null>,
    #[napi(js_name = "preferred_transcript_source")]
    pub preferred_transcript_source: Either<String, Null>,
}

impl TryFrom<ReaderGene> for Gene {
    type Error = napi::Error;

    fn try_from(gene: ReaderGene) -> napi::Result<Self> {
        Ok(Self {
            gene_id: gene.gene_id,
            gene_version: gene.gene_version,
            symbol: gene.symbol,
            gencode_symbol: gene.gencode_symbol,
            reference_genome: gene.reference_genome,
            chrom: gene.chrom,
            strand: gene.strand,
            start: gene.start,
            stop: gene.stop,
            xstart: checked_js_integer(gene.xstart, "gene.xstart")?,
            xstop: checked_js_integer(gene.xstop, "gene.xstop")?,
            interval: gene.interval.into(),
            exons: gene
                .exons
                .into_iter()
                .map(TryInto::try_into)
                .collect::<napi::Result<_>>()?,
            transcripts: gene
                .transcripts
                .into_iter()
                .map(TryInto::try_into)
                .collect::<napi::Result<_>>()?,
            hgnc_id: into_nullable(gene.hgnc_id),
            ncbi_id: into_nullable(gene.ncbi_id),
            omim_id: into_nullable(gene.omim_id),
            name: into_nullable(gene.name),
            flags: gene.flags,
            canonical_transcript_id: into_nullable(gene.canonical_transcript_id),
            mane_select_transcript: into_nullable(gene.mane_select_transcript.map(Into::into)),
            pext: into_nullable(gene.pext.map(Into::into)),
            gnomad_constraint: into_nullable(
                gene.gnomad_constraint.map(TryInto::try_into).transpose()?,
            ),
            previous_symbols: into_nullable(gene.previous_symbols),
            alias_symbols: into_nullable(gene.alias_symbols),
            symbol_upper_case: gene.symbol_upper_case,
            search_terms: gene.search_terms,
            preferred_transcript_id: into_nullable(gene.preferred_transcript_id),
            preferred_transcript_source: into_nullable(gene.preferred_transcript_source),
        })
    }
}

#[napi(object)]
pub struct GeneTranscript {
    #[napi(js_name = "transcript_id")]
    pub transcript_id: String,
    #[napi(js_name = "transcript_version")]
    pub transcript_version: String,
    #[napi(js_name = "gene_id")]
    pub gene_id: String,
    #[napi(js_name = "gene_version")]
    pub gene_version: String,
    #[napi(js_name = "reference_genome")]
    pub reference_genome: String,
    pub chrom: String,
    pub strand: String,
    pub start: i32,
    pub stop: i32,
    pub xstart: i64,
    pub xstop: i64,
    pub interval: GeneInterval,
    pub exons: Vec<GeneExon>,
    #[napi(js_name = "gtex_tissue_expression")]
    pub gtex_tissue_expression: Either<Vec<GeneTissueExpression>, Null>,
    #[napi(js_name = "refseq_id")]
    pub refseq_id: Either<String, Null>,
    #[napi(js_name = "refseq_version")]
    pub refseq_version: Either<String, Null>,
}

impl TryFrom<ReaderGeneTranscript> for GeneTranscript {
    type Error = napi::Error;

    fn try_from(transcript: ReaderGeneTranscript) -> napi::Result<Self> {
        Ok(Self {
            transcript_id: transcript.transcript_id,
            transcript_version: transcript.transcript_version,
            gene_id: transcript.gene_id,
            gene_version: transcript.gene_version,
            reference_genome: transcript.reference_genome,
            chrom: transcript.chrom,
            strand: transcript.strand,
            start: transcript.start,
            stop: transcript.stop,
            xstart: checked_js_integer(transcript.xstart, "transcript.xstart")?,
            xstop: checked_js_integer(transcript.xstop, "transcript.xstop")?,
            interval: transcript.interval.into(),
            exons: transcript
                .exons
                .into_iter()
                .map(TryInto::try_into)
                .collect::<napi::Result<_>>()?,
            gtex_tissue_expression: into_nullable(
                transcript
                    .gtex_tissue_expression
                    .map(|tissues| tissues.into_iter().map(Into::into).collect()),
            ),
            refseq_id: into_nullable(transcript.refseq_id),
            refseq_version: into_nullable(transcript.refseq_version),
        })
    }
}

#[napi(object)]
pub struct RegionGene {
    #[napi(js_name = "gene_id")]
    pub gene_id: String,
    pub symbol: String,
    pub start: i32,
    pub stop: i32,
    pub exons: Vec<GeneExon>,
    pub transcripts: Vec<RegionGeneTranscript>,
}

impl TryFrom<ReaderRegionGene> for RegionGene {
    type Error = napi::Error;

    fn try_from(gene: ReaderRegionGene) -> napi::Result<Self> {
        Ok(Self {
            gene_id: gene.gene_id,
            symbol: gene.symbol,
            start: gene.start,
            stop: gene.stop,
            exons: gene
                .exons
                .into_iter()
                .map(TryInto::try_into)
                .collect::<napi::Result<_>>()?,
            transcripts: gene
                .transcripts
                .into_iter()
                .map(TryInto::try_into)
                .collect::<napi::Result<_>>()?,
        })
    }
}

#[napi(object)]
pub struct RegionGeneTranscript {
    #[napi(js_name = "transcript_id")]
    pub transcript_id: String,
    pub start: i32,
    pub stop: i32,
    pub exons: Vec<GeneExon>,
}

impl TryFrom<ReaderRegionGeneTranscript> for RegionGeneTranscript {
    type Error = napi::Error;

    fn try_from(transcript: ReaderRegionGeneTranscript) -> napi::Result<Self> {
        Ok(Self {
            transcript_id: transcript.transcript_id,
            start: transcript.start,
            stop: transcript.stop,
            exons: transcript
                .exons
                .into_iter()
                .map(TryInto::try_into)
                .collect::<napi::Result<_>>()?,
        })
    }
}

#[napi(object)]
pub struct GeneExon {
    #[napi(js_name = "feature_type")]
    pub feature_type: String,
    pub start: i32,
    pub stop: i32,
    pub xstart: i64,
    pub xstop: i64,
}

impl TryFrom<ReaderGeneExon> for GeneExon {
    type Error = napi::Error;

    fn try_from(exon: ReaderGeneExon) -> napi::Result<Self> {
        Ok(Self {
            feature_type: exon.feature_type,
            start: exon.start,
            stop: exon.stop,
            xstart: checked_js_integer(exon.xstart, "exon.xstart")?,
            xstop: checked_js_integer(exon.xstop, "exon.xstop")?,
        })
    }
}

#[napi(object)]
pub struct GeneInterval {
    pub start: GeneLocus,
    pub end: GeneLocus,
    #[napi(js_name = "includes_start")]
    pub includes_start: bool,
    #[napi(js_name = "includes_end")]
    pub includes_end: bool,
}

impl From<ReaderGeneInterval> for GeneInterval {
    fn from(interval: ReaderGeneInterval) -> Self {
        Self {
            start: interval.start.into(),
            end: interval.end.into(),
            includes_start: interval.includes_start,
            includes_end: interval.includes_end,
        }
    }
}

#[napi(object)]
pub struct GeneLocus {
    pub contig: String,
    pub position: i32,
}

impl From<ReaderGeneLocus> for GeneLocus {
    fn from(locus: ReaderGeneLocus) -> Self {
        Self {
            contig: locus.contig,
            position: locus.position,
        }
    }
}

#[napi(object)]
pub struct GeneTissueExpression {
    pub tissue: String,
    pub value: Either<f64, Null>,
}

impl From<ReaderGeneTissueExpression> for GeneTissueExpression {
    fn from(expression: ReaderGeneTissueExpression) -> Self {
        Self {
            tissue: expression.tissue,
            value: into_nullable(expression.value),
        }
    }
}

#[napi(object)]
pub struct GenePext {
    pub regions: Vec<GenePextRegion>,
    pub flags: Vec<String>,
}

impl From<ReaderGenePext> for GenePext {
    fn from(pext: ReaderGenePext) -> Self {
        Self {
            regions: pext.regions.into_iter().map(Into::into).collect(),
            flags: pext.flags,
        }
    }
}

#[napi(object)]
pub struct GenePextRegion {
    pub chrom: String,
    pub start: i32,
    pub stop: i32,
    pub mean: f64,
    pub tissues: Vec<GeneTissueExpression>,
}

impl From<ReaderGenePextRegion> for GenePextRegion {
    fn from(region: ReaderGenePextRegion) -> Self {
        Self {
            chrom: region.chrom,
            start: region.start,
            stop: region.stop,
            mean: region.mean,
            tissues: region.tissues.into_iter().map(Into::into).collect(),
        }
    }
}

#[napi(object)]
pub struct GeneGnomadConstraint {
    pub gene: Either<String, Null>,
    #[napi(js_name = "gene_id")]
    pub gene_id: Either<String, Null>,
    pub transcript: Either<String, Null>,
    pub canonical: Either<bool, Null>,
    #[napi(js_name = "mane_select")]
    pub mane_select: Either<bool, Null>,
    #[napi(js_name = "exp_lof")]
    pub exp_lof: Either<f64, Null>,
    #[napi(js_name = "exp_mis")]
    pub exp_mis: Either<f64, Null>,
    #[napi(js_name = "exp_syn")]
    pub exp_syn: Either<f64, Null>,
    #[napi(js_name = "obs_lof")]
    pub obs_lof: Either<i64, Null>,
    #[napi(js_name = "obs_mis")]
    pub obs_mis: Either<i64, Null>,
    #[napi(js_name = "obs_syn")]
    pub obs_syn: Either<i64, Null>,
    #[napi(js_name = "oe_lof")]
    pub oe_lof: Either<f64, Null>,
    #[napi(js_name = "oe_lof_lower")]
    pub oe_lof_lower: Either<f64, Null>,
    #[napi(js_name = "oe_lof_upper")]
    pub oe_lof_upper: Either<f64, Null>,
    #[napi(js_name = "oe_lof_percentile")]
    pub oe_lof_percentile: Either<i32, Null>,
    #[napi(js_name = "oe_mis")]
    pub oe_mis: Either<f64, Null>,
    #[napi(js_name = "oe_mis_lower")]
    pub oe_mis_lower: Either<f64, Null>,
    #[napi(js_name = "oe_mis_upper")]
    pub oe_mis_upper: Either<f64, Null>,
    #[napi(js_name = "oe_syn")]
    pub oe_syn: Either<f64, Null>,
    #[napi(js_name = "oe_syn_lower")]
    pub oe_syn_lower: Either<f64, Null>,
    #[napi(js_name = "oe_syn_upper")]
    pub oe_syn_upper: Either<f64, Null>,
    #[napi(js_name = "lof_z")]
    pub lof_z: Either<f64, Null>,
    #[napi(js_name = "mis_z")]
    pub mis_z: Either<f64, Null>,
    #[napi(js_name = "syn_z")]
    pub syn_z: Either<f64, Null>,
    pub pli: Either<f64, Null>,
    pub flags: Either<Vec<String>, Null>,
}

impl TryFrom<ReaderGeneGnomadConstraint> for GeneGnomadConstraint {
    type Error = napi::Error;

    fn try_from(constraint: ReaderGeneGnomadConstraint) -> napi::Result<Self> {
        Ok(Self {
            gene: into_nullable(constraint.gene),
            gene_id: into_nullable(constraint.gene_id),
            transcript: into_nullable(constraint.transcript),
            canonical: into_nullable(constraint.canonical),
            mane_select: into_nullable(constraint.mane_select),
            exp_lof: into_nullable(constraint.exp_lof),
            exp_mis: into_nullable(constraint.exp_mis),
            exp_syn: into_nullable(constraint.exp_syn),
            obs_lof: into_nullable_js_integer(constraint.obs_lof, "gnomad_constraint.obs_lof")?,
            obs_mis: into_nullable_js_integer(constraint.obs_mis, "gnomad_constraint.obs_mis")?,
            obs_syn: into_nullable_js_integer(constraint.obs_syn, "gnomad_constraint.obs_syn")?,
            oe_lof: into_nullable(constraint.oe_lof),
            oe_lof_lower: into_nullable(constraint.oe_lof_lower),
            oe_lof_upper: into_nullable(constraint.oe_lof_upper),
            oe_lof_percentile: into_nullable(constraint.oe_lof_percentile),
            oe_mis: into_nullable(constraint.oe_mis),
            oe_mis_lower: into_nullable(constraint.oe_mis_lower),
            oe_mis_upper: into_nullable(constraint.oe_mis_upper),
            oe_syn: into_nullable(constraint.oe_syn),
            oe_syn_lower: into_nullable(constraint.oe_syn_lower),
            oe_syn_upper: into_nullable(constraint.oe_syn_upper),
            lof_z: into_nullable(constraint.lof_z),
            mis_z: into_nullable(constraint.mis_z),
            syn_z: into_nullable(constraint.syn_z),
            pli: into_nullable(constraint.pli),
            flags: into_nullable(constraint.flags),
        })
    }
}

#[napi(object)]
pub struct GeneManeSelectTranscript {
    #[napi(js_name = "matched_gene_version")]
    pub matched_gene_version: String,
    #[napi(js_name = "ensembl_id")]
    pub ensembl_id: String,
    #[napi(js_name = "ensembl_version")]
    pub ensembl_version: String,
    #[napi(js_name = "refseq_id")]
    pub refseq_id: String,
    #[napi(js_name = "refseq_version")]
    pub refseq_version: String,
}

impl From<ReaderGeneManeSelectTranscript> for GeneManeSelectTranscript {
    fn from(transcript: ReaderGeneManeSelectTranscript) -> Self {
        Self {
            matched_gene_version: transcript.matched_gene_version,
            ensembl_id: transcript.ensembl_id,
            ensembl_version: transcript.ensembl_version,
            refseq_id: transcript.refseq_id,
            refseq_version: transcript.refseq_version,
        }
    }
}

fn checked_js_integer(value: i64, field: &str) -> napi::Result<i64> {
    if !(-MAX_SAFE_JS_INTEGER..=MAX_SAFE_JS_INTEGER).contains(&value) {
        return Err(napi::Error::from_reason(format!(
            "{field} value {value} exceeds the JavaScript safe integer range"
        )));
    }
    Ok(value)
}

fn into_nullable_js_integer(value: Option<i64>, field: &str) -> napi::Result<Either<i64, Null>> {
    Ok(into_nullable(
        value
            .map(|value| checked_js_integer(value, field))
            .transpose()?,
    ))
}

#[cfg(test)]
mod tests {
    use super::{
        Either, GeneExon, GeneGnomadConstraint, MAX_SAFE_JS_INTEGER, Null, ReaderGeneExon,
        ReaderGeneGnomadConstraint, checked_js_integer, into_nullable_js_integer,
    };

    const fn sample_constraint() -> ReaderGeneGnomadConstraint {
        ReaderGeneGnomadConstraint {
            gene: None,
            gene_id: None,
            transcript: None,
            canonical: None,
            mane_select: None,
            exp_lof: None,
            exp_mis: None,
            exp_syn: None,
            obs_lof: None,
            obs_mis: None,
            obs_syn: None,
            oe_lof: None,
            oe_lof_lower: None,
            oe_lof_upper: None,
            oe_lof_percentile: None,
            oe_mis: None,
            oe_mis_lower: None,
            oe_mis_upper: None,
            oe_syn: None,
            oe_syn_lower: None,
            oe_syn_upper: None,
            lof_z: None,
            mis_z: None,
            syn_z: None,
            pli: None,
            flags: None,
        }
    }

    #[test]
    fn preserves_safe_integer_limits_and_large_coordinates() {
        for value in [0, 24_000_000_101, -MAX_SAFE_JS_INTEGER, MAX_SAFE_JS_INTEGER] {
            assert_eq!(
                checked_js_integer(value, "test-field").expect("safe integer"),
                value
            );
        }
    }

    #[test]
    fn rejects_unsafe_integers_with_field_and_value() {
        for value in [
            i64::MIN,
            -9_007_199_254_740_992,
            9_007_199_254_740_992,
            i64::MAX,
        ] {
            let error = checked_js_integer(value, "test-field").expect_err("unsafe integer");
            assert!(error.reason.contains("test-field"));
            assert!(error.reason.contains(&value.to_string()));
            assert!(error.reason.contains("safe integer"));
        }
    }

    #[test]
    fn preserves_nullable_integer_zero_and_absence() {
        assert!(matches!(
            into_nullable_js_integer(None, "count"),
            Ok(Either::B(Null))
        ));
        assert!(matches!(
            into_nullable_js_integer(Some(0), "count"),
            Ok(Either::A(0))
        ));
        assert!(into_nullable_js_integer(Some(i64::MAX), "count").is_err());
    }

    #[test]
    fn checks_both_exon_encoded_coordinates() {
        for (xstart, xstop) in [(i64::MAX, 200), (100, i64::MAX)] {
            let exon = ReaderGeneExon {
                feature_type: "CDS".to_owned(),
                start: 100,
                stop: 200,
                xstart,
                xstop,
            };
            assert!(
                matches!(GeneExon::try_from(exon), Err(error) if error.reason.contains("exon.x"))
            );
        }
    }

    #[test]
    fn preserves_constraint_null_zero_false_and_empty_flags() {
        let mut constraint = sample_constraint();
        constraint.obs_lof = Some(0);
        constraint.canonical = Some(false);
        constraint.flags = Some(Vec::new());
        let converted = GeneGnomadConstraint::try_from(constraint).expect("valid constraint");

        assert!(matches!(converted.exp_lof, Either::B(Null)));
        assert!(matches!(converted.obs_lof, Either::A(0)));
        assert!(matches!(converted.obs_mis, Either::B(Null)));
        assert!(matches!(converted.canonical, Either::A(false)));
        assert!(
            matches!(converted.flags, Either::A(flags) if flags.is_empty()),
            "Preserve a present empty flag list"
        );
        let missing = GeneGnomadConstraint::try_from(sample_constraint()).expect("missing metrics");
        assert!(matches!(missing.flags, Either::B(Null)));
    }

    #[test]
    fn checks_every_constraint_observed_count() {
        for field in ["obs_lof", "obs_mis", "obs_syn"] {
            let mut constraint = sample_constraint();
            match field {
                "obs_lof" => constraint.obs_lof = Some(i64::MAX),
                "obs_mis" => constraint.obs_mis = Some(i64::MAX),
                _ => constraint.obs_syn = Some(i64::MAX),
            }
            assert!(
                matches!(GeneGnomadConstraint::try_from(constraint), Err(error) if error.reason.contains(field))
            );
        }
    }
}

#[cfg(test)]
mod gnomad_v4_single_variant_tests {
    use serde_json::{Value, json};

    use super::{GnomadV4Coverage, GnomadV4Histogram, GnomadV4Variant, source};

    const MAX_SAFE_JS_INTEGER: i64 = 9_007_199_254_740_991;
    const UNSAFE_JS_INTEGER: i64 = 9_007_199_254_740_992;

    fn sample_variant() -> Value {
        let histogram = json!({"bin_freq": [0], "n_smaller": 0, "n_larger": 0});
        let age = json!({"het": histogram, "hom": histogram});
        let quality_histograms = json!({
            "all_adj": histogram, "all_raw": histogram,
            "alt_adj": histogram, "alt_raw": histogram
        });
        let metrics = json!({
            "allele_balance": quality_histograms, "genotype_depth": quality_histograms,
            "genotype_quality": quality_histograms,
            "site_quality_metrics": [{"metric": "supplied", "value": -1.25}]
        });
        let frequency = json!({"ac": 0, "ac_raw": 2, "homozygote_count": 0,
            "ancestry_groups": [{"id": "XX", "homozygote_count": 0}]});
        json!({
            "variant_id": "1-100-A-G", "locus": {"contig": "chr1", "position": 100},
            "alleles": ["A", "G"], "rsids": [],
            "exome": {
                "freq": {"all": frequency, "non_ukb": frequency},
                "filters": ["source-filter"], "flags": [],
                "fafmax": {"gnomad": {}, "non_ukb": {}},
                "faf95": {"grpmax": 0.25, "grpmax_gen_anc": "source-pop"},
                "age_distribution": age, "quality_metrics": metrics
            },
            "genome": {"freq": {"all": frequency, "hgdp": frequency, "tgp": frequency},
                "fafmax": {}, "age_distribution": age, "quality_metrics": metrics},
            "joint": {"freq": {"all": frequency}, "fafmax": {}, "flags": ["joint-flag"],
                "freq_comparison_stats": {
                    "contingency_table_test": [{"p_value": 0.5, "odds_ratio": 2.0}],
                    "cochran_mantel_haenszel_test": {"p_value": 0.25, "chisq": 3.0},
                    "stat_union": {"p_value": 0.125, "stat_test_name": "source-test", "gen_ancs": []}
                }},
            "transcript_consequences": [{"gene_id": "ENSG002", "is_canonical": false},
                {"gene_id": "ENSG001"}],
            "in_silico_predictors": {"cadd": {"phred": 0.0}},
            "colocated_variants": {"all": [], "non_ukb": ["source-colocated"]},
            "coverage": {"exome": {"total_DP": 0}, "genome": {"total_DP": 0}},
            "vrs": {"ref": {"repeat_subunit_lengths": 1},
                "alt": {"allele_id": "ga4gh:VA.source", "repeat_subunit_lengths": 7}}
        })
    }

    #[test]
    fn preserves_histogram_absence_empty_bins_zero_and_safe_64_bit_counts() {
        let missing: source::GnomadV4Histogram =
            serde_json::from_value(json!({})).expect("histogram");
        let missing = GnomadV4Histogram::try_from(missing).expect("missing histogram values");
        assert!(missing.bin_freq.is_none());
        assert!(missing.n_smaller.is_none());
        let populated: source::GnomadV4Histogram = serde_json::from_value(json!({
            "bin_edges": [], "bin_freq": [0, 4_294_967_300_i64, MAX_SAFE_JS_INTEGER],
            "n_smaller": 0, "n_larger": MAX_SAFE_JS_INTEGER
        }))
        .expect("histogram");
        let populated = GnomadV4Histogram::try_from(populated).expect("safe histogram values");
        assert_eq!(populated.bin_edges, Some(Vec::new()));
        assert_eq!(
            populated.bin_freq,
            Some(vec![0, 4_294_967_300, MAX_SAFE_JS_INTEGER])
        );
        assert_eq!(populated.n_smaller, Some(0));
        assert_eq!(populated.n_larger, Some(MAX_SAFE_JS_INTEGER));
        let empty: source::GnomadV4Histogram =
            serde_json::from_value(json!({"bin_freq": []})).expect("histogram");
        assert_eq!(
            GnomadV4Histogram::try_from(empty)
                .expect("empty bins")
                .bin_freq,
            Some(Vec::new())
        );
    }

    #[test]
    fn rejects_every_unsafe_histogram_count_with_its_field_name() {
        for field in ["bin_freq", "n_smaller", "n_larger"] {
            for unsafe_count in [i64::MIN, UNSAFE_JS_INTEGER, i64::MAX] {
                let mut value = json!({});
                value[field] = if field == "bin_freq" {
                    json!([0, unsafe_count])
                } else {
                    json!(unsafe_count)
                };
                let histogram: source::GnomadV4Histogram =
                    serde_json::from_value(value).expect("histogram");
                let error = GnomadV4Histogram::try_from(histogram)
                    .err()
                    .expect("unsafe count");
                assert!(error.reason.contains(field));
                assert!(error.reason.contains(&unsafe_count.to_string()));
            }
        }
    }

    #[test]
    fn preserves_safe_coverage_depth_and_rejects_unsafe_depth() {
        for depth in [
            None,
            Some(0),
            Some(4_294_967_300),
            Some(MAX_SAFE_JS_INTEGER),
        ] {
            let coverage: source::GnomadV4Coverage =
                serde_json::from_value(json!({"total_DP": depth})).expect("coverage");
            assert_eq!(
                GnomadV4Coverage::try_from(coverage)
                    .expect("safe depth")
                    .total_depth,
                depth
            );
        }
        let coverage: source::GnomadV4Coverage =
            serde_json::from_value(json!({"total_DP": UNSAFE_JS_INTEGER})).expect("coverage");
        let error = GnomadV4Coverage::try_from(coverage)
            .err()
            .expect("unsafe depth");
        assert!(error.reason.contains("coverage.total_DP"));
    }

    #[test]
    fn preserves_source_fields_and_singular_vrs_repeat_lengths() {
        let source: source::GnomadV4Variant =
            serde_json::from_value(sample_variant()).expect("source variant");
        let variant = GnomadV4Variant::try_from(source).expect("safe variant");
        assert_eq!(variant.variant_id, "1-100-A-G");
        assert_eq!(variant.rsids, Some(Vec::new()));
        assert_eq!(
            variant.exome.freq.all.as_ref().expect("all frequency").ac,
            Some(0)
        );
        assert!(variant.exome.freq.non_ukb.is_some());
        assert_eq!(variant.exome.flags, Some(Vec::new()));
        assert!(variant.genome.filters.is_none());
        assert!(variant.genome.freq.hgdp.is_some());
        assert!(variant.genome.freq.tgp.is_some());
        assert_eq!(variant.joint.flags, Some(vec!["joint-flag".to_owned()]));
        let stats = variant
            .joint
            .freq_comparison_stats
            .expect("comparison statistics");
        assert_eq!(
            stats.contingency_table_test.expect("contingency test")[0].odds_ratio,
            Some(2.0)
        );
        assert_eq!(
            stats.cochran_mantel_haenszel_test.expect("CMH test").chisq,
            Some(3.0)
        );
        assert_eq!(
            stats.stat_union.expect("stat union").gen_ancs,
            Some(Vec::new())
        );
        let consequences = variant.transcript_consequences.expect("consequences");
        assert_eq!(consequences[0].gene_id.as_deref(), Some("ENSG002"));
        assert_eq!(consequences[0].is_canonical, Some(false));
        assert_eq!(consequences[1].gene_id.as_deref(), Some("ENSG001"));
        assert_eq!(variant.in_silico_predictors.cadd.phred, Some(0.0));
        assert_eq!(
            variant.colocated_variants.non_ukb,
            Some(vec!["source-colocated".to_owned()])
        );
        assert!(variant.caid.is_none());
        let vrs = variant.vrs.expect("VRS alleles");
        assert_eq!(
            vrs.reference
                .expect("reference allele")
                .repeat_subunit_length,
            Some(1)
        );
        assert_eq!(
            vrs.alt.expect("alternate allele").repeat_subunit_length,
            Some(7)
        );
    }

    #[test]
    fn propagates_unsafe_integers_through_every_nested_conversion_path() {
        let mut paths = vec![
            "/coverage/exome/total_DP".to_owned(),
            "/coverage/genome/total_DP".to_owned(),
        ];
        for (sequencing_type, subsets) in [
            ("exome", vec!["all", "non_ukb"]),
            ("genome", vec!["all", "hgdp", "tgp"]),
            ("joint", vec!["all"]),
        ] {
            for subset in subsets {
                paths.push(format!("/{sequencing_type}/freq/{subset}/homozygote_count"));
                paths.push(format!(
                    "/{sequencing_type}/freq/{subset}/ancestry_groups/0/homozygote_count"
                ));
            }
        }
        for sequencing_type in ["exome", "genome"] {
            for age_group in ["het", "hom"] {
                paths.push(format!(
                    "/{sequencing_type}/age_distribution/{age_group}/bin_freq/0"
                ));
            }
            for metric in ["allele_balance", "genotype_depth", "genotype_quality"] {
                for histogram in ["all_adj", "all_raw", "alt_adj", "alt_raw"] {
                    paths.push(format!(
                        "/{sequencing_type}/quality_metrics/{metric}/{histogram}/bin_freq/0"
                    ));
                }
            }
        }
        for path in paths {
            let mut value = sample_variant();
            *value.pointer_mut(&path).expect("test count exists") = json!(UNSAFE_JS_INTEGER);
            let source: source::GnomadV4Variant =
                serde_json::from_value(value).expect("source variant");
            let error = GnomadV4Variant::try_from(source)
                .err()
                .expect("reject unsafe nested count");
            assert!(error.reason.contains("safe integer"), "{path}: {error}");
        }
    }
}
