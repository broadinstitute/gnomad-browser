export const HUMAN_AUTOSOMES = Array.from(new Array(22), (x, i) => `chr${i + 1}`)

export const HUMAN_CHROMOSOMES = [...HUMAN_AUTOSOMES, 'chrX', 'chrY']

export const HUMAN_CHROMOSOMES_WITH_MITO = [ ...HUMAN_CHROMOSOMES, 'chrM']
