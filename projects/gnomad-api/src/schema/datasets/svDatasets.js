import fetchGnomadStructuralVariantDetails from './gnomad_sv_r2_1/fetchGnomadStructuralVariantDetails'
import fetchGnomadStructuralVariantsByGene from './gnomad_sv_r2_1/fetchGnomadStructuralVariantsByGene'
import fetchGnomadStructuralVariantsByRegion from './gnomad_sv_r2_1/fetchGnomadStructuralVariantsByRegion'

const datasets = {
  gnomad_sv_r2_1: {
    label: 'gnomAD SV v2.1',
    referenceGenome: 'GRCh37',
    fetchVariantDetails: fetchGnomadStructuralVariantDetails,
    fetchVariantsByGene: fetchGnomadStructuralVariantsByGene,
    fetchVariantsByRegion: fetchGnomadStructuralVariantsByRegion,
  },
}

const subsets = ['controls', 'non_neuro']
subsets.forEach(subset => {
  datasets[`gnomad_sv_r2_1_${subset}`] = {
    referenceGenome: 'GRCh37',
    fetchVariantDetails: (...args) => fetchGnomadStructuralVariantDetails(...args, subset),
    fetchVariantsByGene: (...args) => fetchGnomadStructuralVariantsByGene(...args, subset),
    fetchVariantsByRegion: (...args) => fetchGnomadStructuralVariantsByRegion(...args, subset),
  }
})

datasets.gnomad_sv_r2_1_controls.label = 'gnomAD SV v2.1 (controls)'
datasets.gnomad_sv_r2_1_non_neuro.label = 'gnomAD SV v2.1 (non-neuro)'

export default datasets
