/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { DatasetId, ReferenceGenomeId } from "./../../__generated__/globalTypes";

// ====================================================
// GraphQL query operation: GnomadVariant
// ====================================================

export interface GnomadVariant_variant_coverage_exome {
  __typename: "Coverage";
  mean: number | null;
}

export interface GnomadVariant_variant_coverage_genome {
  __typename: "Coverage";
  mean: number | null;
}

export interface GnomadVariant_variant_coverage {
  __typename: "VariantCoverage";
  exome: GnomadVariant_variant_coverage_exome | null;
  genome: GnomadVariant_variant_coverage_genome | null;
}

export interface GnomadVariant_variant_multi_nucleotide_variants {
  __typename: "MultiNucleotideVariantSummary";
  combined_variant_id: string;
  changes_amino_acids: boolean;
  n_individuals: number;
  other_constituent_snvs: string[];
}

export interface GnomadVariant_variant_exome_faf95 {
  __typename: "VariantFilteringAlleleFrequency";
  popmax: number | null;
  popmax_population: string | null;
}

export interface GnomadVariant_variant_exome_populations {
  __typename: "VariantPopulation";
  id: string;
  ac: number;
  an: number;
  ac_hemi: number | null;
  /**
   * Deprecated - replaced by homozygote/hemizygote count
   */
  ac_hom: number;
}

export interface GnomadVariant_variant_exome_local_ancestry_populations {
  __typename: "VariantLocalAncestryPopulation";
  id: string;
  ac: number;
  an: number;
}

