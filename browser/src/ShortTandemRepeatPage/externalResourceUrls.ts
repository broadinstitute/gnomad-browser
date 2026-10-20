export const strchiveLocusUrl = (id: string) => `https://strchive.org/loci/${id}`

export const stripyLocusUrl = (id: string) => `https://stripy.org/database/${id}`

export const trExplorerGeneUrl = (geneSymbol: string) =>
  `https://trexplorer.broadinstitute.org/#sc=isPathogenic&sd=DESC&showRs=1&searchQuery=${encodeURIComponent(
    geneSymbol
  )}&showColumns=0i1i2i3i4i7i21i17`

// Highlights the one-based interval and shows 25 bp on either side, like the variant page's UCSC link.
export const ucscBrowserUrlHighlightingRegion = (chrom: string, start: number, stop: number) =>
  `https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&highlight=hg38.chr${chrom}%3A${start}-${stop}&position=chr${chrom}%3A${
    start - 25
  }-${stop + 25}`

export const trExplorerRegionUrl = (chrom: string, start: number, stop: number) => {
  const startWithCommas = start.toLocaleString('en-US')
  const stopWithCommas = stop.toLocaleString('en-US')
  const igvLocus = `chr${chrom}:${startWithCommas}-${stopWithCommas}`
  // TRExplorer's search box shows the region with an en dash, its IGV locus uses a hyphen.
  const searchQuery = `chr${chrom}:${startWithCommas}–${stopWithCommas}`
  return `https://trexplorer.broadinstitute.org/#igvLoc=${encodeURIComponent(
    igvLocus
  )}&showRs=1&q=${encodeURIComponent(searchQuery)}&source=`
}
