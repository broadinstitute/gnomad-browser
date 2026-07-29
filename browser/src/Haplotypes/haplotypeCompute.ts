/**
 * Client-side haplotype computation: grouping, UPGMA tree, cluster cutting, sorting.
 * Ported from graphql-api/src/queries/genealogy-math.ts and haplotype-grouping.ts
 * to enable zero-latency slider interactions.
 */

import type {
  LRVariant,
  HaplotypeCarrierIdentity,
  HaplotypeGroup,
  HaplotypeCluster,
} from './index'

// ---- Diplotype types ----

type DiplotypeVariantSet = {
  variants: LRVariant[]
  readable_id: string
}

export type DiplotypeSample = {
  sample_id: string
  // Actual one-based VCF GT positions, not canonical diplotype slots.
  strand_mapping: { strandA: number | null; strandB: number | null }
  phase_set_mapping: { phaseSetA: string | null; phaseSetB: string | null }
}

export type DiplotypeGroup = {
  is_diplotype: true
  samples: DiplotypeSample[]
  haplotypeA: DiplotypeVariantSet
  haplotypeB: DiplotypeVariantSet
  below_thresholdA: DiplotypeVariantSet
  below_thresholdB: DiplotypeVariantSet
  start: number
  stop: number
  hash: number
  roh_fraction: number
  is_roh: boolean
  compound_het_pairs: { variantA: LRVariant; variantB: LRVariant }[]
  is_compound_het: boolean
}

// ---- Types ----

export type TreeNode = {
  left: TreeNode | null
  right: TreeNode | null
  distance: number
  groupHash: string | null
  size: number
}

// ---- Struct-of-Arrays (SoA) format for compact payloads ----

export type SoAVariants = {
  variant_id: string[]
  chrom: string[]
  pos: number[]
  end: (number | null)[]
  ref: string[]
  alt: string[]
  allele_type: string[]
  allele_length: number[]
  freq_af: number[]
  freq_ac: number[]
  freq_an: number[]
  rsid: string[]
  cadd_phred: (number | null)[]
  phylop: (number | null)[]
  sv_consequences: (string[] | null)[]
  dbsnp_id: (string | null)[]
  tr_id: (string | null)[]
  tr_motifs: (string | null)[]
  gnomad_str: (string | null)[]
  allele_methylation: (number | null)[]
  motif_counts: (number[] | null)[]
  allele_purity: (number | null)[]
  populations: Array<{ id: string; af: number }>[]
}

export function rehydrateVariants(soa: SoAVariants): LRVariant[] {
  const n = soa.variant_id.length
  const variants: LRVariant[] = new Array(n)
  for (let i = 0; i < n; i++) {
    variants[i] = {
      variant_id: soa.variant_id[i],
      chrom: soa.chrom[i],
      pos: soa.pos[i],
      end: soa.end[i],
      ref: soa.ref[i],
      alt: soa.alt[i],
      allele_type: soa.allele_type[i],
      allele_length: soa.allele_length[i],
      freq: {
        af: soa.freq_af[i],
        ac: soa.freq_ac[i],
        an: soa.freq_an[i],
      },
      populations: soa.populations[i],
      rsid: soa.rsid[i],
      cadd_phred: soa.cadd_phred[i],
      phylop: soa.phylop[i],
      sv_consequences: soa.sv_consequences[i],
      dbsnp_id: soa.dbsnp_id[i],
      tr_id: soa.tr_id[i],
      tr_motifs: soa.tr_motifs[i],
      gnomad_str: soa.gnomad_str[i],
      allele_methylation: soa.allele_methylation[i],
      motif_counts: soa.motif_counts[i],
      allele_purity: soa.allele_purity[i],
    }
  }
  return variants
}

export type PhaseSetByVariant = Readonly<{
  variant_index: number
  phase_set: string | null
}>

export type StructuredCarrier = HaplotypeCarrierIdentity & {
  variant_indices: number[]
  phase_sets?: string[]
  phase_set_by_variant?: Array<{ variant_index: number; phase_set: string | null }>
}

export type CarrierPhaseMetadata = Readonly<HaplotypeCarrierIdentity & {
  variant_indices: readonly number[]
  phase_sets?: readonly string[]
  phase_set_by_variant?: readonly PhaseSetByVariant[]
}>

export type CarrierMetadata = Readonly<Record<string, CarrierPhaseMetadata>>

export type PhaseSetSidecar = Readonly<{
  by_carrier: CarrierMetadata
  variant_ids_by_index: readonly string[]
}>

export type RawPayload = {
  variants: SoAVariants
  carrier_variant_indices: Record<string, number[]>
  carriers?: StructuredCarrier[]
  trv_alts?: Record<string, Record<number, string>>
  auto_defaults?: AutoDefaults
  _phase_summary?: {
    total_carrier_rows: number
    phased_rows: number
    haploid_rows: number
    unphased_homozygous_alt_rows: number
    ambiguous_unphased_rows: number
  } | null
  _timing?: { total_ms: number }
}

export function carrierMetadataFromPayload(
  carriers: StructuredCarrier[] | null | undefined
): CarrierMetadata {
  const metadata: Record<string, CarrierPhaseMetadata> = {}
  for (const carrier of carriers || []) {
    metadata[`${carrier.sample_id}:${carrier.vcf_strand}`] = Object.freeze({
      sample_id: carrier.sample_id,
      vcf_strand: carrier.vcf_strand,
      phase_set: carrier.phase_set,
      variant_indices: Object.freeze([...carrier.variant_indices]),
      phase_sets: carrier.phase_sets == null
        ? undefined
        : Object.freeze([...carrier.phase_sets]),
      phase_set_by_variant: carrier.phase_set_by_variant == null
        ? undefined
        : Object.freeze(carrier.phase_set_by_variant.map((association) => Object.freeze({
            variant_index: association.variant_index,
            phase_set: association.phase_set,
          }))),
    })
  }
  return Object.freeze(metadata)
}