export interface GnomadVariant_variant_exome_age_distribution_het {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_exome_age_distribution_hom {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_exome_age_distribution {
  __typename: "VariantAgeDistribution";
  het: GnomadVariant_variant_exome_age_distribution_het | null;
  hom: GnomadVariant_variant_exome_age_distribution_hom | null;
}

export interface GnomadVariant_variant_exome_quality_metrics_allele_balance_alt {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_exome_quality_metrics_allele_balance {
  __typename: "VariantAlleleBalance";
  alt: GnomadVariant_variant_exome_quality_metrics_allele_balance_alt | null;
}

export interface GnomadVariant_variant_exome_quality_metrics_genotype_depth_all {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_exome_quality_metrics_genotype_depth_alt {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_exome_quality_metrics_genotype_depth {
  __typename: "VariantGenotypeDepth";
  all: GnomadVariant_variant_exome_quality_metrics_genotype_depth_all | null;
  alt: GnomadVariant_variant_exome_quality_metrics_genotype_depth_alt | null;
}

export interface GnomadVariant_variant_exome_quality_metrics_genotype_quality_all {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_exome_quality_metrics_genotype_quality_alt {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_exome_quality_metrics_genotype_quality {
  __typename: "VariantGenotypeQuality";
  all: GnomadVariant_variant_exome_quality_metrics_genotype_quality_all | null;
  alt: GnomadVariant_variant_exome_quality_metrics_genotype_quality_alt | null;
}

export interface GnomadVariant_variant_exome_quality_metrics_site_quality_metrics {
  __typename: "VariantSiteQualityMetric";
  metric: string;
  value: number | null;
}

export interface GnomadVariant_variant_exome_quality_metrics {
  __typename: "VariantQualityMetrics";
  allele_balance: GnomadVariant_variant_exome_quality_metrics_allele_balance | null;
  genotype_depth: GnomadVariant_variant_exome_quality_metrics_genotype_depth | null;
  genotype_quality: GnomadVariant_variant_exome_quality_metrics_genotype_quality | null;
  site_quality_metrics: GnomadVariant_variant_exome_quality_metrics_site_quality_metrics[];
}

export interface GnomadVariant_variant_exome {
  __typename: "VariantDetailsSequencingTypeData";
  ac: number | null;
  an: number | null;
  ac_hemi: number | null;
  /**
   * Deprecated - replaced by homozygote/hemizygote count
   */
  ac_hom: number | null;
  faf95: GnomadVariant_variant_exome_faf95 | null;
  filters: string[] | null;
  populations: (GnomadVariant_variant_exome_populations | null)[] | null;
  local_ancestry_populations: (GnomadVariant_variant_exome_local_ancestry_populations | null)[];
  age_distribution: GnomadVariant_variant_exome_age_distribution | null;
  quality_metrics: GnomadVariant_variant_exome_quality_metrics | null;
}

export interface GnomadVariant_variant_genome_faf95 {
  __typename: "VariantFilteringAlleleFrequency";
  popmax: number | null;
  popmax_population: string | null;
}

export interface GnomadVariant_variant_genome_populations {
  __typename: "VariantPopulation";
  id: string;
  ac: number;
  an: number;
  ac_hemi: number | null;
  /**
   * Deprecated - replaced by homozygote/hemizygote count
   */
  ac_hom: number;
}

export interface GnomadVariant_variant_genome_local_ancestry_populations {
  __typename: "VariantLocalAncestryPopulation";
  id: string;
  ac: number;
  an: number;
}

export interface GnomadVariant_variant_genome_age_distribution_het {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_genome_age_distribution_hom {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_genome_age_distribution {
  __typename: "VariantAgeDistribution";
  het: GnomadVariant_variant_genome_age_distribution_het | null;
  hom: GnomadVariant_variant_genome_age_distribution_hom | null;
}

export interface GnomadVariant_variant_genome_quality_metrics_allele_balance_alt {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_genome_quality_metrics_allele_balance {
  __typename: "VariantAlleleBalance";
  alt: GnomadVariant_variant_genome_quality_metrics_allele_balance_alt | null;
}

export interface GnomadVariant_variant_genome_quality_metrics_genotype_depth_all {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_genome_quality_metrics_genotype_depth_alt {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_genome_quality_metrics_genotype_depth {
  __typename: "VariantGenotypeDepth";
  all: GnomadVariant_variant_genome_quality_metrics_genotype_depth_all | null;
  alt: GnomadVariant_variant_genome_quality_metrics_genotype_depth_alt | null;
}

export interface GnomadVariant_variant_genome_quality_metrics_genotype_quality_all {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_genome_quality_metrics_genotype_quality_alt {
  __typename: "Histogram";
  bin_edges: number[];
  bin_freq: number[];
  n_smaller: number | null;
  n_larger: number | null;
}

export interface GnomadVariant_variant_genome_quality_metrics_genotype_quality {
  __typename: "VariantGenotypeQuality";
  all: GnomadVariant_variant_genome_quality_metrics_genotype_quality_all | null;
  alt: GnomadVariant_variant_genome_quality_metrics_genotype_quality_alt | null;
}

export interface GnomadVariant_variant_genome_quality_metrics_site_quality_metrics {
  __typename: "VariantSiteQualityMetric";
  metric: string;
  value: number | null;
}

export interface GnomadVariant_variant_genome_quality_metrics {
  __typename: "VariantQualityMetrics";
  allele_balance: GnomadVariant_variant_genome_quality_metrics_allele_balance | null;
  genotype_depth: GnomadVariant_variant_genome_quality_metrics_genotype_depth | null;
  genotype_quality: GnomadVariant_variant_genome_quality_metrics_genotype_quality | null;
  site_quality_metrics: GnomadVariant_variant_genome_quality_metrics_site_quality_metrics[];
}

export interface GnomadVariant_variant_genome {
  __typename: "VariantDetailsSequencingTypeData";
  ac: number | null;
  an: number | null;
  ac_hemi: number | null;
  /**
   * Deprecated - replaced by homozygote/hemizygote count
   */
  ac_hom: number | null;
  faf95: GnomadVariant_variant_genome_faf95 | null;
  filters: string[] | null;
  populations: (GnomadVariant_variant_genome_populations | null)[] | null;
  local_ancestry_populations: (GnomadVariant_variant_genome_local_ancestry_populations | null)[];
  age_distribution: GnomadVariant_variant_genome_age_distribution | null;
  quality_metrics: GnomadVariant_variant_genome_quality_metrics | null;
}

export interface GnomadVariant_variant_lof_curations {
  __typename: "LoFCuration";
  gene_id: string;
  gene_symbol: string | null;
  verdict: string;
  flags: string[] | null;
  project: string;
}

export interface GnomadVariant_variant_transcript_consequences {
  __typename: "TranscriptConsequence";
  domains: string[] | null;
  gene_id: string;
  gene_version: string | null;
  gene_symbol: string | null;
  hgvs: string | null;
  hgvsc: string | null;
  hgvsp: string | null;
  is_canonical: boolean | null;
  is_mane_select: boolean | null;
  is_mane_select_version: boolean | null;
  lof: string | null;
  lof_flags: string | null;
  lof_filter: string | null;
  major_consequence: string | null;
  polyphen_prediction: string | null;
  sift_prediction: string | null;
  transcript_id: string;
  transcript_version: string;
}

export interface GnomadVariant_variant_in_silico_predictors {
  __typename: "VariantInSilicoPredictor";
  id: string;
  value: string;
  flags: string[];
}

export interface GnomadVariant_variant {
  __typename: "VariantDetails";
  variant_id: string;
  reference_genome: ReferenceGenomeId;
  chrom: string;
  pos: number;
  ref: string;
  alt: string;
  caid: string | null;
  colocated_variants: string[];
  coverage: GnomadVariant_variant_coverage;
  multi_nucleotide_variants: GnomadVariant_variant_multi_nucleotide_variants[] | null;
  exome: GnomadVariant_variant_exome | null;
  genome: GnomadVariant_variant_genome | null;
  flags: string[] | null;
  lof_curations: GnomadVariant_variant_lof_curations[] | null;
  rsids: string[] | null;
  transcript_consequences: GnomadVariant_variant_transcript_consequences[] | null;
  in_silico_predictors: GnomadVariant_variant_in_silico_predictors[] | null;
}

export interface GnomadVariant_clinvar_variant_submissions_conditions {
  __typename: "ClinVarCondition";
  name: string;
  medgen_id: string | null;
}

export interface GnomadVariant_clinvar_variant_submissions {
  __typename: "ClinVarSubmission";
  clinical_significance: string | null;
  conditions: GnomadVariant_clinvar_variant_submissions_conditions[];
  last_evaluated: string | null;
  review_status: string;
  submitter_name: string;
}

export interface GnomadVariant_clinvar_variant {
  __typename: "ClinVarVariantDetails";
  clinical_significance: string;
  clinvar_variation_id: string;
  gold_stars: number;
  last_evaluated: string | null;
  review_status: string;
  submissions: GnomadVariant_clinvar_variant_submissions[];
}

export interface GnomadVariant_liftover_liftover {
  __typename: "LiftoverVariant";
  variant_id: string;
  reference_genome: ReferenceGenomeId;
}

export interface GnomadVariant_liftover {
  __typename: "LiftoverResult";
  liftover: GnomadVariant_liftover_liftover;
  datasets: string[];
}

export interface GnomadVariant_liftover_sources_source {
  __typename: "LiftoverVariant";
  variant_id: string;
  reference_genome: ReferenceGenomeId;
}

export interface GnomadVariant_liftover_sources {
  __typename: "LiftoverResult";
  source: GnomadVariant_liftover_sources_source;
  datasets: string[];
}

export interface GnomadVariant_meta {
  __typename: "BrowserMetadata";
  clinvar_release_date: string;
}

export interface GnomadVariant {
  variant: GnomadVariant_variant | null;
  clinvar_variant: GnomadVariant_clinvar_variant | null;
  liftover: GnomadVariant_liftover[];
  liftover_sources: GnomadVariant_liftover_sources[];
  meta: GnomadVariant_meta;
}

export interface GnomadVariantVariables {
  variantId: string;
  datasetId: DatasetId;
  referenceGenome: ReferenceGenomeId;
  includeLocalAncestry: boolean;
  includeLiftoverAsSource: boolean;
  includeLiftoverAsTarget: boolean;
}
