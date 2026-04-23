import { isRsId } from '@gnomad/identifiers'
import { UserVisibleError } from '../../errors'
import { fetchVariantById, fetchVariantsByGene } from '../../queries/long_read_variants'

const addHgvs = (hit: any) => ({
  ...hit,
  transcript_consequences:
    hit.transcript_consequences &&
    hit.transcript_consequences.map((transcript_consequence: any) => ({
      ...transcript_consequence,
      hgvs: transcript_consequence.hgvsp || transcript_consequence.hgvsc,
    })),
})

const resolveVariant = async (_obj: any, args: any, ctx: any) => {
  const { rsid, variantId } = args
  if ((rsid && variantId) || (!rsid && !variantId)) {
    throw new UserVisibleError('Exactly one of "rsid" or "variantId" is required')
  }

  let normalizedVariantId

  if (variantId) {
    normalizedVariantId = variantId
  }

  if (rsid) {
    if (!isRsId(rsid)) {
      throw new UserVisibleError('Invalid rsID')
    }

    normalizedVariantId = args.rsid.toLowerCase()
  }

  const rawResult = await fetchVariantById(ctx.esClient, normalizedVariantId)
  if (!rawResult) {
    return rawResult
  }

  return addHgvs(rawResult)
}

const resolveVariantsInGene = async (obj: any, _args: any, ctx: any) => {
  const hits = await fetchVariantsByGene(ctx.esClient, obj)
  return hits.map((hit: any) => hit._source.value).map(addHgvs)
}

const resolvers = {
  Query: {
    long_read_variant: resolveVariant,
  },
  Gene: {
    long_read_variants: resolveVariantsInGene,
  },
}

export default resolvers
