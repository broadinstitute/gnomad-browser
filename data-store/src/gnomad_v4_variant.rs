use serde::{Deserialize, Serialize};

use crate::{
    GnomadV4ExomeFilteringAlleleFrequencies, GnomadV4FilteringAlleleFrequency, GnomadV4Frequency,
    GnomadV4FrequencySubsets, GnomadV4InSilicoPredictors, GnomadV4Locus,
    GnomadV4TranscriptConsequence,
};

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4Variant {
    pub variant_id: String,
    pub locus: GnomadV4Locus,
    pub alleles: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rsids: Option<Vec<String>>,
    pub exome: GnomadV4ExomeVariantData,
    pub genome: GnomadV4GenomeVariantData,
    pub joint: GnomadV4JointVariantData,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transcript_consequences: Option<Vec<GnomadV4TranscriptConsequence>>,
    pub in_silico_predictors: GnomadV4InSilicoPredictors,
    pub colocated_variants: GnomadV4ColocatedVariants,
    pub coverage: GnomadV4VariantCoverage,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub caid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vrs: Option<GnomadV4VrsAlleles>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4ExomeVariantData {
    pub freq: GnomadV4FrequencySubsets,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flags: Option<Vec<String>>,
    pub fafmax: GnomadV4ExomeFilteringAlleleFrequencies,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub faf95: Option<GnomadV4GroupMaximum>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub faf99: Option<GnomadV4GroupMaximum>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub age_distribution: Option<GnomadV4AgeDistribution>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quality_metrics: Option<GnomadV4QualityMetrics>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4GenomeVariantData {
    pub freq: GnomadV4GenomeFrequencies,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flags: Option<Vec<String>>,
    pub fafmax: GnomadV4FilteringAlleleFrequency,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub faf95: Option<GnomadV4GroupMaximum>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub faf99: Option<GnomadV4GroupMaximum>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub age_distribution: Option<GnomadV4AgeDistribution>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quality_metrics: Option<GnomadV4QualityMetrics>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4GenomeFrequencies {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub all: Option<GnomadV4Frequency>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hgdp: Option<GnomadV4Frequency>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tgp: Option<GnomadV4Frequency>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4JointVariantData {
    pub freq: GnomadV4FrequencySubsets,
    pub fafmax: GnomadV4FilteringAlleleFrequency,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub freq_comparison_stats: Option<GnomadV4FrequencyComparisonStats>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4FrequencyComparisonStats {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contingency_table_test: Option<Vec<GnomadV4ContingencyTableTest>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cochran_mantel_haenszel_test: Option<GnomadV4CochranMantelHaenszelTest>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stat_union: Option<GnomadV4StatUnion>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4ContingencyTableTest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_value: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub odds_ratio: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4CochranMantelHaenszelTest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_value: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chisq: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4StatUnion {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub p_value: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stat_test_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gen_ancs: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4GroupMaximum {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub grpmax: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub grpmax_gen_anc: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4Histogram {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bin_edges: Option<Vec<f64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bin_freq: Option<Vec<i64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n_smaller: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n_larger: Option<i64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4AgeDistribution {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub het: Option<GnomadV4Histogram>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hom: Option<GnomadV4Histogram>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4QualityMetrics {
    pub allele_balance: GnomadV4QualityHistograms,
    pub genotype_depth: GnomadV4QualityHistograms,
    pub genotype_quality: GnomadV4QualityHistograms,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub site_quality_metrics: Option<Vec<GnomadV4SiteQualityMetric>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4QualityHistograms {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub all_adj: Option<GnomadV4Histogram>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub all_raw: Option<GnomadV4Histogram>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt_adj: Option<GnomadV4Histogram>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt_raw: Option<GnomadV4Histogram>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4SiteQualityMetric {
    pub metric: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4ColocatedVariants {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub all: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub non_ukb: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hgdp: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tgp: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4VariantCoverage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exome: Option<GnomadV4Coverage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub genome: Option<GnomadV4Coverage>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4Coverage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mean: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub median_approx: Option<i32>,
    #[serde(rename = "total_dp", skip_serializing_if = "Option::is_none")]
    pub total_depth: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_1: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_5: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_10: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_15: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_20: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_25: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_30: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_50: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub over_100: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4VrsAlleles {
    #[serde(rename = "ref", skip_serializing_if = "Option::is_none")]
    pub reference: Option<GnomadV4VrsAllele>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt: Option<GnomadV4VrsAllele>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct GnomadV4VrsAllele {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub allele_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub length: Option<i32>,
    #[serde(
        rename(deserialize = "repeat_subunit_lengths"),
        skip_serializing_if = "Option::is_none"
    )]
    pub repeat_subunit_length: Option<i32>,
}
