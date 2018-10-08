import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { lookupExonsByTranscriptId } from '../../types/exon'

const fetchExacVariantsByGene = async (ctx, geneId, canonicalTranscriptId) => {
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

  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'exac_v1_variants',
    type: 'variant',
    size: 10000,
    _source: [
      'AC_Adj',
      'AC_Hemi',
      'AC_Hom',
      'AN_Adj',
      'alt',
      'chrom',
      'filters',
      'flags',
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
          ],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  return hits.map(hit => {
    // eslint-disable-next-line no-underscore-dangle
    const variantData = hit._source
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
      ac: variantData.AC_Adj,
      ac_hemi: variantData.AC_Hemi,
      ac_hom: variantData.AC_Hom,
      af: variantData.AN_Adj === 0 ? 0 : variantData.AC_Adj / variantData.AN_Adj,
      an: variantData.AN_Adj,
      consequence: hit.fields.csq[0].major_consequence,
      filters: variantData.filters,
      flags: ['lc_lof', 'lof_flag'].filter(flag => variantData.flags[flag]),
      hgvs: hit.fields.csq[0].hgvs,
      hgvsc: hit.fields.csq[0].hgvsc ? hit.fields.csq[0].hgvsc.split(':')[1] : null,
      hgvsp: hit.fields.csq[0].hgvsp ? hit.fields.csq[0].hgvsp.split(':')[1] : null,
      rsid: variantData.rsid,
    }
  })
}

export default fetchExacVariantsByGene
