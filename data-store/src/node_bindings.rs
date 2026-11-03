#![allow(
    clippy::trailing_empty_array,
    reason = "NAPI.rs generates callback bookkeeping structs with trailing empty arrays."
)]

use napi::bindgen_prelude::{Either, Null};
use napi_derive::napi;

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
