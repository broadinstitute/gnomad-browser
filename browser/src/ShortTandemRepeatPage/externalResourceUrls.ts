export const strchiveLocusUrl = (id: string) => `https://strchive.org/loci/${id}`

export const stripyLocusUrl = (id: string) => `https://stripy.org/database/${id}`

export const trExplorerGeneUrl = (geneSymbol: string) =>
  `https://trexplorer.broadinstitute.org/#sc=isPathogenic&sd=DESC&showRs=1&searchQuery=${encodeURIComponent(
    geneSymbol
  )}&showColumns=0i1i2i3i4i7i21i17`
