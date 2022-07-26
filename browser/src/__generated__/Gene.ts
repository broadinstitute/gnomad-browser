/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { ReferenceGenomeId, DatasetId } from "./../../__generated__/globalTypes";

// ====================================================
// GraphQL query operation: Gene
// ====================================================

export interface Gene_gene_mane_select_transcript {
  __typename: "ManeSelectTranscript";
  ensembl_id: string;
  ensembl_version: string;
  refseq_id: string;
  refseq_version: string;
}

export interface Gene_gene_exons {
  __typename: "Exon";
  feature_type: string;
  start: number;
  stop: number;
}

export interface Gene_gene_gnomad_constraint {
  __typename: "GnomadConstraint";
  exp_lof: number | null;
  exp_mis: number | null;
  exp_syn: number | null;
  obs_lof: number | null;
  obs_mis: number | null;
  obs_syn: number | null;
  oe_lof: number | null;
  oe_lof_lower: number | null;
  oe_lof_upper: number | null;
  oe_mis: number | null;
  oe_mis_lower: number | null;
  oe_mis_upper: number | null;
  oe_syn: number | null;
  oe_syn_lower: number | null;
  oe_syn_upper: number | null;
  lof_z: number | null;
  mis_z: number | null;
  syn_z: number | null;
  /**
   * Deprecated fields
   */
  pLI: number | null;
  flags: string[] | null;
}

export interface Gene_gene_exac_constraint {
  __typename: "ExacConstraint";
  exp_syn: number | null;
  obs_syn: number | null;
  syn_z: number | null;
  exp_mis: number | null;
  obs_mis: number | null;
  mis_z: number | null;
  exp_lof: number | null;
  obs_lof: number | null;
  lof_z: number | null;
  /**
   * Deprecated fields
   */
  pLI: number | null;
}

export interface Gene_gene_transcripts_exons {
  __typename: "Exon";
  feature_type: string;
  start: number;
  stop: number;
}

export interface Gene_gene_transcripts_gtex_tissue_expression {
  __typename: "GtexTissueExpression";
  adipose_subcutaneous: number;
  adipose_visceral_omentum: number;
  adrenal_gland: number;
  artery_aorta: number;
  artery_coronary: number;
  artery_tibial: number;
  bladder: number;
  brain_amygdala: number;
  brain_anterior_cingulate_cortex_ba24: number;
  brain_caudate_basal_ganglia: number;
  brain_cerebellar_hemisphere: number;
  brain_cerebellum: number;
  brain_cortex: number;
  brain_frontal_cortex_ba9: number;
  brain_hippocampus: number;
  brain_hypothalamus: number;
  brain_nucleus_accumbens_basal_ganglia: number;
  brain_putamen_basal_ganglia: number;
  brain_spinal_cord_cervical_c_1: number;
  brain_substantia_nigra: number;
  breast_mammary_tissue: number;
  cells_ebv_transformed_lymphocytes: number;
  cells_transformed_fibroblasts: number;
  cervix_ectocervix: number;
  cervix_endocervix: number;
  colon_sigmoid: number;
  colon_transverse: number;
  esophagus_gastroesophageal_junction: number;
  esophagus_mucosa: number;
  esophagus_muscularis: number;
  fallopian_tube: number;
  heart_atrial_appendage: number;
  heart_left_ventricle: number;
  kidney_cortex: number;
  liver: number;
  lung: number;
  minor_salivary_gland: number;
  muscle_skeletal: number;
  nerve_tibial: number;
  ovary: number;
  pancreas: number;
  pituitary: number;
  prostate: number;
  skin_not_sun_exposed_suprapubic: number;
  skin_sun_exposed_lower_leg: number;
  small_intestine_terminal_ileum: number;
  spleen: number;
  stomach: number;
  testis: number;
  thyroid: number;
  uterus: number;
  vagina: number;
  whole_blood: number;
}

export interface Gene_gene_transcripts {
  __typename: "GeneTranscript";
  transcript_id: string;
  transcript_version: string;
  strand: string;
  exons: Gene_gene_transcripts_exons[];
  gtex_tissue_expression: Gene_gene_transcripts_gtex_tissue_expression | null;
}

