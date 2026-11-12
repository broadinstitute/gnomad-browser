use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4VariantListEntry {
    pub variant_id: String,
    pub locus: GnomadV4Locus,
    pub alleles: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rsids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flags: Option<Vec<String>>,
    pub exome: GnomadV4ExomeData,
    pub genome: GnomadV4GenomeData,
    pub joint: GnomadV4JointData,
    pub transcript_consequences: Vec<GnomadV4TranscriptConsequence>,
    pub in_silico_predictors: GnomadV4InSilicoPredictors,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4Locus {
    pub contig: String,
    pub position: i32,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4ExomeData {
    pub freq: GnomadV4FrequencySubsets,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flags: Option<Vec<String>>,
    pub fafmax: GnomadV4ExomeFilteringAlleleFrequencies,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4GenomeData {
    pub freq: GnomadV4FrequencySubsets,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4JointData {
    pub freq: GnomadV4FrequencySubsets,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<Vec<String>>,
    pub fafmax: GnomadV4FilteringAlleleFrequency,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4FrequencySubsets {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub all: Option<GnomadV4Frequency>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub non_ukb: Option<GnomadV4Frequency>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4Frequency {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ac: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ac_raw: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub an: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hemizygote_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homozygote_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ancestry_groups: Option<Vec<GnomadV4AncestryFrequency>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4AncestryFrequency {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ac: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub an: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hemizygote_count: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homozygote_count: Option<i64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4ExomeFilteringAlleleFrequencies {
    pub gnomad: GnomadV4FilteringAlleleFrequency,
    pub non_ukb: GnomadV4FilteringAlleleFrequency,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4FilteringAlleleFrequency {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub faf95_max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub faf95_max_gen_anc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub faf99_max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub faf99_max_gen_anc: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4TranscriptConsequence {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gene_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gene_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gene_symbol: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcript_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcript_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub biotype: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub consequence_terms: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub major_consequence: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hgvsc: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hgvsp: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_canonical: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_mane_select: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_mane_select_version: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refseq_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refseq_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domains: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lof: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lof_filter: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lof_flags: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4InSilicoPredictors {
    pub cadd: GnomadV4Cadd,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revel_max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spliceai_ds_max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pangolin_largest_ds: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phylop: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sift_max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub polyphen_max: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4Cadd {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phred: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_score: Option<f64>,
}
