import PropTypes from 'prop-types'

// TODO: MATCH EVERYTHING WITH THE API TYPE
type CopyNumberVariantPropType = {
  alts?: string[] | null
  sc: number
  sn: number
  sf: number
  chrom: string
  end: number
  filters?: string[]
  genes?: string[]
  length: number
  populations?: {
    id: string
    sc: number
    sn: number
    sf: number
  }[]
  pos: number
  qual?: number
  type: string
  posmin?: number
  posmax?: number
  endmin?: number
  endmax?: number
  variant_id: string
}

const PopulationPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  sc: PropTypes.number.isRequired,
  sn: PropTypes.number.isRequired,
  sf: PropTypes.number.isRequired,
})

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ ac: Validator<numbe... Remove this comment to see the full error message
const CopyNumberVariantPropType: PropTypes.Requireable<CopyNumberVariantPropType> = PropTypes.shape(
  {
    alts: PropTypes.arrayOf(PropTypes.string),
    sc: PropTypes.number.isRequired,
    sn: PropTypes.number.isRequired,
    sf: PropTypes.number,
    chrom: PropTypes.string.isRequired,
    end: PropTypes.number.isRequired,
    filters: PropTypes.arrayOf(PropTypes.string.isRequired),
    genes: PropTypes.arrayOf(PropTypes.string),
    length: PropTypes.number.isRequired,
    populations: PropTypes.arrayOf(PopulationPropType),
    pos: PropTypes.number.isRequired,
    qual: PropTypes.number,
    type: PropTypes.string.isRequired,
    posmin: PropTypes.number.isRequired,
    posmax: PropTypes.number.isRequired,
    endmin: PropTypes.number.isRequired,
    endmax: PropTypes.number.isRequired,
    variant_id: PropTypes.string.isRequired,
  }
)

export default CopyNumberVariantPropType
