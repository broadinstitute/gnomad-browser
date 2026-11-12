#![allow(
    clippy::trailing_empty_array,
    reason = "NAPI.rs generates callback bookkeeping structs with trailing empty arrays."
)]

use napi::bindgen_prelude::{Either, Null};
use napi_derive::napi;

use super::gene::into_nullable_js_integer;
use super::{GenomicIntervalBounds, into_napi_error, into_nullable, parse_genomic_intervals};
use crate::{
    GnomadV4AncestryFrequency as ReaderGnomadV4AncestryFrequency,
    GnomadV4Cadd as ReaderGnomadV4Cadd, GnomadV4ExomeData as ReaderGnomadV4ExomeData,
    GnomadV4ExomeFilteringAlleleFrequencies as ReaderGnomadV4ExomeFilteringAlleleFrequencies,
    GnomadV4FilteringAlleleFrequency as ReaderGnomadV4FilteringAlleleFrequency,
    GnomadV4Frequency as ReaderGnomadV4Frequency,
    GnomadV4FrequencySubsets as ReaderGnomadV4FrequencySubsets,
    GnomadV4GenomeData as ReaderGnomadV4GenomeData,
    GnomadV4InSilicoPredictors as ReaderGnomadV4InSilicoPredictors,
    GnomadV4JointData as ReaderGnomadV4JointData, GnomadV4Locus as ReaderGnomadV4Locus,
    GnomadV4Reader, GnomadV4Subset,
    GnomadV4TranscriptConsequence as ReaderGnomadV4TranscriptConsequence,
    GnomadV4VariantListEntry as ReaderGnomadV4VariantListEntry, ParquetDataset,
    create_datafusion_context_from_root,
};

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

fn convert_variants(
    variants: Vec<ReaderGnomadV4VariantListEntry>,
) -> napi::Result<Vec<GnomadV4VariantListEntry>> {
    variants.into_iter().map(TryInto::try_into).collect()
}

#[napi]
impl GnomadV4Store {
    /// Pad each interval by 75 bases; `subset` is `all` or `non_ukb` and selects the exome
    /// frequencies. Each variant keeps only this gene's consequences and the ancestry groups not
    /// split by sex.
    ///
    /// # Errors
    /// Rejects invalid subsets, chromosomes or bounds, and propagates annotation, padding, query
    /// and unsafe JavaScript integer errors.
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
            .map_err(|error| into_napi_error(&error))?;
        convert_variants(variants)
    }

    /// Pad each interval by 75 bases; `subset` is `all` or `non_ukb` and selects the exome
    /// frequencies. Each variant keeps only this transcript's consequence and the ancestry groups
    /// not split by sex.
    ///
    /// # Errors
    /// Rejects invalid subsets, chromosomes or bounds, and propagates annotation, padding, query
    /// and unsafe JavaScript integer errors.
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
            .map_err(|error| into_napi_error(&error))?;
        convert_variants(variants)
    }
}

#[napi(object)]
pub struct GnomadV4VariantListEntry {
    #[napi(js_name = "variant_id")]
    pub variant_id: String,
    pub locus: GnomadV4Locus,
    pub alleles: Vec<String>,
    pub rsids: Either<Vec<String>, Null>,
    pub flags: Either<Vec<String>, Null>,
    pub exome: GnomadV4ExomeData,
    pub genome: GnomadV4GenomeData,
    pub joint: GnomadV4JointData,
    #[napi(js_name = "transcript_consequences")]
    pub transcript_consequences: Vec<GnomadV4TranscriptConsequence>,
    #[napi(js_name = "in_silico_predictors")]
    pub in_silico_predictors: GnomadV4InSilicoPredictors,
}

impl TryFrom<ReaderGnomadV4VariantListEntry> for GnomadV4VariantListEntry {
    type Error = napi::Error;

