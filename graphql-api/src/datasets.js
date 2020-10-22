const DATASET_LABELS = {
  gnomad_r3: 'gnomAD v3',
  gnomad_r2_1: 'gnomAD v2',
  gnomad_r2_1_controls: 'gnomAD v2 (controls)',
  gnomad_r2_1_non_neuro: 'gnomAD v2 (non-neuro)',
  gnomad_r2_1_non_cancer: 'gnomAD v2 (non-cancer)',
  gnomad_r2_1_non_topmed: 'gnomAD v2 (non-TOPMed)',
  exac: 'ExAC',
}

const DATASET_REFERENCE_GENOMES = {
  gnomad_r3: 'GRCh38',
  gnomad_r2_1: 'GRCh37',
  gnomad_r2_1_controls: 'GRCh37',
  gnomad_r2_1_non_neuro: 'GRCh37',
  gnomad_r2_1_non_cancer: 'GRCh37',
  gnomad_r2_1_non_topmed: 'GRCh37',
  exac: 'GRCh37',
}

module.exports = {
  DATASET_LABELS,
  DATASET_REFERENCE_GENOMES,
}
