import { UserVisibleError } from '../../errors'

const CHROMOSOMES = [...Array.from(new Array(22), (_x, i) => `${i + 1}`), 'X', 'Y', 'M']
const CHROMOSOME_NUMBERS = CHROMOSOMES.reduce(
  (acc, chrom, i) => ({
    ...acc,
    [chrom]: i + 1,
  }),
  {}
)

const xPosition = (chrom: any, pos: any) => {
  // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  return CHROMOSOME_NUMBERS[chrom] * 1e9 + pos
}

const validateRegion = (chrom: any, start: any, stop: any) => {
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

const resolveRegion = (_: any, args: any) => {
  try {
    validateRegion(args.chrom, args.start, args.stop)
  } catch (e) {
    // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
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

const resolvers = {
  Query: {
    region: resolveRegion,
  },
}

export default resolvers
