const { UserVisibleError } = require('../../errors')

const CHROMOSOMES = [...Array.from(new Array(22), (x, i) => `${i + 1}`), 'X', 'Y', 'M']
const CHROMOSOME_NUMBERS = CHROMOSOMES.reduce(
  (acc, chrom, i) => ({
    ...acc,
    [chrom]: i + 1,
  }),
  {}
)

const xPosition = (chrom, pos) => {
  return CHROMOSOME_NUMBERS[chrom] * 1e9 + pos
}

const validateRegion = (chrom, start, stop) => {
  if (!CHROMOSOMES.includes(chrom)) {
    throw Error(`Invalid chromosome: '${chrom}'`)
  }

  if (start < 1) {
    throw Error('Region start must be greater than 0')
  }

  // TODO: Check against actual contig length
  if (start >= 1e9) {
    throw Error('Region start must be less than 1,000,000,000')
  }

  if (stop < 1) {
    throw Error('Region stop must be greater than 0')
  }

  // TODO: Check against actual contig length
  if (stop >= 1e9) {
    throw Error('Region stop must be less than 1,000,000,000')
  }

  if (start > stop) {
    throw Error('Region stop must be greater than region start')
  }
}

const resolveRegion = (_, args) => {
  try {
    validateRegion(args.chrom, args.start, args.stop)
  } catch (e) {
    throw new UserVisibleError(e.message)
  }

  return {
    reference_genome: args.reference_genome,
    chrom: args.chrom,
    start: args.start,
    stop: args.stop,
    // xstart/xstop are not queryable, but may be used by other resolvers
    xstart: xPosition(args.chrom, args.start),
    xstop: xPosition(args.chrom, args.stop),
  }
}

module.exports = {
  Query: {
    region: resolveRegion,
  },
}
