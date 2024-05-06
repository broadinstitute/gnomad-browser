import { normalizeVariantId } from '@gnomad/identifiers'
import { fetchVariantById } from '../../queries/variant-queries'
import { vaShaper } from '../../queries/helpers/va-shaper'

const resolveVAQuery = async (_obj: any, args: any, _ctx: any) => {
  const variantId = normalizeVariantId(args.variantId)
  const elasticResponse = await fetchVariantById(_ctx.esClient, 'gnomad_r4', variantId)
  const shapedEsResponse = vaShaper(elasticResponse)

  console.log(shapedEsResponse)
  return {
    va: [shapedEsResponse.va],
    vrs: [shapedEsResponse.vrs],
  }
}

const resolveTypeFromTypeField = (obj: any) => {
  return `VA${obj.type}`
}

const resolvers = {
  Query: {
    va: resolveVAQuery,
  },
  VANumberlike: { __resolveType: resolveTypeFromTypeField },
  VASequenceInterval: {
    // Workaround for bug in some upstream API versions that omit this type in SequenceIntervals
    type: (obj: any) => obj.type || 'SequenceInterval',
  },
}

export default resolvers