function identityForCarrier(
  carrierId: string,
  carrierMetadata: CarrierMetadata = {}
): HaplotypeCarrierIdentity {
  const structured = carrierMetadata[carrierId]
  if (structured) {
    return {
      sample_id: structured.sample_id,
      vcf_strand: structured.vcf_strand,
      phase_set: structured.phase_set,
    }
  }

  // Compatibility with v1 REST payloads. Split at the last colon so sample IDs
  // containing colons remain intact, and retain the VCF value rather than
  // remapping it to a synthetic 0/1 slot.
  const separator = carrierId.lastIndexOf(':')
  const vcfStrand = Number(carrierId.substring(separator + 1))
  if (separator < 1 || !Number.isInteger(vcfStrand) || vcfStrand < 0) {
    throw new Error(`Invalid VCF carrier identity: ${carrierId}`)
  }
  return {
    sample_id: carrierId.substring(0, separator),
    vcf_strand: vcfStrand,
    phase_set: null,
  }
}

export type ComputedHaplotypeData = {
  groups: (HaplotypeGroup | DiplotypeGroup)[]
  clusters?: HaplotypeCluster[]
  tree_json?: string
  phase_set_sidecar: PhaseSetSidecar
}

function phaseSetSidecarFor(
  variants: LRVariant[],
  carrierMetadata: CarrierMetadata
): PhaseSetSidecar {
  return Object.freeze({
    by_carrier: carrierMetadata,
    variant_ids_by_index: Object.freeze(variants.map((variant) => variant.variant_id)),
  })
}

export type SliderRange = {
  floor: number
  ceiling: number
  defaultAf: number
}

export type AutoDefaults = {
  floor: number
  ceiling: number
  defaultAf: number
  defaultClusterThreshold: number
  isClusteredView: boolean
}

// ---- Hash utility ----

const hashString = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
  }
  return hash.toString()
}

// ---- UPGMA Tree (optimized: two-pointer Jaccard + SLINK-style min tracking) ----

/** Minimum SV length for distance matrix inclusion, scaled by region size.
 *  Small regions: 50bp (all SVs/TRs matter).
 *  Large regions: scale up so sub-pixel variants don't dominate clustering. */
function getMinSVLength(regionSize?: number): number {
  if (!regionSize || regionSize < 100_000) return 50
  if (regionSize > 1_000_000) return 500
  // Linear interpolation 50→500 over 100kb→1Mb
  const t = (regionSize - 100_000) / (1_000_000 - 100_000)
  return Math.round(50 + t * 450)
}

const isSV = (v: LRVariant, minLength: number = 50): boolean =>
  Math.abs(v.allele_length) >= minLength || (v.allele_type === 'trv' && Math.abs(v.allele_length) >= minLength)

// Two-pointer Jaccard on sorted integer arrays
function sortedJaccard(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 0
  let i = 0, j = 0, intersection = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { intersection++; i++; j++ }
    else if (a[i] < b[j]) i++
    else j++
  }
  const union = a.length + b.length - intersection
  return union === 0 ? 0 : 1 - intersection / union
}

export type DistanceMetric = 'auto' | 'sv_only' | 'snv_only' | 'all'

const isSNV = (v: LRVariant): boolean => v.allele_type === 'snv'

export const computeSVDistanceMatrix = (
  groups: LightweightGroup[],
  variants: LRVariant[],
  distanceMetric: DistanceMetric = 'auto',
  regionSize?: number
): number[][] => {
  const minLen = getMinSVLength(regionSize)

  // Collect all unique variants across groups for SV count check
  const allSVIds = new Map<string, number>()
  for (const g of groups) {
    for (const idx of g.variantIndices) {
      const v = variants[idx]
      if (isSV(v, minLen) && !allSVIds.has(v.variant_id)) {
        allSVIds.set(v.variant_id, allSVIds.size)
      }
    }
  }

  // Determine which variants to use based on distance metric
  const useMode: 'sv' | 'snv' | 'all' =
    distanceMetric === 'sv_only' ? 'sv'
    : distanceMetric === 'snv_only' ? 'snv'
    : distanceMetric === 'all' ? 'all'
    : allSVIds.size >= 5 ? 'sv' : 'all'

  const filteredIds = new Map<string, number>()
  for (const g of groups) {
    for (const idx of g.variantIndices) {
      const v = variants[idx]
      if (useMode === 'sv' && !isSV(v, minLen)) continue
      if (useMode === 'snv' && !isSNV(v)) continue
      if (!filteredIds.has(v.variant_id)) {
        filteredIds.set(v.variant_id, filteredIds.size)
      }
    }
  }

  const varIndices: number[][] = groups.map((g) => {
    const indices: number[] = []
    for (const idx of g.variantIndices) {
      const v = variants[idx]
      const mappedIdx = filteredIds.get(v.variant_id)
      if (mappedIdx !== undefined) indices.push(mappedIdx)
    }
    return indices.sort((a, b) => a - b)
  })

  const n = groups.length
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = sortedJaccard(varIndices[i], varIndices[j])
      matrix[i][j] = d
      matrix[j][i] = d
    }
  }
  return matrix
}

