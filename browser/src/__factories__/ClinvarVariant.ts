import { Factory } from 'fishery'
import { ClinvarVariant } from '../VariantPage/VariantPage'

const clinvarVariantFactory = Factory.define<ClinvarVariant>(
  ({ params, associations, sequence }) => {
    const {
      clinical_significance = 'benign',
      clinvar_variation_id = (123456 + sequence).toString(),
      gold_stars = 5,
      last_evaluated = null,
      release_date = '2023-03-01',
      review_status = 'criteria provided, single submitter',
      submissions = [],
      hgvsc = null,
      hgvsp = null,
      in_gnomad = false,
      major_consequence = null,
      pos = 123,
      transcript_id = 'transcript-1',
      variant_id = `123-${456 + sequence}-A-C`,
    } = params
    const { gnomad = null } = associations
    return {
      clinical_significance,
      clinvar_variation_id,
      gold_stars,
      last_evaluated,
      release_date,
      review_status,
      submissions,
      gnomad,
      hgvsc,
      hgvsp,
      in_gnomad,
      major_consequence,
      pos,
      transcript_id,
      variant_id,
    }
  }
)

export default clinvarVariantFactory