export interface Gene_gene_pext_regions_tissues {
  __typename: "PextRegionTissueValues";
  adipose_subcutaneous: number;
  adipose_visceral_omentum: number;
  adrenal_gland: number;
  artery_aorta: number;
  artery_coronary: number;
  artery_tibial: number;
  bladder: number;
  brain_amygdala: number;
  brain_anterior_cingulate_cortex_ba24: number;
  brain_caudate_basal_ganglia: number;
  brain_cerebellar_hemisphere: number;
  brain_cerebellum: number;
  brain_cortex: number;
  brain_frontal_cortex_ba9: number;
  brain_hippocampus: number;
  brain_hypothalamus: number;
  brain_nucleus_accumbens_basal_ganglia: number;
  brain_putamen_basal_ganglia: number;
  brain_spinal_cord_cervical_c_1: number;
  brain_substantia_nigra: number;
  breast_mammary_tissue: number;
  cells_ebv_transformed_lymphocytes: number;
  cells_transformed_fibroblasts: number;
  cervix_ectocervix: number;
  cervix_endocervix: number;
  colon_sigmoid: number;
  colon_transverse: number;
  esophagus_gastroesophageal_junction: number;
  esophagus_mucosa: number;
  esophagus_muscularis: number;
  fallopian_tube: number;
  heart_atrial_appendage: number;
  heart_left_ventricle: number;
  kidney_cortex: number;
  liver: number;
  lung: number;
  minor_salivary_gland: number;
  muscle_skeletal: number;
  nerve_tibial: number;
  ovary: number;
  pancreas: number;
  pituitary: number;
  prostate: number;
  skin_not_sun_exposed_suprapubic: number;
  skin_sun_exposed_lower_leg: number;
  small_intestine_terminal_ileum: number;
  spleen: number;
  stomach: number;
  testis: number;
  thyroid: number;
  uterus: number;
  vagina: number;
  whole_blood: number;
}

export interface Gene_gene_pext_regions {
  __typename: "PextRegion";
  start: number;
  stop: number;
  mean: number;
  tissues: Gene_gene_pext_regions_tissues | null;
}

export interface Gene_gene_pext {
  __typename: "Pext";
  regions: Gene_gene_pext_regions[];
  flags: string[];
}

export interface Gene_gene_exac_regional_missense_constraint_regions {
  __typename: "ExacRegionalMissenseConstraintRegion";
  start: number;
  stop: number;
  obs_mis: number | null;
  exp_mis: number | null;
  obs_exp: number | null;
  chisq_diff_null: number | null;
}

export interface Gene_gene_short_tandem_repeats {
  __typename: "ShortTandemRepeat";
  id: string;
}

export interface Gene_gene {
  __typename: "Gene";
  reference_genome: ReferenceGenomeId;
  gene_id: string;
  gene_version: string;
  symbol: string;
  gencode_symbol: string;
  name: string | null;
  canonical_transcript_id: string | null;
  mane_select_transcript: Gene_gene_mane_select_transcript | null;
  hgnc_id: string | null;
  ncbi_id: string | null;
  omim_id: string | null;
  chrom: string;
  start: number;
  stop: number;
  strand: string;
  exons: Gene_gene_exons[];
  flags: string[];
  gnomad_constraint: Gene_gene_gnomad_constraint | null;
  exac_constraint: Gene_gene_exac_constraint | null;
  transcripts: Gene_gene_transcripts[];
  pext: Gene_gene_pext | null;
  exac_regional_missense_constraint_regions: Gene_gene_exac_regional_missense_constraint_regions[] | null;
  short_tandem_repeats: Gene_gene_short_tandem_repeats[];
}

export interface Gene {
  gene: Gene_gene | null;
}

export interface GeneVariables {
  geneId?: string | null;
  geneSymbol?: string | null;
  referenceGenome: ReferenceGenomeId;
  shortTandemRepeatDatasetId: DatasetId;
  includeShortTandemRepeats: boolean;
}
