import { Factory } from 'fishery'
import { MitochondrialVariant } from '../MitochondrialVariantPage/MitochondrialVariantPage'
import { defaultHistogram } from './Variant'

const mitochondrialVariantFactory = Factory.define<MitochondrialVariant>(
  ({ params, associations }) => {
    const {
      alt = 'C',
      an = 0,
      ac_hom = 0,
      ac_het = 0,
      ac_hom_mnv = 0,
      excluded_ac = null,
      flags = null,
      haplogroup_defining = null,
      haplogroups = [],
      max_heteroplasmy = 0.1,
      populations = [],
      pos = 123,
      ref = 'A',
      rsids = null,
      mitotip_trna_prediction = null,
      pon_mt_trna_prediction = null,
      mitotip_score = null,
      pon_ml_probability_of_pathogenicity = null,
    } = params

    const {
      clinvar = null,
      site_quality_metrics = [{ name: 'Mean Depth', value: 0 }],
      genotype_quality_filters = [
        { name: 'Dummy Genotype Quality Filter', filtered: defaultHistogram },
      ],
      genotype_quality_metrics = [{ name: 'Depth', alt: defaultHistogram, all: defaultHistogram }],
      transcript_consequences = [],
      age_distribution = { het: defaultHistogram, hom: defaultHistogram },
      heteroplasmy_distribution = defaultHistogram,
      filters = [],
    } = associations

    return {
      alt,
      an,
      ac_hom,
      ac_hom_mnv,
      age_distribution,
      ac_het,
      excluded_ac,
      flags,
      haplogroup_defining,
      haplogroups,
      max_heteroplasmy,
      populations,
      pos,
      ref,
      reference_genome: 'GRCh38',
      variant_id: `M-${pos}-${ref}-${alt}`,
      rsids,
      clinvar,
      site_quality_metrics,
      genotype_quality_filters,
      genotype_quality_metrics,
      transcript_consequences,
      heteroplasmy_distribution,
      filters,
      mitotip_trna_prediction,
      pon_mt_trna_prediction,
      mitotip_score,
      pon_ml_probability_of_pathogenicity,
    }
  }
)

export default mitochondrialVariantFactory
