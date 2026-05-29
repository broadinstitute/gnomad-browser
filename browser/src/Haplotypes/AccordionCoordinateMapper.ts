import type { LRVariant } from './index'

export type PhantomLocus = {
  genomicPos: number
  visualPos: number
  maxPhantomLength: number
  cumulativeOffset: number
  isTruncated: boolean
}

/**
 * Bidirectional mapper between genomic coordinates and a synthetic visual
 * coordinate space that includes "phantom regions" — gaps injected at
 * insertion/TR loci to visually represent added sequence length.
 *
 * The synthetic space is anchored at viewRegion.start (i.e. genomic pos
 * viewRegion.start maps to synthetic coordinate viewRegion.start). Phantom
 * gaps add cumulative offsets so that downstream genomic positions shift right.
 */
export class AccordionCoordinateMapper {
  private loci: PhantomLocus[]
  public readonly totalVisualLength: number
  private readonly viewStart: number
  private readonly viewStop: number

  constructor(
    viewRegion: { start: number; stop: number },
    unfilteredVariants: LRVariant[],
    showPhantomRegions: boolean
  ) {
    this.viewStart = viewRegion.start
    this.viewStop = viewRegion.stop
    const regionSize = viewRegion.stop - viewRegion.start
    const maxCap = regionSize * 0.15

    // Filter for insertion/TR variants with abs(allele_length) >= 50
    // Note: summary variants from GraphQL use "length", haplotype variants use "allele_length"
    const ACCORDION_ALLELE_TYPES = new Set(['ins', 'alu_ins', 'sva_ins', 'numt', 'trv'])
    const getLen = (v: any): number => Math.abs(v.allele_length ?? v.length ?? 0)
    const candidates = unfilteredVariants.filter((v) => {
      const aType = (v.allele_type || '').toLowerCase()
      return ACCORDION_ALLELE_TYPES.has(aType) && getLen(v) >= 50
    })

    // Sort by position
    const sorted = [...candidates].sort((a, b) => a.pos - b.pos)

    // Cluster breakpoints within <= 2bp
    const clusters: { genomicPos: number; maxLength: number }[] = []
    for (const v of sorted) {
      const len = getLen(v)
      if (
        clusters.length > 0 &&
        Math.abs(v.pos - clusters[clusters.length - 1].genomicPos) <= 2
      ) {
        const last = clusters[clusters.length - 1]
        last.maxLength = Math.max(last.maxLength, len)
      } else {
        clusters.push({ genomicPos: v.pos, maxLength: len })
      }
    }

    // Build loci with cumulative offsets
    let cumulativeOffset = 0
    this.loci = clusters.map((c) => {
      let phantomLength = showPhantomRegions ? c.maxLength : 0
      let isTruncated = false
      if (phantomLength > maxCap) {
        phantomLength = maxCap
        isTruncated = true
      }
      const locus: PhantomLocus = {
        genomicPos: c.genomicPos,
        visualPos: c.genomicPos + cumulativeOffset,
        maxPhantomLength: phantomLength,
        cumulativeOffset,
        isTruncated,
      }
      cumulativeOffset += phantomLength
      return locus
    })

    this.totalVisualLength = regionSize + cumulativeOffset
  }

  /**
   * Map a genomic position (+ optional phantom offset) to synthetic coordinate space.
   * O(log K) via binary search where K = number of phantom loci.
   */
  getSyntheticCoordinate(genomicPos: number, phantomOffset: number = 0): number {
    const loci = this.loci
    if (loci.length === 0) return genomicPos

    // Binary search: find last locus where genomicPos >= locus.genomicPos
    let lo = 0
    let hi = loci.length - 1
    let idx = -1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (loci[mid].genomicPos <= genomicPos) {
        idx = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }

    if (idx === -1) {
      // Before all loci — no offset
      return genomicPos
    }

    const locus = loci[idx]
    if (genomicPos === locus.genomicPos) {
      // Exactly at a breakpoint — apply phantom offset
      return locus.visualPos + phantomOffset
    }

    // Past this locus — shift by cumulative offset (including this locus's phantom length)
    return genomicPos + locus.cumulativeOffset + locus.maxPhantomLength
  }

  /**
   * Map a visual/synthetic coordinate back to genomic space.
   * If the visual position falls inside a phantom gap, snap to the breakpoint's genomicPos.
   */
  visualToGenomic(visualPos: number): number {
    const loci = this.loci
    if (loci.length === 0) return visualPos

    // Binary search on visualPos ranges
    for (let i = loci.length - 1; i >= 0; i--) {
      const locus = loci[i]
      const phantomStart = locus.visualPos
      const phantomEnd = locus.visualPos + locus.maxPhantomLength

      if (visualPos >= phantomStart && visualPos < phantomEnd) {
        // Inside phantom gap — snap to breakpoint
        return locus.genomicPos
      }
      if (visualPos >= phantomEnd) {
        // Past this locus's phantom region
        return visualPos - locus.cumulativeOffset - locus.maxPhantomLength
      }
    }

    // Before all loci
    return visualPos
  }

  /** Return all phantom loci for rendering backgrounds/markers. */
  getPhantomLoci(): readonly PhantomLocus[] {
    return this.loci
  }

  /** Whether any phantom loci exist. */
  get hasPhantomRegions(): boolean {
    return this.loci.length > 0 && this.loci.some((l) => l.maxPhantomLength > 0)
  }
}
