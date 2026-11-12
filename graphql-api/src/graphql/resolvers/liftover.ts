import { isVariantId, normalizeVariantId } from '@gnomad/identifiers'

import config from '../../config'
import { UserVisibleError } from '../../errors'
import { resolveParquetOnlyStub } from '../../parquet-only-stubs'
import {
  fetchLiftoverVariantsBySource,
  fetchLiftoverVariantsByTarget,
} from '../../queries/liftover-queries'

const resolveLiftover = (_obj: any, args: any, ctx: any) => {
  if (!(args.source_variant_id || args.liftover_variant_id)) {
    throw new UserVisibleError('One of source_variant_id or liftover_variant_id is required')
  }

  if (args.source_variant_id && args.liftover_variant_id) {
    throw new UserVisibleError(
      'Only one of source_variant_id or liftover_variant_id can be provided'
    )
  }

  if (args.liftover_variant_id) {
    if (!isVariantId(args.liftover_variant_id)) {
      throw new UserVisibleError('Invalid variant ID')
    }

    if (config.PARQUET_ONLY) {
      return resolveParquetOnlyStub('Query.liftover')
    }

    return fetchLiftoverVariantsByTarget(
      ctx.esClient,
      normalizeVariantId(args.liftover_variant_id),
      args.reference_genome
    )
  }

  if (!isVariantId(args.source_variant_id)) {
    throw new UserVisibleError('Invalid variant ID')
  }

  if (config.PARQUET_ONLY) {
    return resolveParquetOnlyStub('Query.liftover')
  }

  return fetchLiftoverVariantsBySource(
    ctx.esClient,
    normalizeVariantId(args.source_variant_id),
    args.reference_genome
  )
}

const resolvers = {
  Query: {
    liftover: resolveLiftover,
  },
}

export default resolvers
