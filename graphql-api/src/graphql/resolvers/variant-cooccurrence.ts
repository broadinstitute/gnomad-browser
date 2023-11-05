import { fetchVariantCooccurrence } from '../../queries/variant-cooccurrence-queries'

const resolveVariantCooccurrence = (_: any, args: any, ctx: any) => {
  return fetchVariantCooccurrence(ctx.esClient, args.dataset, args.variants)
}

// Reorder haplotype counts to AB, Ab, aB, ab so that they are more consistent with the order of genotype counts
// See https://github.com/hail-is/hail/pull/10533
const resolveHaplotypeCounts = (obj: any) => {
  return obj.haplotype_counts
    ? [
        obj.haplotype_counts[0],
        obj.haplotype_counts[2],
        obj.haplotype_counts[1],
        obj.haplotype_counts[3],
      ]
    : null
}

const resolvers = {
  Query: {
    variant_cooccurrence: resolveVariantCooccurrence,
  },
  VariantCooccurrenceInPopulation: {
    haplotype_counts: resolveHaplotypeCounts,
  },
  VariantCooccurrence: {
    haplotype_counts: resolveHaplotypeCounts,
  },
}
export default resolvers
