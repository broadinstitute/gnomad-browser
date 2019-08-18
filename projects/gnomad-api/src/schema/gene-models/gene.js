import { mergeOverlappingRegions } from '../../utilities/region'
import { UserVisibleError } from '../errors'

export const fetchExonsByGeneId = async (ctx, geneId) => {
  const allExons = await ctx.database.gnomad
    .collection('exons')
    .find({ gene_id: geneId })
    .toArray()
  const sortedExons = allExons.sort((r1, r2) => r1.start - r2.start)

  const cdsExons = allExons.filter(exon => exon.feature_type === 'CDS')
  const utrExons = allExons.filter(exon => exon.feature_type === 'UTR')

  const cdsCompositeExons = mergeOverlappingRegions(cdsExons)
  const utrCompositeExons = mergeOverlappingRegions(utrExons)

  /**
   * There are 3 feature types in the exons collection: "CDS", "UTR", and "exon".
   * There are "exon" regions that cover the "CDS" and "UTR" regions and also
   * some (non-coding) transcripts that contain only "exon" regions.
   * This filters the "exon" regions to only those that are in non-coding transcripts.
   *
   * This makes the UI for selecting visible regions easier, since it can filter
   * on "CDS" or "UTR" feature type without having to also filter out the "exon" regions
   * that duplicate the "CDS" and "UTR" regions.
   */
  const codingTranscripts = new Set(
    allExons
      .filter(exon => exon.feature_type === 'CDS' || exon.feature_type === 'UTR')
      .map(exon => exon.transcript_id)
  )

  const nonCodingTranscriptExons = sortedExons.filter(
    exon => !codingTranscripts.has(exon.transcript_id)
  )

  const nonCodingTranscriptCompositeExons = mergeOverlappingRegions(nonCodingTranscriptExons)

  return [...cdsCompositeExons, ...utrCompositeExons, ...nonCodingTranscriptCompositeExons]
}

export const fetchGeneById = async (ctx, geneId) => {
  const [gene, exons] = await Promise.all([
    ctx.database.gnomad.collection('genes').findOne({ gene_id: geneId }),
    fetchExonsByGeneId(ctx, geneId),
  ])

  if (!gene) {
    throw new UserVisibleError('Gene not found')
  }

  return { ...gene, exons }
}

export const fetchGeneByName = async (ctx, geneName) => {
  const gene = await ctx.database.gnomad
    .collection('genes')
    .findOne({ gene_name_upper: geneName.toUpperCase() })

  if (!gene) {
    throw new UserVisibleError('Gene not found')
  }

  const exons = await fetchExonsByGeneId(ctx, gene.gene_id)
  return { ...gene, exons }
}

export const fetchGenesByRegion = async (ctx, { xstart, xstop }) => {
  const genes = await ctx.database.gnomad
    .collection('genes')
    .find({ $and: [{ xstart: { $lte: xstop } }, { xstop: { $gte: xstart } }] })
    .toArray()

  return Promise.all(
    genes.map(async gene => {
      const exons = await fetchExonsByGeneId(ctx, gene.gene_id)
      return { ...gene, exons }
    })
  )
}
