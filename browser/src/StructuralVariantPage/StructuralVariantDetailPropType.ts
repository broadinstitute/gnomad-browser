import PropTypes from 'prop-types'

type HistogramPropType = {
  bin_edges: number[]
  bin_freq: number[]
  n_smaller: number
  n_larger: number
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ bin_edges: Validato... Remove this comment to see the full error message
const HistogramPropType: PropTypes.Requireable<HistogramPropType> = PropTypes.shape({
  bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
  bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
  n_smaller: PropTypes.number.isRequired,
  n_larger: PropTypes.number.isRequired,
})

type StructuralVariantDetailPropType = {
  age_distribution?: {
    het: HistogramPropType
    hom: HistogramPropType
  }
  algorithms?: string[]
  alts?: string[]
  ac: number
  an: number
  chrom: string
  chrom2?: string
  consequences: {
    consequence: string
    genes: string[]
  }[]
  copy_numbers?: {
    copy_number: number
    ac: number
  }[]
  cpx_intervals?: string[]
  cpx_type?: string
  end: number
  end2?: number
  evidence: string[]
  filters?: string[]
  genes: string[]
  genotype_quality?: {
    all: HistogramPropType
    alt: HistogramPropType
  }
  length: number
  pos: number
  pos2?: number
  qual: number
  type: string
  variant_id: string
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ age_distribution: R... Remove this comment to see the full error message
const StructuralVariantDetailPropType: PropTypes.Requireable<StructuralVariantDetailPropType> = PropTypes.shape(
  {
    age_distribution: PropTypes.shape({
      het: HistogramPropType.isRequired,
      hom: HistogramPropType.isRequired,
    }),
    algorithms: PropTypes.arrayOf(PropTypes.string.isRequired),
    alts: PropTypes.arrayOf(PropTypes.string.isRequired),
    ac: PropTypes.number.isRequired,
    an: PropTypes.number.isRequired,
    chrom: PropTypes.string.isRequired,
    chrom2: PropTypes.string,
    consequences: PropTypes.arrayOf(
      PropTypes.shape({
        consequence: PropTypes.string.isRequired,
        genes: PropTypes.arrayOf(PropTypes.string).isRequired,
      })
    ).isRequired,
    copy_numbers: PropTypes.arrayOf(
      PropTypes.shape({
        copy_number: PropTypes.number.isRequired,
        ac: PropTypes.number.isRequired,
      })
    ),
    cpx_intervals: PropTypes.arrayOf(PropTypes.string),
    cpx_type: PropTypes.string,
    end: PropTypes.number.isRequired,
    end2: PropTypes.number,
    evidence: PropTypes.arrayOf(PropTypes.string).isRequired,
    filters: PropTypes.arrayOf(PropTypes.string.isRequired),
    genes: PropTypes.arrayOf(PropTypes.string).isRequired,
    genotype_quality: PropTypes.shape({
      all: HistogramPropType.isRequired,
      alt: HistogramPropType.isRequired,
    }),
    length: PropTypes.number.isRequired,
    pos: PropTypes.number.isRequired,
    pos2: PropTypes.number,
    qual: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    variant_id: PropTypes.string.isRequired,
  }
)

export default StructuralVariantDetailPropType
