import { UserVisibleError } from '../../errors'
import {
  fetchExomeAlleleNumberForRegion,
  fetchGenomeAlleleNumberForRegion,
  fetchAlleleNumberForGene,
  fetchAlleleNumberForTranscript,
} from '../../queries/allele-number-queries'

// The same limit the coverage resolver applies. Allele number is indexed one
// document per base, so an unbounded region would ask Elasticsearch to
// aggregate over most of a chromosome.
const MAX_REGION_SIZE = 2.5e6

const resolvers = {
  Region: {
    allele_number: (obj: any, args: any) => {
      if (obj.stop - obj.start >= MAX_REGION_SIZE) {
        throw new UserVisibleError('Allele number is not available for a region this large')
      }

      // Forward region and dataset argument to exome/genome allele number resolvers.
      return { ...obj, dataset: args.dataset }
    },
  },
  RegionAlleleNumber: {
    exome: (obj: any, _args: any, ctx: any) =>
      fetchExomeAlleleNumberForRegion(ctx.esClient, obj.dataset, obj),
    genome: (obj: any, _args: any, ctx: any) =>
      fetchGenomeAlleleNumberForRegion(ctx.esClient, obj.dataset, obj),
  },
  Gene: {
    allele_number: (obj: any, args: any, ctx: any) =>
      fetchAlleleNumberForGene(ctx.esClient, args.dataset, obj),
  },
  Transcript: {
    allele_number: (obj: any, args: any, ctx: any) =>
      fetchAlleleNumberForTranscript(ctx.esClient, args.dataset, obj),
  },
}

export default resolvers
