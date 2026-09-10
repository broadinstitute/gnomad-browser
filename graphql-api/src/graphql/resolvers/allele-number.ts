import { UserVisibleError } from '../../errors'
import {
  fetchExomeAlleleNumberForRegion,
  fetchGenomeAlleleNumberForRegion,
  fetchAlleleNumberForGene,
  fetchAlleleNumberForTranscript,
} from '../../queries/allele-number-queries'

const resolveExomeAlleleNumberInRegion = (obj: any, _args: any, ctx: any) =>
  fetchExomeAlleleNumberForRegion(ctx.esClient, obj.dataset, obj)

const resolveGenomeAlleleNumberInRegion = (obj: any, _args: any, ctx: any) =>
  fetchGenomeAlleleNumberForRegion(ctx.esClient, obj.dataset, obj)

const resolveAlleleNumberInGene = (obj: any, args: any, ctx: any) =>
  fetchAlleleNumberForGene(ctx.esClient, args.dataset, obj)

const resolveAlleleNumberInTranscript = (obj: any, args: any, ctx: any) =>
  fetchAlleleNumberForTranscript(ctx.esClient, args.dataset, obj)

const resolvers = {
  Region: {
    allele_number: (obj: any, args: any) => {
      if (obj.stop - obj.start >= 2.5e6) {
        throw new UserVisibleError('Allele number is not available for a region this large')
      }

      // Forward region and dataset argument to exome/genome allele number resolvers.
      return { ...obj, dataset: args.dataset }
    },
  },
  RegionAlleleNumber: {
    exome: resolveExomeAlleleNumberInRegion,
    genome: resolveGenomeAlleleNumberInRegion,
  },
  Gene: {
    allele_number: resolveAlleleNumberInGene,
  },
  Transcript: {
    allele_number: resolveAlleleNumberInTranscript,
  },
}

export default resolvers
