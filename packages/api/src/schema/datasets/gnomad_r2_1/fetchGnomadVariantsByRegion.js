import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { getXpos } from '../../../utilities/variant'
import {
  annotateVariantsWithMNVFlag,
  fetchGnomadMNVsByIntervals,
} from './gnomadMultiNucleotideVariants'
import mergeExomeAndGenomeVariantSummaries from './mergeExomeAndGenomeVariantSummaries'
import POPULATIONS from './populations'

const fetchGnomadVariantsByRegion = async (ctx, { chrom, start, stop }, subset) => {
  const requests = [
    { index: 'gnomad_exomes_2_1', subset },
    // All genome samples are non_cancer, so separate non-cancer numbers are not stored
    { index: 'gnomad_genomes_2_1', subset: subset === 'non_cancer' ? 'gnomad' : subset },
  ]

  const [exomeVariants, genomeVariants] = await Promise.all(
    requests.map(async ({ index, subset }) => {
      const hits = await fetchAllSearchResults(ctx.database.elastic, {
        index,
        type: 'variant',
        size: 10000,
        _source: [
          `${subset}.AC_adj`,
          `${subset}.AN_adj`,
          `${subset}.nhomalt_adj`,
          'alt',
          'chrom',
          'filters',
          'flags',
          'nonpar',
          'pos',
          'ref',
          'rsid',
          'variant_id',
          'xpos',
        ],
        body: {
          script_fields: {
            csq: {
              script: {
                lang: 'painless',
                inline: 'params._source.sortedTranscriptConsequences?.get(0)',
              },
            },
          },
          query: {
            bool: {
              filter: [
                { term: { chrom } },
                {
                  range: {
                    pos: {
                      gte: start,
                      lte: stop,
                    },
                  },
                },
                { range: { [`${subset}.AC_raw`]: { gt: 0 } } },
              ],
            },
          },
          sort: [{ pos: { order: 'asc' } }],
        },
      })

      return hits.map(hit => {
        // eslint-disable-next-line no-underscore-dangle
        const variantData = hit._source

        // eslint-disable-next-line no-underscore-dangle
        const isExomeVariant = hit._index === 'gnomad_exomes_2_1'
        const filterPrefix = isExomeVariant ? 'exomes' : 'genomes'
        const dataset = isExomeVariant ? 'gnomadExomeVariants' : 'gnomadGenomeVariants'

        const ac = variantData[subset].AC_adj.total
        const an = variantData[subset].AN_adj.total

        const csq = hit.fields.csq[0] || {}

        return {
          gqlType: 'VariantSummary',
          // variant interface fields
          alt: variantData.alt,
          chrom: variantData.chrom,
          pos: variantData.pos,
          ref: variantData.ref,
          variantId: variantData.variant_id,
          xpos: variantData.xpos,
          // other fields
          ac,
          ac_hemi: variantData.nonpar ? variantData[subset].AC_adj.male : 0,
          ac_hom: variantData[subset].nhomalt_adj.total,
          an,
          af: an ? ac / an : 0,
          consequence: csq.major_consequence,
          datasets: [dataset],
          filters: (variantData.filters || []).map(f => `${filterPrefix}_${f}`),
          flags: ['lcr', 'segdup', 'lc_lof', 'lof_flag'].filter(flag => variantData.flags[flag]),
          hgvs: csq.hgvs,
          hgvsc: csq.hgvsc ? csq.hgvsc.split(':')[1] : null,
          hgvsp: csq.hgvsp ? csq.hgvsp.split(':')[1] : null,
          populations: POPULATIONS.map(popId => ({
            id: popId.toUpperCase(),
            ac: (variantData[subset].AC_adj[popId] || {}).total || 0,
            an: (variantData[subset].AN_adj[popId] || {}).total || 0,
            ac_hemi: variantData.nonpar ? (variantData[subset].AC_adj[popId] || {}).male || 0 : 0,
            ac_hom: (variantData[subset].nhomalt_adj[popId] || {}).total || 0,
          })),
          rsid: variantData.rsid,
        }
      })
    })
  )

  const combinedVariants = mergeExomeAndGenomeVariantSummaries(exomeVariants, genomeVariants)

  // TODO: This can be fetched in parallel with exome/genome data
  const mnvs = await fetchGnomadMNVsByIntervals(ctx, [
    { xstart: getXpos(chrom, start), xstop: getXpos(chrom, stop) },
  ])
  annotateVariantsWithMNVFlag(combinedVariants, mnvs)

  return combinedVariants
}

export default fetchGnomadVariantsByRegion