export const buildUPGMATree = (
  distanceMatrix: number[][],
  groups: LightweightGroup[]
): { tree: TreeNode; leafOrder: string[] } => {
  const n = groups.length

  if (n === 0) {
    return {
      tree: { left: null, right: null, distance: 0, groupHash: null, size: 0 },
      leafOrder: [],
    }
  }

  if (n === 1) {
    const leaf: TreeNode = {
      left: null, right: null, distance: 0,
      groupHash: String(groups[0].hash), size: 1,
    }
    return { tree: leaf, leafOrder: [String(groups[0].hash)] }
  }

  const clusters: TreeNode[] = groups.map((g) => ({
    left: null, right: null, distance: 0,
    groupHash: String(g.hash), size: 1,
  }))

  const dist: number[][] = distanceMatrix.map((row) => [...row])
  const sizes: number[] = new Array(n).fill(1)
  const active: boolean[] = new Array(n).fill(true)

  // SLINK-style min tracking: for each row i, track nearest active j > i
  const rowMin: number[] = new Array(n).fill(Infinity)
  const rowMinIdx: number[] = new Array(n).fill(-1)

  // Initialize row minimums
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dist[i][j] < rowMin[i]) {
        rowMin[i] = dist[i][j]
        rowMinIdx[i] = j
      }
    }
  }

  function rescanRow(i: number) {
    rowMin[i] = Infinity
    rowMinIdx[i] = -1
    for (let k = i + 1; k < n; k++) {
      if (!active[k]) continue
      if (dist[i][k] < rowMin[i]) {
        rowMin[i] = dist[i][k]
        rowMinIdx[i] = k
      }
    }
  }

  for (let step = 0; step < n - 1; step++) {
    // Find global minimum from row minimums
    let bestDist = Infinity
    let idxI = -1
    for (let i = 0; i < n; i++) {
      if (!active[i]) continue
      if (rowMin[i] < bestDist) {
        bestDist = rowMin[i]
        idxI = i
      }
    }
    let idxJ = rowMinIdx[idxI]

    // Merge idxI and idxJ (keep idxI, deactivate idxJ)
    const merged: TreeNode = {
      left: clusters[idxI], right: clusters[idxJ],
      distance: bestDist, groupHash: null,
      size: clusters[idxI].size + clusters[idxJ].size,
    }

    const sI = sizes[idxI]
    const sJ = sizes[idxJ]
    for (let k = 0; k < n; k++) {
      if (!active[k] || k === idxI || k === idxJ) continue
      const d = (dist[idxI][k] * sI + dist[idxJ][k] * sJ) / (sI + sJ)
      dist[idxI][k] = d
      dist[k][idxI] = d
    }

    sizes[idxI] = sI + sJ
    clusters[idxI] = merged
    active[idxJ] = false

    // Invalidation step: update row minimums
    for (let i = 0; i < n; i++) {
      if (!active[i]) continue
      if (i === idxI) {
        rescanRow(i)
      } else if (rowMinIdx[i] === idxI || rowMinIdx[i] === idxJ) {
        rescanRow(i)
      } else if (i < idxI && dist[i][idxI] < rowMin[i]) {
        rowMin[i] = dist[i][idxI]
        rowMinIdx[i] = idxI
      }
    }
  }

  // Find the remaining active cluster
  let rootIdx = 0
  for (let i = 0; i < n; i++) {
    if (active[i]) { rootIdx = i; break }
  }
  const tree = clusters[rootIdx]

  // Iterative in-order traversal to get leaf order
  const leafOrder: string[] = []
  const stack: TreeNode[] = []
  let cur: TreeNode | null = tree
  while (cur || stack.length > 0) {
    while (cur) {
      stack.push(cur)
      cur = cur.left
    }
    cur = stack.pop()!
    if (cur.groupHash !== null) {
      leafOrder.push(cur.groupHash)
    }
    cur = cur.right
  }
  return { tree, leafOrder }
}

export const getClustersAtThreshold = (root: TreeNode, threshold: number): TreeNode[] => {
  const results: TreeNode[] = []
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.distance <= threshold) {
      results.push(node)
    } else {
      if (node.right) stack.push(node.right)
      if (node.left) stack.push(node.left)
    }
  }
  return results
}

export const getLeafGroupHashes = (root: TreeNode): string[] => {
  const hashes: string[] = []
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.groupHash !== null) {
      hashes.push(node.groupHash)
    } else {
      if (node.right) stack.push(node.right)
      if (node.left) stack.push(node.left)
    }
  }
  return hashes
}

// ---- Sorting (ported from haplotype-grouping.ts) ----

export function sortBySimilarity(groups: HaplotypeGroup[]): HaplotypeGroup[] {
  if (groups.length <= 1) return groups

  const positionSets: Set<number>[] = groups.map(
    (g) => new Set(g.variants.variants.map((v) => v.pos))
  )

  const scores = new Float64Array(groups.length)
  for (let i = 0; i < groups.length; i++) {
    const setA = positionSets[i]
    const sizeA = setA.size
    let totalScore = 0
    for (let j = 0; j < groups.length; j++) {
      if (i === j) continue
      const setB = positionSets[j]
      const sizeB = setB.size
      const maxSize = Math.max(sizeA, sizeB)
      if (maxSize === 0) continue
      let common = 0
      if (sizeA <= sizeB) {
        for (const pos of setA) { if (setB.has(pos)) common++ }
      } else {
        for (const pos of setB) { if (setA.has(pos)) common++ }
      }
      totalScore += common / maxSize
    }
    scores[i] = totalScore
  }

  const indices = Array.from({ length: groups.length }, (_, i) => i)
  indices.sort((a, b) => scores[b] - scores[a])
  return indices.map((i) => groups[i])
}

export function sortGroups(groups: HaplotypeGroup[], sortBy: string): HaplotypeGroup[] {
  if (sortBy === 'similarity_score') return sortBySimilarity(groups)
  const sorted = [...groups]
  if (sortBy === 'sample_count') {
    sorted.sort((a, b) => b.samples.length - a.samples.length)
  } else {
    sorted.sort((a, b) => b.variants.variants.length - a.variants.variants.length)
  }
  return sorted
}

// ---- Lightweight grouping (Tier 1) ----

export type LightweightGroup = {
  signature: string
  carrierIds: string[]
  variantIndices: number[]
  hash: number
  sampleCount: number
}

