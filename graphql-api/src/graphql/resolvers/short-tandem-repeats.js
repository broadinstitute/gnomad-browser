const { UserVisibleError } = require('../../errors')
const { fetchShortTandemRepeatById } = require('../../queries/short-tandem-repeat-queries')

const resolveShortTandemRepeat = async (obj, args, ctx) => {
  const shortTandemRepeat = await fetchShortTandemRepeatById(ctx.esClient, args.dataset, args.id)

  if (!shortTandemRepeat) {
    throw new UserVisibleError('Short tandem repeat not found')
  }

  return shortTandemRepeat
}

module.exports = {
  Query: {
    short_tandem_repeat: resolveShortTandemRepeat,
  },
}
