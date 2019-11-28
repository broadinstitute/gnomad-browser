import PropTypes from 'prop-types'

const HistogramPropType = PropTypes.shape({
  bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
  bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
  n_smaller: PropTypes.number.isRequired,
  n_larger: PropTypes.number.isRequired,
})

const StructuralVariantDetailPropType = PropTypes.shape({
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
})

export default StructuralVariantDetailPropType
