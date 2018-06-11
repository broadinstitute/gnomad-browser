export const HUMAN_AUTOSOMES = Array.from(new Array(22), (x, i) => `${i + 1}`)

export const HUMAN_CHROMOSOMES = [...HUMAN_AUTOSOMES, 'X', 'Y']

export const HUMAN_CHROMOSOMES_WITH_MITO = [...HUMAN_CHROMOSOMES, 'M']