export function groupCarriersLightweight(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  minAf: number
): LightweightGroup[] {
  const passingIndices = new Set<number>()
  for (let i = 0; i < variants.length; i++) {
    if (variants[i].freq.af >= minAf) passingIndices.add(i)
  }

  const signatureToCarriers = new Map<string, string[]>()
  const signatureToIndices = new Map<string, number[]>()

  for (const [carrierId, variantIdxs] of Object.entries(carrierVariantIndices)) {
    const filtered = variantIdxs.filter((i) => passingIndices.has(i))
    if (filtered.length === 0) continue

    const sorted = filtered.slice().sort((a, b) => a - b)
    const signature = sorted.join(',')

    let carriers = signatureToCarriers.get(signature)
    if (!carriers) {
      carriers = []
      signatureToCarriers.set(signature, carriers)
      signatureToIndices.set(signature, sorted)
    }
    carriers.push(carrierId)
  }

  const groups: LightweightGroup[] = []
  for (const [signature, carriers] of signatureToCarriers) {
    groups.push({
      signature,
      carrierIds: carriers,
      variantIndices: signatureToIndices.get(signature)!,
      hash: Number(hashString(signature)),
      sampleCount: carriers.length,
    })
  }

  return groups
}

// ---- Inflation (Tier 2) ----