    fn try_from(variant: ReaderGnomadV4VariantListEntry) -> napi::Result<Self> {
        Ok(Self {
            variant_id: variant.variant_id,
            locus: variant.locus.into(),
            alleles: variant.alleles,
            rsids: into_nullable(variant.rsids),
            flags: into_nullable(variant.flags),
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

impl From<ReaderGnomadV4Locus> for GnomadV4Locus {
    fn from(locus: ReaderGnomadV4Locus) -> Self {
        Self {
            contig: locus.contig,
            position: locus.position,
        }
    }
}

#[napi(object)]
pub struct GnomadV4ExomeData {
    pub freq: GnomadV4FrequencySubsets,
    pub filters: Either<Vec<String>, Null>,
    pub flags: Either<Vec<String>, Null>,
    pub fafmax: GnomadV4ExomeFilteringAlleleFrequencies,
}

impl TryFrom<ReaderGnomadV4ExomeData> for GnomadV4ExomeData {
    type Error = napi::Error;

    fn try_from(data: ReaderGnomadV4ExomeData) -> napi::Result<Self> {
        Ok(Self {
            freq: data.freq.try_into()?,
            filters: into_nullable(data.filters),
            flags: into_nullable(data.flags),
            fafmax: data.fafmax.into(),
        })
    }
}

#[napi(object)]
pub struct GnomadV4GenomeData {
    pub freq: GnomadV4FrequencySubsets,
    pub filters: Either<Vec<String>, Null>,
    pub flags: Either<Vec<String>, Null>,
}

impl TryFrom<ReaderGnomadV4GenomeData> for GnomadV4GenomeData {
    type Error = napi::Error;

    fn try_from(data: ReaderGnomadV4GenomeData) -> napi::Result<Self> {
        Ok(Self {
            freq: data.freq.try_into()?,
            filters: into_nullable(data.filters),
            flags: into_nullable(data.flags),
        })
    }
}

#[napi(object)]
pub struct GnomadV4JointData {
    pub freq: GnomadV4FrequencySubsets,
    pub filters: Either<Vec<String>, Null>,
    pub fafmax: GnomadV4FilteringAlleleFrequency,
}

impl TryFrom<ReaderGnomadV4JointData> for GnomadV4JointData {
    type Error = napi::Error;

    fn try_from(data: ReaderGnomadV4JointData) -> napi::Result<Self> {
        Ok(Self {
            freq: data.freq.try_into()?,
            filters: into_nullable(data.filters),
            fafmax: data.fafmax.into(),
        })
    }
}

#[napi(object)]
pub struct GnomadV4FrequencySubsets {
    pub all: Either<GnomadV4Frequency, Null>,
    #[napi(js_name = "non_ukb")]
    pub non_ukb: Either<GnomadV4Frequency, Null>,
}

impl TryFrom<ReaderGnomadV4FrequencySubsets> for GnomadV4FrequencySubsets {
    type Error = napi::Error;

    fn try_from(frequencies: ReaderGnomadV4FrequencySubsets) -> napi::Result<Self> {
        Ok(Self {
            all: into_nullable(frequencies.all.map(TryInto::try_into).transpose()?),
            non_ukb: into_nullable(frequencies.non_ukb.map(TryInto::try_into).transpose()?),
        })
    }
}

#[napi(object)]
pub struct GnomadV4Frequency {
    pub ac: Either<i32, Null>,
    #[napi(js_name = "ac_raw")]
    pub ac_raw: Either<i32, Null>,
    pub an: Either<i32, Null>,
    #[napi(js_name = "hemizygote_count")]
    pub hemizygote_count: Either<i32, Null>,
    #[napi(js_name = "homozygote_count")]
    pub homozygote_count: Either<i64, Null>,
    #[napi(js_name = "ancestry_groups")]
    pub ancestry_groups: Either<Vec<GnomadV4AncestryFrequency>, Null>,
}

impl TryFrom<ReaderGnomadV4Frequency> for GnomadV4Frequency {
    type Error = napi::Error;

    fn try_from(frequency: ReaderGnomadV4Frequency) -> napi::Result<Self> {
        let ancestry_groups = frequency
            .ancestry_groups
            .map(|groups| {
                groups
                    .into_iter()
                    .map(TryInto::try_into)
                    .collect::<napi::Result<Vec<_>>>()
            })
            .transpose()?;
        Ok(Self {
            ac: into_nullable(frequency.ac),
            ac_raw: into_nullable(frequency.ac_raw),
            an: into_nullable(frequency.an),
            hemizygote_count: into_nullable(frequency.hemizygote_count),
            homozygote_count: into_nullable_js_integer(
                frequency.homozygote_count,
                "freq.homozygote_count",
            )?,
            ancestry_groups: into_nullable(ancestry_groups),
        })
    }
}

#[napi(object)]
pub struct GnomadV4AncestryFrequency {
    pub id: String,
    pub ac: Either<i32, Null>,
    pub an: Either<i32, Null>,
    #[napi(js_name = "hemizygote_count")]
    pub hemizygote_count: Either<i32, Null>,
    #[napi(js_name = "homozygote_count")]
    pub homozygote_count: Either<i64, Null>,
}

impl TryFrom<ReaderGnomadV4AncestryFrequency> for GnomadV4AncestryFrequency {
    type Error = napi::Error;

    fn try_from(frequency: ReaderGnomadV4AncestryFrequency) -> napi::Result<Self> {
        Ok(Self {
            id: frequency.id,
            ac: into_nullable(frequency.ac),
            an: into_nullable(frequency.an),
            hemizygote_count: into_nullable(frequency.hemizygote_count),
            homozygote_count: into_nullable_js_integer(
                frequency.homozygote_count,
                "ancestry_groups.homozygote_count",
            )?,
        })
    }
}

#[napi(object)]
pub struct GnomadV4ExomeFilteringAlleleFrequencies {
    pub gnomad: GnomadV4FilteringAlleleFrequency,
    #[napi(js_name = "non_ukb")]
    pub non_ukb: GnomadV4FilteringAlleleFrequency,
}

impl From<ReaderGnomadV4ExomeFilteringAlleleFrequencies>
    for GnomadV4ExomeFilteringAlleleFrequencies
{
    fn from(frequencies: ReaderGnomadV4ExomeFilteringAlleleFrequencies) -> Self {
        Self {
            gnomad: frequencies.gnomad.into(),
            non_ukb: frequencies.non_ukb.into(),
        }
    }
}

#[napi(object)]
pub struct GnomadV4FilteringAlleleFrequency {
    #[napi(js_name = "faf95_max")]
    pub faf95_max: Either<f64, Null>,
    #[napi(js_name = "faf95_max_gen_anc")]
    pub faf95_max_gen_anc: Either<String, Null>,
    #[napi(js_name = "faf99_max")]
    pub faf99_max: Either<f64, Null>,
    #[napi(js_name = "faf99_max_gen_anc")]
    pub faf99_max_gen_anc: Either<String, Null>,
}

impl From<ReaderGnomadV4FilteringAlleleFrequency> for GnomadV4FilteringAlleleFrequency {
    fn from(frequency: ReaderGnomadV4FilteringAlleleFrequency) -> Self {
        Self {
            faf95_max: into_nullable(frequency.faf95_max),
            faf95_max_gen_anc: into_nullable(frequency.faf95_max_gen_anc),
            faf99_max: into_nullable(frequency.faf99_max),
            faf99_max_gen_anc: into_nullable(frequency.faf99_max_gen_anc),
        }
    }
}

#[napi(object)]
pub struct GnomadV4TranscriptConsequence {
    #[napi(js_name = "gene_id")]
    pub gene_id: Either<String, Null>,
    #[napi(js_name = "gene_version")]
    pub gene_version: Either<String, Null>,
    #[napi(js_name = "gene_symbol")]
    pub gene_symbol: Either<String, Null>,
    #[napi(js_name = "transcript_id")]
    pub transcript_id: Either<String, Null>,
    #[napi(js_name = "transcript_version")]
    pub transcript_version: Either<String, Null>,
    pub biotype: Either<String, Null>,
    #[napi(js_name = "consequence_terms")]
    pub consequence_terms: Either<Vec<String>, Null>,
    #[napi(js_name = "major_consequence")]
    pub major_consequence: Either<String, Null>,
    pub hgvsc: Either<String, Null>,
    pub hgvsp: Either<String, Null>,
    #[napi(js_name = "is_canonical")]
    pub is_canonical: Either<bool, Null>,
    #[napi(js_name = "is_mane_select")]
    pub is_mane_select: Either<bool, Null>,
    #[napi(js_name = "is_mane_select_version")]
    pub is_mane_select_version: Either<bool, Null>,
    #[napi(js_name = "refseq_id")]
    pub refseq_id: Either<String, Null>,
    #[napi(js_name = "refseq_version")]
    pub refseq_version: Either<String, Null>,
    pub domains: Either<Vec<String>, Null>,
    pub lof: Either<String, Null>,
    #[napi(js_name = "lof_filter")]
    pub lof_filter: Either<String, Null>,
    #[napi(js_name = "lof_flags")]
    pub lof_flags: Either<String, Null>,
}

impl From<ReaderGnomadV4TranscriptConsequence> for GnomadV4TranscriptConsequence {
    fn from(consequence: ReaderGnomadV4TranscriptConsequence) -> Self {
        Self {
            gene_id: into_nullable(consequence.gene_id),
            gene_version: into_nullable(consequence.gene_version),
            gene_symbol: into_nullable(consequence.gene_symbol),
            transcript_id: into_nullable(consequence.transcript_id),
            transcript_version: into_nullable(consequence.transcript_version),
            biotype: into_nullable(consequence.biotype),
            consequence_terms: into_nullable(consequence.consequence_terms),
            major_consequence: into_nullable(consequence.major_consequence),
            hgvsc: into_nullable(consequence.hgvsc),
            hgvsp: into_nullable(consequence.hgvsp),
            is_canonical: into_nullable(consequence.is_canonical),
            is_mane_select: into_nullable(consequence.is_mane_select),
            is_mane_select_version: into_nullable(consequence.is_mane_select_version),
            refseq_id: into_nullable(consequence.refseq_id),
            refseq_version: into_nullable(consequence.refseq_version),
            domains: into_nullable(consequence.domains),
            lof: into_nullable(consequence.lof),
            lof_filter: into_nullable(consequence.lof_filter),
            lof_flags: into_nullable(consequence.lof_flags),
        }
    }
}

#[napi(object)]
pub struct GnomadV4InSilicoPredictors {
    pub cadd: GnomadV4Cadd,
    #[napi(js_name = "revel_max")]
    pub revel_max: Either<f64, Null>,
    #[napi(js_name = "spliceai_ds_max")]
    pub spliceai_ds_max: Either<f64, Null>,
    #[napi(js_name = "pangolin_largest_ds")]
    pub pangolin_largest_ds: Either<f64, Null>,
    pub phylop: Either<f64, Null>,
    #[napi(js_name = "sift_max")]
    pub sift_max: Either<f64, Null>,
    #[napi(js_name = "polyphen_max")]
    pub polyphen_max: Either<f64, Null>,
}

impl From<ReaderGnomadV4InSilicoPredictors> for GnomadV4InSilicoPredictors {
    fn from(predictors: ReaderGnomadV4InSilicoPredictors) -> Self {
        Self {
            cadd: predictors.cadd.into(),
            revel_max: into_nullable(predictors.revel_max),
            spliceai_ds_max: into_nullable(predictors.spliceai_ds_max.map(f64::from)),
            pangolin_largest_ds: into_nullable(predictors.pangolin_largest_ds),
            phylop: into_nullable(predictors.phylop),
            sift_max: into_nullable(predictors.sift_max),
            polyphen_max: into_nullable(predictors.polyphen_max),
        }
    }
}

#[napi(object)]
pub struct GnomadV4Cadd {
    pub phred: Either<f64, Null>,
    #[napi(js_name = "raw_score")]
    pub raw_score: Either<f64, Null>,
}

impl From<ReaderGnomadV4Cadd> for GnomadV4Cadd {
    fn from(cadd: ReaderGnomadV4Cadd) -> Self {
        Self {
            phred: into_nullable(cadd.phred.map(f64::from)),
            raw_score: into_nullable(cadd.raw_score.map(f64::from)),
        }
    }
}
