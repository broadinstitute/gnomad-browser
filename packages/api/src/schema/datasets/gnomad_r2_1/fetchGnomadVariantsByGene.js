import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { lookupExonsByTranscriptId } from '../../types/exon'
import mergeExomeAndGenomeVariantSummaries from './mergeExomeAndGenomeVariantSummaries'

const fetchGnomadVariantsByGene = async (ctx, geneId, canonicalTranscriptId, subset) => {
  const geneExons = await lookupExonsByTranscriptId(ctx.database.gnomad, canonicalTranscriptId)
  const filteredRegions = geneExons.filter(exon => exon.feature_type === 'CDS')
  const padding = 75
  const rangeQueries = filteredRegions.map(region => ({
    range: {
      pos: {
        gte: region.start - padding,
        lte: region.stop + padding,
      },
    },
  }))

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
          `${subset}.AC_adj.total`,
          `${subset}.AC_adj.male`,
          `${subset}.AN_adj.total`,
          `${subset}.nhomalt_adj.total`,
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
                inline:
                  'params._source.sortedTranscriptConsequences.find(c -> c.gene_id == params.geneId)',
                params: {
                  geneId,
                },
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  nested: {
                    path: 'sortedTranscriptConsequences',
                    query: {
                      term: { 'sortedTranscriptConsequences.gene_id': geneId },
                    },
                  },
                },
                { bool: { should: rangeQueries } },
                { range: { [`${subset}.AC_adj.total`]: { gt: 0 } } },
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
          consequence: hit.fields.csq[0].major_consequence,
          datasets: [dataset],
          filters: (variantData.filters || []).map(f => `${filterPrefix}_${f}`),
          flags: ['lcr', 'segdup', 'lc_lof', 'lof_flag'].filter(flag => variantData.flags[flag]),
          hgvs: hit.fields.csq[0].hgvs,
          hgvsc: hit.fields.csq[0].hgvsc ? hit.fields.csq[0].hgvsc.split(':')[1] : null,
          hgvsp: hit.fields.csq[0].hgvsp ? hit.fields.csq[0].hgvsp.split(':')[1] : null,
          rsid: variantData.rsid,
        }
      })
    })
  )

  return mergeExomeAndGenomeVariantSummaries(exomeVariants, genomeVariants)
}

export default fetchGnomadVariantsByGene