export function inflateGroups(
  lightGroups: LightweightGroup[],
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  trvAlts: Record<string, Record<number, string>> | undefined,
  skipBelowThreshold: boolean,
  carrierMetadata: CarrierMetadata = {}
): HaplotypeGroup[] {
  return lightGroups.map((lg) => {
    const aboveVariants = lg.variantIndices.map((i) => variants[i])
    const readableId = aboveVariants
      .map((v) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
      .sort()
      .join(';')
    const hasTrv = aboveVariants.some((v) => v.allele_type === 'trv')

    const samples = lg.carrierIds.map((carrierId) => {
      const identity = identityForCarrier(carrierId, carrierMetadata)
      let carrierVariants = aboveVariants
      if (hasTrv && trvAlts) {
        const posMap = trvAlts[carrierId]
        if (posMap) {
          carrierVariants = aboveVariants.map((v) => {
            if (v.allele_type !== 'trv') return v
            const carrierAlt = posMap[v.pos]
            if (carrierAlt && carrierAlt !== v.alt) {
              return { ...v, alt: carrierAlt }
            }
            return v
          })
        }
      }
      return {
        ...identity,
        variant_sets: [{ variants: carrierVariants, readable_id: readableId }],
      }
    })

    const belowVariants: LRVariant[] = []
    if (!skipBelowThreshold) {
      const passingSet = new Set(lg.variantIndices)
      const belowMap = new Map<number, HaplotypeCarrierIdentity[]>()
      for (const carrierId of lg.carrierIds) {
        const identity = identityForCarrier(carrierId, carrierMetadata)
        const allIdxs = carrierVariantIndices[carrierId]
        for (const idx of allIdxs) {
          if (!passingSet.has(idx)) {
            const existing = belowMap.get(idx)
            if (existing) {
              existing.push(identity)
            } else {
              belowMap.set(idx, [identity])
            }
          }
        }
      }
      for (const [idx, identities] of belowMap) {
        belowVariants.push({
          ...variants[idx],
          in_samples: identities.map(({ sample_id }) => sample_id),
          in_haplotypes: identities,
        })
      }
    }

    return {
      samples,
      variants: { variants: aboveVariants, readable_id: readableId },
      below_threshold: { variants: belowVariants, readable_id: '' },
      start: aboveVariants.reduce((min, v) => Math.min(min, v.pos), Infinity),
      stop: aboveVariants.reduce((max, v) => Math.max(max, v.pos), -Infinity),
      hash: lg.hash,
    }
  })
}

// ---- Grouping (legacy, kept for reference but no longer called) ----

export function groupCarriers(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  minAf: number,
  trvAlts?: Record<string, Record<number, string>>,
  skipBelowThreshold: boolean = false,
  carrierMetadata: CarrierMetadata = {}
): HaplotypeGroup[] {
  // Build set of variant indices that pass AF threshold
  const passingIndices = new Set<number>()
  for (let i = 0; i < variants.length; i++) {
    if (variants[i].freq.af >= minAf) passingIndices.add(i)
  }

  // Build per-carrier filtered variant index lists and group by signature
  const signatureToCarriers = new Map<string, string[]>()
  const signatureToIndices = new Map<string, number[]>()

  for (const [carrierId, variantIdxs] of Object.entries(carrierVariantIndices)) {
    const filtered = variantIdxs.filter((i) => passingIndices.has(i))
    if (filtered.length === 0) continue

    const signature = filtered.join(',')
    const existing = signatureToCarriers.get(signature)
    if (existing) {
      existing.push(carrierId)
    } else {
      signatureToCarriers.set(signature, [carrierId])
      signatureToIndices.set(signature, filtered)
    }
  }

  const groups: HaplotypeGroup[] = []
  for (const [signature, carriers] of signatureToCarriers) {
    const indices = signatureToIndices.get(signature)!
    const aboveVariants = indices.map((i) => variants[i])

    const readableId = aboveVariants
      .map((v) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
      .sort()
      .join(';')
    const groupHash = hashString(readableId)

    const hasTrv = aboveVariants.some((v) => v.allele_type === 'trv')

    const samples = carriers.map((carrierId) => {
      const identity = identityForCarrier(carrierId, carrierMetadata)
      let carrierVariants = aboveVariants
      if (hasTrv && trvAlts) {
        const posMap = trvAlts[carrierId]
        if (posMap) {
          carrierVariants = aboveVariants.map((v) => {
            if (v.allele_type !== 'trv') return v
            const carrierAlt = posMap[v.pos]
            if (carrierAlt && carrierAlt !== v.alt) {
              return { ...v, alt: carrierAlt }
            }
            return v
          })
        }
      }
      return {
        ...identity,
        variant_sets: [{ variants: carrierVariants, readable_id: readableId }],
      }
    })

    // Collect below-threshold variants for this group's carriers.
    // Keep both the legacy sample-only membership and composite VCF identity.
    const belowVariants: LRVariant[] = []
    if (!skipBelowThreshold) {
      const belowMap = new Map<number, HaplotypeCarrierIdentity[]>()
      for (const carrierId of carriers) {
        const identity = identityForCarrier(carrierId, carrierMetadata)
        const allIdxs = carrierVariantIndices[carrierId]
        for (const idx of allIdxs) {
          if (passingIndices.has(idx)) continue
          const existing = belowMap.get(idx)
          if (existing) {
            existing.push(identity)
          } else {
            belowMap.set(idx, [identity])
          }
        }
      }
      for (const [idx, identities] of belowMap) {
        belowVariants.push({
          ...variants[idx],
          in_samples: identities.map(({ sample_id }) => sample_id),
          in_haplotypes: identities,
        })
      }
    }

    groups.push({
      samples,
      variants: { variants: aboveVariants, readable_id: readableId },
      below_threshold: { variants: belowVariants, readable_id: '' },
      start: aboveVariants.reduce((min, v) => Math.min(min, v.pos), Infinity),
      stop: aboveVariants.reduce((max, v) => Math.max(max, v.pos), -Infinity),
      hash: Number(groupHash),
    })
  }

  return groups
}

// ---- Cluster computation ----

export function computeClusters(
  groups: LightweightGroup[],
  tree: TreeNode,
  clusterThreshold: number,
  variants: LRVariant[]
): HaplotypeCluster[] {
  const clusterNodes = getClustersAtThreshold(tree, clusterThreshold)
  const groupByHash = new Map<string, LightweightGroup>()
  for (const g of groups) groupByHash.set(String(g.hash), g)

  return clusterNodes.map((clusterNode, idx) => {
    const memberHashes = getLeafGroupHashes(clusterNode)
    const memberGroups = memberHashes
      .map((h) => groupByHash.get(h))
      .filter((g): g is LightweightGroup => g != null)

    const sampleCount = memberGroups.reduce((sum, g) => sum + g.sampleCount, 0)

    const variantTally = new Map<string, { variant: LRVariant; count: number }>()
    for (const g of memberGroups) {
      const weight = g.sampleCount
      for (const idx of g.variantIndices) {
        const v = variants[idx]
        const existing = variantTally.get(v.variant_id)
        if (existing) {
          existing.count += weight
        } else {
          variantTally.set(v.variant_id, { variant: v, count: weight })
        }
      }
    }

    const consensusVariants = Array.from(variantTally.values()).map(
      ({ variant, count }) => ({
        variant,
        cluster_af: sampleCount > 0 ? count / sampleCount : 0,
      })
    )

    return {
      cluster_id: `cluster_${idx}`,
      sample_count: sampleCount,
      member_group_hashes: memberHashes,
      consensus_variants: consensusVariants,
    }
  })
}

// ---- Diplotype helpers: ROH & Compound Het ----

const SEVERE_CONSEQUENCES = new Set([
  'transcript_ablation',
  'splice_acceptor_variant',
  'splice_donor_variant',
  'stop_gained',
  'frameshift_variant',
  'missense_variant',
])

function calculateROH(
  variantsA: LRVariant[],
  variantsB: LRVariant[]
): { roh_fraction: number; is_roh: boolean } {
  const setA = new Set(variantsA.map((v) => v.variant_id))
  const setB = new Set(variantsB.map((v) => v.variant_id))

  let intersection = 0
  for (const id of setA) {
    if (setB.has(id)) intersection++
  }
  const union = setA.size + setB.size - intersection

  const roh_fraction = union === 0 ? 1 : intersection / union
  return { roh_fraction, is_roh: roh_fraction >= 0.95 }
}

function getVariantConsequence(v: LRVariant): string | null {
  if (v.major_consequence) return v.major_consequence
  if (v.sv_consequences && v.sv_consequences.length > 0) return v.sv_consequences[0]
  return null
}

function detectCompoundHets(
  variantsA: LRVariant[],
  variantsB: LRVariant[]
): { compound_het_pairs: { variantA: LRVariant; variantB: LRVariant }[]; is_compound_het: boolean } {
  const severeA = variantsA.filter((v) => {
    const csq = getVariantConsequence(v)
    return csq != null && SEVERE_CONSEQUENCES.has(csq)
  })
  const severeB = variantsB.filter((v) => {
    const csq = getVariantConsequence(v)
    return csq != null && SEVERE_CONSEQUENCES.has(csq)
  })

  const pairs: { variantA: LRVariant; variantB: LRVariant }[] = []
  for (const varA of severeA) {
    for (const varB of severeB) {
      if (varA.pos !== varB.pos) {
        pairs.push({ variantA: varA, variantB: varB })
      }
    }
  }

  return { compound_het_pairs: pairs, is_compound_het: pairs.length > 0 }
}

// ---- Diplotype grouping ----

export function groupDiplotypes(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  minAf: number,
  carrierMetadata: CarrierMetadata = {}
): DiplotypeGroup[] {
  // Build set of variant indices that pass AF threshold
  const passingIndices = new Set<number>()
  for (let i = 0; i < variants.length; i++) {
    if (variants[i].freq.af >= minAf) passingIndices.add(i)
  }

  type CarrierStrand = HaplotypeCarrierIdentity & { indices: number[]; below: number[] }
  const sampleStrands = new Map<string, CarrierStrand[]>()
  for (const [carrierId, variantIdxs] of Object.entries(carrierVariantIndices)) {
    const identity = identityForCarrier(carrierId, carrierMetadata)
    const strand = {
      ...identity,
      indices: variantIdxs.filter((i) => passingIndices.has(i)),
      below: variantIdxs.filter((i) => !passingIndices.has(i)),
    }
    const entry = sampleStrands.get(identity.sample_id)
    if (entry) entry.push(strand)
    else sampleStrands.set(identity.sample_id, [strand])
  }
  for (const strands of sampleStrands.values()) {
    strands.sort((a, b) => a.vcf_strand - b.vcf_strand)
    if (strands.length > 2) {
      throw new Error(`Sample ${strands[0].sample_id} has more than two VCF GT positions`)
    }
  }

  // Group by canonical diplotype signature
  const sigToGroup = new Map<
    string,
    {
      samples: DiplotypeSample[]
      indicesA: number[]
      indicesB: number[]
      belowA: number[]
      belowB: number[]
    }
  >()

  // Generate signatures for each strand
  const makeSig = (indices: number[]): string =>
    indices
      .map((i) => {
        const v = variants[i]
        return `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`
      })
      .sort()
      .join(';')

  for (const [sampleId, strands] of sampleStrands) {
    const first = strands[0]
    const second = strands[1]
    const idxFirst = first.indices
    const idxSecond = second?.indices || []

    const sigFirst = makeSig(idxFirst)
    const sigSecond = makeSig(idxSecond)

    // Canonical ordering: sort signatures so (A,B) and (B,A) hash the same
    let canonSigA: string, canonSigB: string
    let indicesA: number[], indicesB: number[]
    let strandA: number | null, strandB: number | null
    let phaseSetA: string | null, phaseSetB: string | null
    let belowA: number[], belowB: number[]

    if (sigFirst <= sigSecond) {
      canonSigA = sigFirst
      canonSigB = sigSecond
      indicesA = idxFirst
      indicesB = idxSecond
      strandA = first.vcf_strand
      strandB = second?.vcf_strand ?? null
      phaseSetA = first.phase_set
      phaseSetB = second?.phase_set ?? null
      belowA = first.below
      belowB = second?.below || []
    } else {
      canonSigA = sigSecond
      canonSigB = sigFirst
      indicesA = idxSecond
      indicesB = idxFirst
      strandA = second?.vcf_strand ?? null
      strandB = first.vcf_strand
      phaseSetA = second?.phase_set ?? null
      phaseSetB = first.phase_set
      belowA = second?.below || []
      belowB = first.below
    }

    const combinedSig = `${canonSigA}||${canonSigB}`
    const existing = sigToGroup.get(combinedSig)

    if (existing) {
      existing.samples.push({
        sample_id: sampleId,
        strand_mapping: { strandA, strandB },
        phase_set_mapping: { phaseSetA, phaseSetB },
      })
    } else {
      sigToGroup.set(combinedSig, {
        samples: [
          {
            sample_id: sampleId,
            strand_mapping: { strandA, strandB },
            phase_set_mapping: { phaseSetA, phaseSetB },
          },
        ],
        indicesA,
        indicesB,
        belowA,
        belowB,
      })
    }
  }

  // Build DiplotypeGroup objects
  const groups: DiplotypeGroup[] = []
  for (const [combinedSig, entry] of sigToGroup) {
    const variantsA = entry.indicesA.map((i) => variants[i])
    const variantsB = entry.indicesB.map((i) => variants[i])

    const readableIdA = variantsA
      .map((v) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
      .sort()
      .join(';')
    const readableIdB = variantsB
      .map((v) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
      .sort()
      .join(';')

    const belowVarA = entry.belowA.map((i) => variants[i])
    const belowVarB = entry.belowB.map((i) => variants[i])

    const allVariants = [...variantsA, ...variantsB]
    const allPositions = allVariants.map((v) => v.pos)

    const roh = calculateROH(variantsA, variantsB)
    const ch = detectCompoundHets(variantsA, variantsB)

    groups.push({
      is_diplotype: true,
      samples: entry.samples,
      haplotypeA: { variants: variantsA, readable_id: readableIdA },
      haplotypeB: { variants: variantsB, readable_id: readableIdB },
      below_thresholdA: { variants: belowVarA, readable_id: '' },
      below_thresholdB: { variants: belowVarB, readable_id: '' },
      start: allPositions.length > 0 ? Math.min(...allPositions) : Infinity,
      stop: allPositions.length > 0 ? Math.max(...allPositions) : -Infinity,
      hash: Number(hashString(combinedSig)),
      roh_fraction: roh.roh_fraction,
      is_roh: roh.is_roh,
      compound_het_pairs: ch.compound_het_pairs,
      is_compound_het: ch.is_compound_het,
    })
  }

  return groups
}

// ---- Diplotype sorting ----

export function sortDiplotypes(
  groups: DiplotypeGroup[],
  sortBy: string
): DiplotypeGroup[] {
  const compareSampleIds = (a: DiplotypeSample, b: DiplotypeSample) => {
    if (a.sample_id < b.sample_id) return -1
    if (a.sample_id > b.sample_id) return 1
    return 0
  }
  const sorted = sortBy === 'sample_id'
    ? groups.map((group) => ({ ...group, samples: [...group.samples].sort(compareSampleIds) }))
    : [...groups]
  switch (sortBy) {
    case 'sample_id':
      sorted.sort((a, b) => compareSampleIds(a.samples[0], b.samples[0]))
      break
    case 'roh_fraction':
      sorted.sort(
        (a, b) => b.roh_fraction - a.roh_fraction || b.samples.length - a.samples.length
      )
      break
    case 'compound_het':
      sorted.sort(
        (a, b) =>
          (b.is_compound_het ? 1 : 0) - (a.is_compound_het ? 1 : 0) ||
          b.samples.length - a.samples.length
      )
      break
    case 'diplotype_frequency':
    default:
      sorted.sort((a, b) => b.samples.length - a.samples.length)
      break
  }
  return sorted
}

// ---- Full pipeline: grouping + tree + clusters ----

export function computeHaplotypeView(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  minAf: number,
  sortBy: string,
  isClusteredView: boolean,
  clusterThreshold: number,
  trvAlts?: Record<string, Record<number, string>>,
  isDiploidView: boolean = false,
  distanceMetric: DistanceMetric = 'auto',
  regionSize?: number,
  carrierMetadata: CarrierMetadata = {},
  onProgress?: (status: string) => void
): ComputedHaplotypeData {
  const phase_set_sidecar = phaseSetSidecarFor(variants, carrierMetadata)
  if (isDiploidView) {
    const diplotypes = groupDiplotypes(variants, carrierVariantIndices, minAf, carrierMetadata)
    const sorted = sortDiplotypes(diplotypes, sortBy)
    return { groups: sorted, phase_set_sidecar }
  }

  const skipBelow = (regionSize || 0) > 200_000

  // Tier 1: Lightweight grouping (no TR alt spreading, no below-threshold, no variant_sets)
  let t0 = Date.now()
  const lightGroups = groupCarriersLightweight(variants, carrierVariantIndices, minAf)
  const tGroup = Date.now() - t0

  if (lightGroups.length < 2) {
    const inflated = inflateGroups(
      lightGroups, variants, carrierVariantIndices, trvAlts, skipBelow, carrierMetadata
    )
    return { groups: sortGroups(inflated, sortBy), phase_set_sidecar }
  }

  // Distance matrix + UPGMA on lightweight groups
  onProgress?.(`Computing distances for ${lightGroups.length} haplotypes…`)
  t0 = Date.now()
  const distMatrix = computeSVDistanceMatrix(lightGroups, variants, distanceMetric, regionSize)
  const tDist = Date.now() - t0
  onProgress?.(`Building UPGMA tree (${lightGroups.length} haplotypes)…`)
  t0 = Date.now()
  const { tree } = buildUPGMATree(distMatrix, lightGroups)
  const tTree = Date.now() - t0

  // Clustering on lightweight groups
  const clusters = isClusteredView ? computeClusters(lightGroups, tree, clusterThreshold, variants) : undefined

  // Tier 2: Inflate to full HaplotypeGroup[] for rendering
  t0 = Date.now()
  const inflated = inflateGroups(
    lightGroups, variants, carrierVariantIndices, trvAlts, skipBelow, carrierMetadata
  )
  const tInflate = Date.now() - t0
  const sorted = sortGroups(inflated, sortBy)

  console.log(`[perf] computeHaplotypeView: lightweight=${tGroup}ms, distMatrix=${tDist}ms (${lightGroups.length} groups), UPGMA=${tTree}ms, inflate=${tInflate}ms`)

  return {
    groups: sorted,
    clusters,
    tree_json: JSON.stringify(tree),
    phase_set_sidecar,
  }
}

/**
 * Display-only filtering: when clustering is ON, min AF just hides variant dots.
 * Groups, tree, and clusters remain stable (computed from base groups at floor AF).
 */
export function filterDisplayVariants(
  data: ComputedHaplotypeData,
  minAf: number
): ComputedHaplotypeData {
  const groups = data.groups.map((g) => {
    // filterDisplayVariants only applies to haplotype (non-diploid) groups
    if ('is_diplotype' in g && g.is_diplotype) return g

    const hg = g as HaplotypeGroup
    const filteredVariants = hg.variants.variants.filter((v: LRVariant) => v.freq.af >= minAf)
    const filteredBelow = [
      ...hg.below_threshold.variants,
      ...hg.variants.variants.filter((v: LRVariant) => v.freq.af < minAf).map((v: LRVariant) => ({
        ...v,
        in_samples: hg.samples.map((s) => s.sample_id),
        in_haplotypes: hg.samples.map(({ sample_id, vcf_strand, phase_set }) => ({
          sample_id, vcf_strand, phase_set,
        })),
      })),
    ]
    return {
      ...hg,
      variants: {
        variants: filteredVariants,
        readable_id: filteredVariants
          .map((v: LRVariant) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
          .sort()
          .join(';'),
      },
      below_threshold: { variants: filteredBelow, readable_id: '' },
      samples: hg.samples.map((s) => ({
        ...s,
        variant_sets: s.variant_sets.map((vs) => ({
          ...vs,
          variants: vs.variants.filter((v: LRVariant) => v.freq.af >= minAf),
        })),
      })),
    }
  })

  // Recompute consensus variants for clusters using only the display-filtered variants
  const haploGroups = groups.filter((g): g is HaplotypeGroup => !('is_diplotype' in g))
  const clusters = data.clusters?.map((c) => {
    const groupByHash = new Map<string, HaplotypeGroup>()
    for (const g of haploGroups) groupByHash.set(String(g.hash), g)

    const memberGroups = c.member_group_hashes
      .map((h) => groupByHash.get(h))
      .filter((g): g is HaplotypeGroup => g != null)

    const sampleCount = memberGroups.reduce((sum, g) => sum + g.samples.length, 0)
    const variantTally = new Map<string, { variant: LRVariant; count: number }>()
    for (const g of memberGroups) {
      const weight = g.samples.length
      for (const v of g.variants.variants) {
        const existing = variantTally.get(v.variant_id)
        if (existing) existing.count += weight
        else variantTally.set(v.variant_id, { variant: v, count: weight })
      }
    }

    return {
      ...c,
      consensus_variants: Array.from(variantTally.values()).map(
        ({ variant, count }) => ({
          variant,
          cluster_af: sampleCount > 0 ? count / sampleCount : 0,
        })
      ),
    }
  })

  return { ...data, groups, clusters }
}

// ---- Auto-derive slider range ----

export function deriveSliderRange(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
): SliderRange {
  if (variants.length === 0) {
    return { floor: 0, ceiling: 1, defaultAf: 0 }
  }

  // Floor: 2 / max AN (excludes singletons)
  const maxAN = variants.reduce((max, v) => Math.max(max, v.freq.an), 0)
  const floor = maxAN > 0 ? 2 / maxAN : 0.001

  // Ceiling: 95th percentile AF
  const sortedAfs = variants.map((v) => v.freq.af).sort((a, b) => a - b)
  const p95idx = Math.floor(sortedAfs.length * 0.95)
  const ceiling = Math.min(sortedAfs[p95idx] || 0.95, 0.95)

  // Default: binary search for ~30 groups
  const TARGET_GROUPS = 30
  let lo = floor
  let hi = ceiling
  let bestAf = floor

  for (let step = 0; step < 8; step++) {
    const mid = Math.pow(10, (Math.log10(lo) + Math.log10(hi)) / 2)
    const groupCount = countGroups(variants, carrierVariantIndices, mid)

    if (groupCount > TARGET_GROUPS) {
      lo = mid
    } else {
      hi = mid
    }
    bestAf = mid
  }

  return {
    floor: Math.max(floor, 0.001),
    ceiling: Math.max(ceiling, floor + 0.01),
    defaultAf: Math.max(bestAf, floor),
  }
}

function countGroups(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  minAf: number
): number {
  const passingIndices = new Set<number>()
  for (let i = 0; i < variants.length; i++) {
    if (variants[i].freq.af >= minAf) passingIndices.add(i)
  }

  const signatures = new Set<string>()
  for (const variantIdxs of Object.values(carrierVariantIndices)) {
    const filtered = variantIdxs.filter((i) => passingIndices.has(i))
    if (filtered.length === 0) continue
    signatures.add(filtered.join(','))
  }
  return signatures.size
}

// ---- Auto cluster threshold from region size ----

export function getAutoClusterThreshold(regionSize: number): number {
  if (regionSize < 5_000) return 0.20
  if (regionSize < 50_000) return 0.25
  if (regionSize > 1_000_000) return 0.70
  const t = (regionSize - 50_000) / (1_000_000 - 50_000)
  return 0.35 + t * 0.30
}

// ---- Joint auto-derivation of min AF + cluster threshold ----

const TARGET_MIN = 15
const TARGET_MAX = 40
const MAX_GROUPS_FOR_UPGMA = 600

export function deriveAutoDefaults(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  regionSize: number,
  distanceMetric: DistanceMetric = 'auto'
): AutoDefaults {
  if (variants.length === 0) {
    return { floor: 0, ceiling: 1, defaultAf: 0, defaultClusterThreshold: 0, isClusteredView: false }
  }

  // Compute floor and ceiling (same as deriveSliderRange)
  const maxAN = variants.reduce((max, v) => Math.max(max, v.freq.an), 0)
  const floor = Math.max(maxAN > 0 ? 2 / maxAN : 0.001, 0.001)
  const sortedAfs = variants.map((v) => v.freq.af).sort((a, b) => a - b)
  const p95idx = Math.floor(sortedAfs.length * 0.95)
  const ceiling = Math.max(Math.min(sortedAfs[p95idx] || 0.95, 0.95), floor + 0.01)

  const baseClusterThreshold = getAutoClusterThreshold(regionSize)

  // No clustering for small regions — fall back to AF-only binary search
  if (baseClusterThreshold === 0) {
    const defaultAf = binarySearchAf(variants, carrierVariantIndices, floor, ceiling, 30)
    return { floor, ceiling, defaultAf, defaultClusterThreshold: 0, isClusteredView: false }
  }

  // Joint iterative derivation — uses lightweight grouping only
  let minAf = floor
  let clusterThreshold = baseClusterThreshold
  let bestRowCount = 0

  // Limit how far AF can be raised — don't go past 20% of the way to ceiling
  const maxAfBump = Math.pow(10, Math.log10(floor) + (Math.log10(ceiling) - Math.log10(floor)) * 0.2)

  for (let iter = 0; iter < 10; iter++) {
    const lightGroups = groupCarriersLightweight(variants, carrierVariantIndices, minAf)
    const N = lightGroups.length

    // Too many groups for UPGMA — raise AF to reduce
    if (N > MAX_GROUPS_FOR_UPGMA) {
      const newAf = Math.pow(10, (Math.log10(minAf) + Math.log10(ceiling)) / 2)
      if (newAf > maxAfBump) break
      minAf = newAf
      continue
    }

    if (N < 2) {
      bestRowCount = N
      break
    }

    const distMatrix = computeSVDistanceMatrix(lightGroups, variants, distanceMetric, regionSize)
    const { tree } = buildUPGMATree(distMatrix, lightGroups)
    const clusterNodes = getClustersAtThreshold(tree, clusterThreshold)
    const M = clusterNodes.length
    bestRowCount = M

    if (M >= TARGET_MIN && M <= TARGET_MAX) {
      break
    }

    if (M > TARGET_MAX) {
      clusterThreshold = Math.min(1.0, clusterThreshold + 0.05)
      if (clusterThreshold >= 0.95) break
    } else {
      const newAf = Math.pow(10, (Math.log10(floor) + Math.log10(minAf)) / 2)
      if (Math.abs(newAf - minAf) < 1e-6) {
        clusterThreshold = Math.max(0, clusterThreshold - 0.05)
        if (clusterThreshold <= 0.05) break
      } else {
        minAf = newAf
      }
    }
  }

  return {
    floor,
    ceiling,
    defaultAf: Math.max(minAf, floor),
    defaultClusterThreshold: clusterThreshold,
    isClusteredView: true,
  }
}

function binarySearchAf(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  floor: number,
  ceiling: number,
  targetGroups: number
): number {
  let lo = floor
  let hi = ceiling
  let bestAf = floor

  for (let step = 0; step < 8; step++) {
    const mid = Math.pow(10, (Math.log10(lo) + Math.log10(hi)) / 2)
    const groupCount = countGroups(variants, carrierVariantIndices, mid)
    if (groupCount > targetGroups) {
      lo = mid
    } else {
      hi = mid
    }
    bestAf = mid
  }

  return Math.max(bestAf, floor)
}

// rebuild

