const resolvers = {
  Variant: {
    rsids: (obj: any) => obj.rsids || [],
  },
  VariantDetails: {
    rsids: (obj: any) => obj.rsids || [],
  },
}
export default resolvers
