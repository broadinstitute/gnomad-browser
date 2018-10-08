import { lookupElasticVariantsByGeneId } from '../../types/elasticVariant'
import mergeExomeAndGenomeVariants from './mergeExomeAndGenomeVariants'

const fetchGnomadVariantsByGene = async (ctx, geneId, canonicalTranscriptId) => {
  const baseLookupArgs = {
    ctx,
    elasticClient: ctx.database.elastic,
    obj: {
      gene_id: geneId,
      gene_name: geneId,
      canonical_transcript: canonicalTranscriptId,
    },
    transcriptQuery: 'undefined',
  }

  const exomeVariants = await lookupElasticVariantsByGeneId({
    ...baseLookupArgs,
    index: 'gnomad_exomes_202_37',
  })

  const genomeVariants = await lookupElasticVariantsByGeneId({
    ...baseLookupArgs,
    index: 'gnomad_genomes_202_37',
  })

  return mergeExomeAndGenomeVariants(exomeVariants, genomeVariants).map(variant => {
    const idParts = variant.variant_id.split('-')

    const flags = ['lcr', 'segdup'].filter(flag => variant[flag])
    if (variant.lof === 'LC') {
      flags.push('lc_lof')
    }

    return {
      gqlType: 'VariantSummary',
      // variant interface fields
      alt: idParts[3],
      chrom: idParts[0],
      pos: variant.pos,
      ref: idParts[2],
      variantId: variant.variant_id,
      xpos: variant.xpos,
      // other fields
      ac: variant.allele_count,
      ac_hemi: variant.hemi_count,
      ac_hom: variant.hom_count,
      an: variant.allele_num,
      af: variant.allele_num === 0 ? 0 : variant.allele_count / variant.allele_num,
      consequence: variant.consequence,
      datasets: variant.datasets,
      filters: variant.filters,
      flags,
      hgvs: variant.hgvsp || variant.hgvsc,
      hgvsc: variant.hgvsc,
      hgvsp: variant.hgvsp,
      rsid: variant.rsid,
    }
  })
}

export default fetchGnomadVariantsByGene
