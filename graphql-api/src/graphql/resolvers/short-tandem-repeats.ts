import { UserVisibleError } from '../../errors'
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

const resolveShortTandemRepeatsInGene = (obj: any, args: any, ctx: any) => {
  return fetchShortTandemRepeatsByGene(ctx.esClient, args.dataset, obj.gene_id)
}

const resolveShortTandemRepeatsInRegion = (obj: any, args: any, ctx: any) => {
  return fetchShortTandemRepeatsByRegion(ctx.esClient, args.dataset, obj)
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
