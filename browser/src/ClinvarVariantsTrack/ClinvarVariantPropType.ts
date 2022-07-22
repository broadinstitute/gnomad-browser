import PropTypes from 'prop-types'

type ClinvarVariantPropType = {
  clinical_significance: string
  clinvar_variation_id: string
  gnomad?: {
    exome?: {
      ac: number
      an: number
      filters: string[]
    }
    genome?: {
      ac: number
      an: number
      filters: string[]
    }
  }
  gold_stars: number
  hgvsc?: string
  hgvsp?: string
  in_gnomad: boolean
  major_consequence?: string
  pos: number
  review_status: string
  transcript_id: string
  variant_id: string
}

// @ts-expect-error TS(2322) FIXME: Type 'Requireable<InferProps<{ clinical_significan... Remove this comment to see the full error message
const ClinvarVariantPropType: PropTypes.Requireable<ClinvarVariantPropType> = PropTypes.shape({
  clinical_significance: PropTypes.string.isRequired,
  clinvar_variation_id: PropTypes.string.isRequired,
  gnomad: PropTypes.shape({
    exome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      filters: PropTypes.arrayOf(PropTypes.string).isRequired,
    }),
    genome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      filters: PropTypes.arrayOf(PropTypes.string).isRequired,
    }),
  }),
  gold_stars: PropTypes.number.isRequired,
  hgvsc: PropTypes.string,
  hgvsp: PropTypes.string,
  in_gnomad: PropTypes.bool.isRequired,
  major_consequence: PropTypes.string,
  pos: PropTypes.number.isRequired,
  review_status: PropTypes.string.isRequired,
  transcript_id: PropTypes.string.isRequired,
  variant_id: PropTypes.string.isRequired,
})

export default ClinvarVariantPropType
