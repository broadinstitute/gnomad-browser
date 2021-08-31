const { UserVisibleError } = require('../../errors')
const {
  fetchAllShortTandemRepeats,
  fetchShortTandemRepeatById,
  fetchShortTandemRepeatsByGene,
  fetchShortTandemRepeatsByRegion,
} = require('../../queries/short-tandem-repeat-queries')

const resolveAllShortTandemRepeats = (obj, args, ctx) => {
  return fetchAllShortTandemRepeats(ctx.esClient, args.dataset)
}

const resolveShortTandemRepeat = async (obj, args, ctx) => {
  const shortTandemRepeat = await fetchShortTandemRepeatById(ctx.esClient, args.dataset, args.id)

  if (!shortTandemRepeat) {
    throw new UserVisibleError('Short tandem repeat not found')
  }

  return shortTandemRepeat
}

const resolveShortTandemRepeatsInGene = (obj, args, ctx) => {
  return fetchShortTandemRepeatsByGene(ctx.esClient, args.dataset, obj.gene_id)
}

const resolveShortTandemRepeatsInRegion = (obj, args, ctx) => {
  return fetchShortTandemRepeatsByRegion(ctx.esClient, args.dataset, obj)
}

module.exports = {
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
