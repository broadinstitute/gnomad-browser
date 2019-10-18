import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import rankedSVGeneConsequences from './rankedSVGeneConsequences'

const fetchGnomadStructuralVariantsByRegion = async (
  ctx,
  { chrom, start, stop, xstart, xstop },
  subset = 'all'
) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'gnomad_structural_variants_r2_1',
    type: 'documents',
    size: 10000,
    _source: [
      'chrom',
      'chrom2',
      'consequences',
      'end',
      'end2',
      'filters',
      `freq.${subset}.total`,
      'intergenic',
      'length',
      'pos',
      'pos2',
      'type',
      'variant_id',
    ],
    body: {
      query: {
        bool: {
          filter: [
            // Must be present in the selected subset
            { range: { [`freq.${subset}.total.ac`]: { gt: 0 } } },
            // One of chrom:pos-end or chrom2:pos2-end2 must overlap the region
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        { range: { xpos: { lte: xstop } } },
                        { range: { xend: { gte: xstart } } },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        { range: { xpos2: { lte: xstop } } },
                        { range: { xend2: { gte: xstart } } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  const variants = hits.map(hit => {
    const variant = hit._source

    let majorConsequence = rankedSVGeneConsequences.find(csq => variant.consequences[csq])
    if (!majorConsequence && variant.intergenic) {
      majorConsequence = 'intergenic'
    }

    if (!variant.freq) {
      console.log(variant)
    }

    const freq = variant.freq[subset]

    return {
      ac: freq.total.ac,
      ac_hom: variant.type === 'MCNV' ? null : freq.total.n_homalt,
      an: freq.total.an,
      af: freq.total.af,
      chrom: variant.chrom,
      chrom2: variant.chrom2,
      end: variant.end,
      end2: variant.end2,
      consequence: majorConsequence,
      filters: variant.filters,
      length: variant.length,
      pos: variant.pos,
      pos2: variant.pos2,
      reference_genome: 'GRCh37',
      type: variant.type,
      variant_id: variant.variant_id,
    }
  })

  return variants.filter(variant => {
    // Only include insertions if the start point falls within the requested region.
    if (variant.type === 'INS') {
      return variant.chrom === chrom && variant.pos >= start && variant.pos <= stop
    }

    // Only include interchromosomal variants (CTX, BND) if one of the endpoints falls within the requested region.
    // Some INS and CPX variants are also interchromosomal, but those can only be queried on their first position.
    if (variant.type === 'BND' || variant.type === 'CTX') {
      return (
        (variant.chrom === chrom && variant.pos >= start && variant.pos <= stop) ||
        (variant.chrom2 === chrom && variant.pos2 >= start && variant.pos2 <= stop)
      )
    }

    return true
  })
}

export default fetchGnomadStructuralVariantsByRegion
