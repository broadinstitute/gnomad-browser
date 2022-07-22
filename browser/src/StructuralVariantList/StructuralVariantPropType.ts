import PropTypes from 'prop-types'

type StructuralVariantPropType = {
  ac: number
  an: number
  chrom: string
  chrom2?: string
  consequence?: string
  end: number
  end2?: number
  filters?: string[]
  length: number
  pos: number
  pos2?: number
  type: string
  variant_id: string
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ ac: Validator<numbe... Remove this comment to see the full error message
const StructuralVariantPropType: PropTypes.Requireable<StructuralVariantPropType> = PropTypes.shape(
  {
    ac: PropTypes.number.isRequired,
    an: PropTypes.number.isRequired,
    chrom: PropTypes.string.isRequired,
    chrom2: PropTypes.string,
    consequence: PropTypes.string,
    end: PropTypes.number.isRequired,
    end2: PropTypes.number,
    filters: PropTypes.arrayOf(PropTypes.string.isRequired),
    length: PropTypes.number.isRequired,
    pos: PropTypes.number.isRequired,
    pos2: PropTypes.number,
    type: PropTypes.string.isRequired,
    variant_id: PropTypes.string.isRequired,
  }
)

export default StructuralVariantPropType
