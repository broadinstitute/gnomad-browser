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
      hgvsc = null,
      hgvsp = null,
      in_gnomad = false,
      major_consequence = null,
      pos = 123,
      transcript_id = 'transcript-1',
      variant_id = `123-${456 + sequence}-A-C`,
    } = params
    const {
      submissions = [
        {
          clinical_significance: 'Benign',
          conditions: [
            {
              name: 'Familial hypercholesterolemia',
              medgen_id: 'C0020445',
            },
          ],
          last_evaluated: '2016-03-01',
          review_status: 'criteria provided, single submitter',
          submitter_name:
            'Cardiovascular Research Group, Instituto Nacional de Saude Doutor Ricardo Jorge',
        },
        {
          clinical_significance: 'Benign',
          conditions: [
            {
              name: 'Hypobetalipoproteinemia',
              medgen_id: 'C0020597',
            },
          ],
          last_evaluated: '2018-01-13',
          review_status: 'criteria provided, single submitter',
          submitter_name: 'Illumina Laboratory Services, Illumina',
        },
      ],
      gnomad = null,
    } = associations
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
