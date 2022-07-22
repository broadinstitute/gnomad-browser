import PropTypes from 'prop-types'

type MitochondrialVariantDetailPropType = {
  alt: string
  an: number
  ac_hom: number
  ac_hom_mnv: number
  ac_het: number
  excluded_ac?: number
  flags?: string[]
  haplogroup_defining?: boolean
  haplogroups: {
    id: string
    an: number
    ac_hom: number
    ac_het: number
  }[]
  max_heteroplasmy?: number
  populations?: {
    id: string
    an: number
    ac_het: number
    ac_hom: number
  }[]
  pos: number
  ref: string
  reference_genome: string
  variant_id: string
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ alt: Validator<stri... Remove this comment to see the full error message
const MitochondrialVariantDetailPropType: PropTypes.Requireable<MitochondrialVariantDetailPropType> = PropTypes.shape(
  {
    alt: PropTypes.string.isRequired,
    an: PropTypes.number.isRequired,
    ac_hom: PropTypes.number.isRequired,
    ac_hom_mnv: PropTypes.number.isRequired,
    ac_het: PropTypes.number.isRequired,
    excluded_ac: PropTypes.number,
    flags: PropTypes.arrayOf(PropTypes.string),
    haplogroup_defining: PropTypes.bool,
    haplogroups: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        an: PropTypes.number.isRequired,
        ac_hom: PropTypes.number.isRequired,
        ac_het: PropTypes.number.isRequired,
      })
    ).isRequired,
    max_heteroplasmy: PropTypes.number,
    populations: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        an: PropTypes.number.isRequired,
        ac_het: PropTypes.number.isRequired,
        ac_hom: PropTypes.number.isRequired,
      })
    ),
    pos: PropTypes.number.isRequired,
    ref: PropTypes.string.isRequired,
    reference_genome: PropTypes.string.isRequired,
    variant_id: PropTypes.string.isRequired,
  }
)

export default MitochondrialVariantDetailPropType
