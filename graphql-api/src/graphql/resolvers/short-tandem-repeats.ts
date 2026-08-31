import { UserVisibleError } from '../../errors'
import logger from '../../logger'
import {
  fetchAllShortTandemRepeats,
  fetchShortTandemRepeatById,
  fetchShortTandemRepeatsByGene,
  fetchShortTandemRepeatsByRegion,
} from '../../queries/short-tandem-repeat-queries'

const resolveAllShortTandemRepeats = (_obj: any, args: any, ctx: any) => {
  return fetchAllShortTandemRepeats(ctx.esClient, args.dataset)
}

const resolveShortTandemRepeat = async (_obj: any, args: any, ctx: any) => {
  const shortTandemRepeat = await fetchShortTandemRepeatById(ctx.esClient, args.dataset, args.id)

  if (!shortTandemRepeat) {
    throw new UserVisibleError('Tandem repeat not found')
  }

  return shortTandemRepeat
}

const resolveShortTandemRepeatsInGene = async (obj: any, args: any, ctx: any) => {
  try {
    return await fetchShortTandemRepeatsByGene(ctx.esClient, args.dataset, obj.gene_id)
  } catch (error) {
    if (error instanceof UserVisibleError) {
      throw error
    }
    logger.warn({
      message: `Unable to fetch short tandem repeats for gene "${obj.gene_id}"`,
      error,
    })
    return null
  }
}

const resolveShortTandemRepeatsInRegion = async (obj: any, args: any, ctx: any) => {
  try {
    return await fetchShortTandemRepeatsByRegion(ctx.esClient, args.dataset, obj)
  } catch (error) {
    if (error instanceof UserVisibleError) {
      throw error
    }
    logger.warn({
      message: `Unable to fetch short tandem repeats for region "${obj.chrom}-${obj.start}-${obj.stop}"`,
      error,
    })
    return null
  }
}

const resolvers = {
  Query: {
    short_tandem_repeat: resolveShortTandemRepeat,
    short_tandem_repeats: resolveAllShortTandemRepeats,
  },
  Gene: {
    short_tandem_repeats: resolveShortTandemRepeatsInGene,
  },
  Region: {
    short_tandem_repeats: resolveShortTandemRepeatsInRegion,
  },
}
export default resolvers
