import { normalizeVariantId } from '@gnomad/identifiers'

const resolveVAQuery = async (_obj: any, args: any, _ctx: any) => {
  const vrsApiUrl = process.env['VRS_API_URL']
  const variantId = normalizeVariantId(args.variantId)
  const url = `${vrsApiUrl}/${variantId}`
  const response = await fetch(url).catch((error: any) => {
    throw error
  })
  const responseData = await response.json()
  const va = responseData.map((result: any) => result['gks_va_freq'])
  const vrs = responseData.map((result: any) => result['gks_vrs_variant'])
  return { va, vrs }
}

const resolveTypeFromTypeField = (obj: any) => {
  return `VA${obj.type}`
}

const resolveTypeFromTypeFieldWithFallback = (obj: any, fallback: string | null = null) => {
  if (obj.type) {
    return `VA${obj.type}`
  }
  return fallback
}

const resolvers = {
  Query: {
    va: resolveVAQuery,
  },
  VANumberlike: { __resolveType: resolveTypeFromTypeField },
  VAAlleleLocation: {
    __resolveType: (obj: any) => resolveTypeFromTypeFieldWithFallback(obj, 'VACURIE'),
  },
  VAFocusAllele: {
    __resolveType: (obj: any) => resolveTypeFromTypeFieldWithFallback(obj, 'VAFocusAlleleURI'),
  },
  VACURIE: {
    value: (obj: any) => obj,
  },
  VAFocusAlleleURI: {
    value: (obj: any) => obj,
  },
  VASequenceInterval: {
    // Workaround for bug in some upstream API versions that omit this type in SequenceIntervals
    type: (obj: any) => obj.type || 'SequenceInterval',
  },
}

export default resolvers
