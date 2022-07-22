import PropTypes from 'prop-types'

type CooccurrenceDataPropType = {
  variant_ids: string[]
  genotype_counts: number[]
  haplotype_counts?: number[]
  p_compound_heterozygous?: number
  populations?: {
    id: string
    genotype_counts: number[]
    haplotype_counts?: number[]
    p_compound_heterozygous?: number
  }[]
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ variant_ids: Valida... Remove this comment to see the full error message
const CooccurrenceDataPropType: PropTypes.Requireable<CooccurrenceDataPropType> = PropTypes.shape({
  variant_ids: PropTypes.arrayOf(PropTypes.string).isRequired,
  genotype_counts: PropTypes.arrayOf(PropTypes.number).isRequired,
  haplotype_counts: PropTypes.arrayOf(PropTypes.number),
  p_compound_heterozygous: PropTypes.number,
  populations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      genotype_counts: PropTypes.arrayOf(PropTypes.number).isRequired,
      haplotype_counts: PropTypes.arrayOf(PropTypes.number),
      p_compound_heterozygous: PropTypes.number,
    })
  ),
})

export default CooccurrenceDataPropType
