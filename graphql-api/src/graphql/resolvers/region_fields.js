const resolveGenesInRegion = (obj, args, ctx) => {
  const regionId = `${obj.chrom}-${obj.start}-${obj.stop}`
  return ctx.queryInternalAPI(`/${obj.reference_genome}/region/${regionId}/genes/`)
}

module.exports = {
  Region: {
    genes: resolveGenesInRegion,
  },
}
