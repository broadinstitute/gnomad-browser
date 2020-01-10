import { flatMap } from 'lodash'

import { UserVisibleError } from '../../errors'
import { formatHistogram } from '../shared/histogram'

const fetchGnomadStructuralVariantDetails = async (ctx, variantId, subset = 'all') => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'gnomad_structural_variants_r2_1',
      type: 'documents',
      id: variantId,
    })

    const variant = response._source

    const freq = variant.freq[subset]

    // Though a record exists for the variant, the variant may not be present in the selected subset.
    if (!freq) {
      throw new UserVisibleError('Variant not found')
    }

    return {
      age_distribution:
        // Data not available for MCNVs
        variant.type === 'MCNV'
          ? null
          : {
              het: formatHistogram(variant.age_hist_het),
              hom: formatHistogram(variant.age_hist_hom),
            },
      algorithms: variant.algorithms,
      alts: variant.alts,
      ac: freq.total.ac,
      ac_hom: variant.type === 'MCNV' ? null : freq.total.n_homalt,
      an: freq.total.an,
      chrom: variant.chrom,
      chrom2: variant.chrom2,
      consequences:
        Object.keys(variant.consequences)
          .filter(csq => variant.consequences[csq])
          .map(csq => ({
            consequence: csq,
            genes: variant.consequences[csq],
          })) || [],
      copy_numbers:
        variant.type === 'MCNV'
          ? variant.alts.map((alt, i) => ({
              // Extract copy number. Example, get 2 from "CN=<2>"
              copy_number: parseInt(alt.slice(4, alt.length - 1), 10),
              ac: freq.total.mcnv.ac[i],
            }))
          : null,
      cpx_intervals: variant.cpx_intervals,
      cpx_type: variant.cpx_type,
      end: variant.end,
      end2: variant.end2,
      evidence: variant.evidence,
      filters: variant.filters,
      genes: variant.genes || [],
      genotype_quality:
        // Data not available for MCNVs
        variant.type === 'MCNV'
          ? null
          : {
              all: formatHistogram(variant.gq_hist_all),
              alt: formatHistogram(variant.gq_hist_alt),
            },
      length: variant.length,
      populations: [
        ...flatMap(['afr', 'amr', 'eas', 'eur', 'oth'], popId => [
          {
            id: popId.toUpperCase(),
            ac: freq[popId].ac || 0,
            an: freq[popId].an || 0,
            ac_hemi:
              variant.type === 'MCNV' ? null : (!variant.par && freq[popId].male.n_hemialt) || 0,
            ac_hom: variant.type === 'MCNV' ? null : freq[popId].n_homalt || 0,
          },
          {
            id: `${popId.toUpperCase()}_FEMALE`,
            ac: freq[popId].female.ac || 0,
            an: freq[popId].female.an || 0,
            ac_hemi: variant.type === 'MCNV' ? null : 0,
            ac_hom: variant.type === 'MCNV' ? null : freq[popId].female.n_homalt || 0,
          },
          {
            id: `${popId.toUpperCase()}_MALE`,
            ac: freq[popId].male.ac || 0,
            an: freq[popId].male.an || 0,
            ac_hemi:
              variant.type === 'MCNV' ? null : (!variant.par && freq[popId].male.n_hemialt) || 0,
            ac_hom: variant.type === 'MCNV' ? null : freq[popId].male.n_homalt || 0,
          },
        ]),
        {
          id: 'FEMALE',
          ac: freq.total.female.ac || 0,
          an: freq.total.female.an || 0,
          ac_hemi: variant.type === 'MCNV' ? null : 0,
          ac_hom: variant.type === 'MCNV' ? null : freq.total.female.n_homalt || 0,
        },
        {
          id: 'MALE',
          ac: freq.total.male.ac || 0,
          an: freq.total.male.an || 0,
          ac_hemi:
            variant.type === 'MCNV' ? null : (!variant.par && freq.total.male.n_hemialt) || 0,
          ac_hom: variant.type === 'MCNV' ? null : freq.total.male.n_homalt || 0,
        },
      ],
      pos: variant.pos,
      pos2: variant.pos2,
      reference_genome: 'GRCh37',
      qual: variant.qual,
      type: variant.type,
      variant_id: variant.variant_id,
    }
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError('Variant not found')
    }
    throw err
  }
}

export default fetchGnomadStructuralVariantDetails
