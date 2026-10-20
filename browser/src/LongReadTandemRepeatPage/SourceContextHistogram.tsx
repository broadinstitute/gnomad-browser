import { RepeatCountPlots } from './types'

export const repeatPlotAvailable = (
  plots: RepeatCountPlots | undefined,
  kind: 'allele' | 'genotype'
) => {
  if (plots?.status === 'AVAILABLE_EXACT') return true
  if (plots?.status !== 'AVAILABLE_SOURCE_CONTEXT' || !plots.source_context) return false
  return kind === 'allele'
    ? plots.allele_status === 'AVAILABLE'
    : ['AVAILABLE_SOURCE_ENCODING', 'AVAILABLE_TWO_COPY_CONSISTENT'].includes(
        plots.pair_status || ''
      )
}
