import { resolveVAExome, resolveVAGenome, resolveVAAllele } from './va'

const resolvers = {
  Variant: {
    rsids: (obj: any) => obj.rsids || [],
    va: (obj: any, ctx: any, args: any) => ({
      exome: resolveVAExome(obj, ctx, args),
      genome: resolveVAGenome(obj, ctx, args),
    }),
    vrs: resolveVAAllele,
  },
  VariantDetails: {
    rsids: (obj: any) => obj.rsids || [],
    va: (obj: any, ctx: any, args: any) => ({
      exome: resolveVAExome(obj, ctx, args),
      genome: resolveVAGenome(obj, ctx, args),
    }),
    vrs: resolveVAAllele,
  },
}
export default resolvers
