// Define Default dataset
export const getDefaultDataset = () => 'gnomad_r3';

// List of available datasets. 
const datasets = {
  gnomad_r3: {
    label: 'gnomAD v3',
    referenceGenome: 'GRCh38',
    isTopLevel: true },
  gnomad_r2_1: {
    label: 'gnomAD v2.1.1',
    referenceGenome: 'GRCh37',
    isTopLevel: true },
  gnomad_r2_1_controls: {
    label: 'gnomAD v2.1.1 (controls)',
    referenceGenome: 'GRCh37',
    isTopLevel: false },
  gnomad_r2_1_non_cancer: {
    label: 'gnomAD v2.1.1 (non-cancer)',
    referenceGenome: 'GRCh37',
    isTopLevel: false },
  gnomad_r2_1_non_neuro: {
    label: 'gnomAD v2.1.1 (non-neuro)',
    referenceGenome: 'GRCh37',
    isTopLevel: false },
  gnomad_r2_1_non_topmed: {
    label: 'gnomAD v2.1.1 (non-TOPMed)',
    referenceGenome: 'GRCh37',
    isTopLevel: false },
  gnomad_sv_r2_1: {
    label: 'gnomAD SVs v2.1',
    referenceGenome: 'GRCh37',
    isTopLevel: false },
  gnomad_sv_r2_1_controls: {
    label: 'gnomAD SVs v2.1 (controls)',
    referenceGenome: 'GRCh37',
    isTopLevel: false },
  gnomad_sv_r2_1_non_neuro: {
    label: 'gnomAD SVs v2.1 (non-neuro)',
    referenceGenome: 'GRCh37',
    isTopLevel: false },
  exac: {
    label: 'ExAC v1.0',
    referenceGenome: 'GRCh37',
    isTopLevel: true },
}

export const referenceGenomeForDataset = datasetId => datasets[datasetId].referenceGenome || 'GRCh38';

export const labelForDataset = datasetId => datasets[datasetId].label || 'Unknown'

export const topLevelDataset = () => Object.keys(datasets).filter(o => datasets[o].isTopLevel);
