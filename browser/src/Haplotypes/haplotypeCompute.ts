/**
 * Client-side haplotype computation: grouping, UPGMA tree, cluster cutting, sorting.
 * Ported from graphql-api/src/queries/genealogy-math.ts and haplotype-grouping.ts
 * to enable zero-latency slider interactions.
 */

import type { LRVariant, HaplotypeGroup, HaplotypeCluster } from './index'

// ---- Types ----

export type TreeNode = {
  left: TreeNode | null
  right: TreeNode | null
  distance: number
  groupHash: string | null
  size: number
}

export type RawPayload = {
  variants: LRVariant[]
  carrier_variant_indices: Record<string, number[]>
  trv_alts?: Record<string, Record<number, string>>
  _timing?: { total_ms: number }
}

export type ComputedHaplotypeData = {
  groups: HaplotypeGroup[]
  clusters?: HaplotypeCluster[]
  tree_json?: string
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

// ---- UPGMA Tree (ported from genealogy-math.ts) ----

const isSV = (v: LRVariant): boolean =>
  Math.abs(v.allele_length) >= 50 || v.allele_type === 'trv'

export const computeSVDistanceMatrix = (groups: HaplotypeGroup[]): number[][] => {
  const variantSets = groups.map(
    (g) => new Set(
      g.variants.variants
        .filter((v) => isSV(v))
        .map((v) => v.variant_id)
    )
  )

  const n = groups.length
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const setI = variantSets[i]
      const setJ = variantSets[j]
      let intersection = 0
      const [smaller, larger] = setI.size <= setJ.size ? [setI, setJ] : [setJ, setI]
      for (const id of smaller) {
        if (larger.has(id)) intersection++
      }
      const union = setI.size + setJ.size - intersection
      const distance = union === 0 ? 0 : 1 - intersection / union
      matrix[i][j] = distance
      matrix[j][i] = distance
    }
  }
  return matrix
}

export const buildUPGMATree = (
  distanceMatrix: number[][],
  groups: HaplotypeGroup[]
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

  let clusters: TreeNode[] = groups.map((g) => ({
    left: null, right: null, distance: 0,
    groupHash: String(g.hash), size: 1,
  }))

  let dist: number[][] = distanceMatrix.map((row) => [...row])
  let sizes: number[] = new Array(n).fill(1)
  let active: number[] = Array.from({ length: n }, (_, i) => i)

  while (active.length > 1) {
    let minDist = Infinity
    let minI = -1
    let minJ = -1
    for (let ai = 0; ai < active.length; ai++) {
      for (let aj = ai + 1; aj < active.length; aj++) {
        const d = dist[active[ai]][active[aj]]
        if (d < minDist) {
          minDist = d
          minI = ai
          minJ = aj
        }
      }
    }

    const idxI = active[minI]
    const idxJ = active[minJ]

    const merged: TreeNode = {
      left: clusters[idxI], right: clusters[idxJ],
      distance: minDist, groupHash: null,
      size: clusters[idxI].size + clusters[idxJ].size,
    }

    const sI = sizes[idxI]
    const sJ = sizes[idxJ]
    for (const k of active) {
      if (k === idxI || k === idxJ) continue
      dist[idxI][k] = (dist[idxI][k] * sI + dist[idxJ][k] * sJ) / (sI + sJ)
      dist[k][idxI] = dist[idxI][k]
    }

    sizes[idxI] = sI + sJ
    clusters[idxI] = merged
    active.splice(minJ, 1)
  }

  const tree = clusters[active[0]]
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

// ---- Grouping ----

export function groupCarriers(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  minAf: number,
  trvAlts?: Record<string, Record<number, string>>
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
      const sampleId = carrierId.split(':')[0]
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
        sample_id: sampleId,
        variant_sets: [{ variants: carrierVariants, readable_id: readableId }],
      }
    })

    // Collect below-threshold variants for this group's carriers
    const belowVariants: (LRVariant & { in_samples?: string[] })[] = []
    const belowMap = new Map<number, string[]>()
    for (const carrierId of carriers) {
      const allIdxs = carrierVariantIndices[carrierId]
      for (const idx of allIdxs) {
        if (passingIndices.has(idx)) continue
        const existing = belowMap.get(idx)
        if (existing) {
          existing.push(carrierId.split(':')[0])
        } else {
          belowMap.set(idx, [carrierId.split(':')[0]])
        }
      }
    }
    for (const [idx, sampleIds] of belowMap) {
      belowVariants.push({ ...variants[idx], in_samples: sampleIds })
    }

    groups.push({
      samples,
      variants: { variants: aboveVariants, readable_id: readableId },
      below_threshold: { variants: belowVariants, readable_id: '' },
      start: Math.min(...aboveVariants.map((v) => v.pos)),
      stop: Math.max(...aboveVariants.map((v) => v.pos)),
      hash: Number(groupHash),
    })
  }

  return groups
}

// ---- Cluster computation ----

export function computeClusters(
  groups: HaplotypeGroup[],
  tree: TreeNode,
  clusterThreshold: number
): HaplotypeCluster[] {
  const clusterNodes = getClustersAtThreshold(tree, clusterThreshold)
  const groupByHash = new Map<string, HaplotypeGroup>()
  for (const g of groups) groupByHash.set(String(g.hash), g)

  return clusterNodes.map((clusterNode, idx) => {
    const memberHashes = getLeafGroupHashes(clusterNode)
    const memberGroups = memberHashes
      .map((h) => groupByHash.get(h))
      .filter((g): g is HaplotypeGroup => g != null)

    const sampleCount = memberGroups.reduce((sum, g) => sum + g.samples.length, 0)

    const variantTally = new Map<string, { variant: LRVariant; count: number }>()
    for (const g of memberGroups) {
      const weight = g.samples.length
      for (const v of g.variants.variants) {
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

// ---- Full pipeline: grouping + tree + clusters ----

export function computeHaplotypeView(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  minAf: number,
  sortBy: string,
  isClusteredView: boolean,
  clusterThreshold: number,
  trvAlts?: Record<string, Record<number, string>>
): ComputedHaplotypeData {
  const groups = groupCarriers(variants, carrierVariantIndices, minAf, trvAlts)
  const sorted = sortGroups(groups, sortBy)

  if (sorted.length < 2) {
    return { groups: sorted }
  }

  // Always build the UPGMA tree so genealogy and clustering share one tree
  const distMatrix = computeSVDistanceMatrix(sorted)
  const { tree } = buildUPGMATree(distMatrix, sorted)
  const clusters = isClusteredView ? computeClusters(sorted, tree, clusterThreshold) : undefined

  return {
    groups: sorted,
    clusters,
    tree_json: JSON.stringify(tree),
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
    const filteredVariants = g.variants.variants.filter((v) => v.freq.af >= minAf)
    const filteredBelow = [
      ...g.below_threshold.variants,
      ...g.variants.variants.filter((v) => v.freq.af < minAf).map((v) => ({
        ...v,
        in_samples: g.samples.map((s) => s.sample_id),
      })),
    ]
    return {
      ...g,
      variants: {
        variants: filteredVariants,
        readable_id: filteredVariants
          .map((v) => `${v.chrom}-${v.pos}:${v.ref}-${v.alt}`)
          .sort()
          .join(';'),
      },
      below_threshold: { variants: filteredBelow, readable_id: '' },
      samples: g.samples.map((s) => ({
        ...s,
        variant_sets: s.variant_sets.map((vs) => ({
          ...vs,
          variants: vs.variants.filter((v) => v.freq.af >= minAf),
        })),
      })),
    }
  })

  // Recompute consensus variants for clusters using only the display-filtered variants
  const clusters = data.clusters?.map((c) => {
    const groupByHash = new Map<string, (typeof groups)[number]>()
    for (const g of groups) groupByHash.set(String(g.hash), g)

    const memberGroups = c.member_group_hashes
      .map((h) => groupByHash.get(h))
      .filter((g): g is (typeof groups)[number] => g != null)

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

  return { groups, clusters, tree_json: data.tree_json }
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
  const maxAN = Math.max(...variants.map((v) => v.freq.an))
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
  if (regionSize < 50_000) return 0.0
  if (regionSize > 1_000_000) return 0.70
  const t = (regionSize - 50_000) / (1_000_000 - 50_000)
  return 0.35 + t * 0.30
}

// ---- Joint auto-derivation of min AF + cluster threshold ----

const TARGET_MIN = 15
const TARGET_MAX = 40
const MAX_GROUPS_FOR_UPGMA = 150

export function deriveAutoDefaults(
  variants: LRVariant[],
  carrierVariantIndices: Record<string, number[]>,
  regionSize: number,
  trvAlts?: Record<string, Record<number, string>>
): AutoDefaults {
  if (variants.length === 0) {
    return { floor: 0, ceiling: 1, defaultAf: 0, defaultClusterThreshold: 0, isClusteredView: false }
  }

  // Compute floor and ceiling (same as deriveSliderRange)
  const maxAN = Math.max(...variants.map((v) => v.freq.an))
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

  // Joint iterative derivation
  let minAf = floor
  let clusterThreshold = baseClusterThreshold
  let bestRowCount = 0

  for (let iter = 0; iter < 10; iter++) {
    const groups = groupCarriers(variants, carrierVariantIndices, minAf, trvAlts)
    const N = groups.length

    // Too many groups for UPGMA — raise AF to reduce
    if (N > MAX_GROUPS_FOR_UPGMA) {
      minAf = Math.pow(10, (Math.log10(minAf) + Math.log10(ceiling)) / 2)
      continue
    }

    if (N < 2) {
      // Too few groups even at floor — return what we have
      bestRowCount = N
      break
    }

    const distMatrix = computeSVDistanceMatrix(groups)
    const { tree } = buildUPGMATree(distMatrix, groups)
    const clusterNodes = getClustersAtThreshold(tree, clusterThreshold)
    const M = clusterNodes.length
    bestRowCount = M

    if (M >= TARGET_MIN && M <= TARGET_MAX) {
      break // success
    }

    if (M > TARGET_MAX) {
      // Too many clusters — increase threshold to merge more
      clusterThreshold = Math.min(1.0, clusterThreshold + 0.05)
      if (clusterThreshold >= 0.95) {
        // Threshold maxed out, raise AF too
        minAf = Math.pow(10, (Math.log10(minAf) + Math.log10(ceiling)) / 2)
      }
    } else {
      // Too few clusters — decrease AF to get more differentiated groups
      const newAf = Math.pow(10, (Math.log10(floor) + Math.log10(minAf)) / 2)
      if (Math.abs(newAf - minAf) < 1e-6) {
        // AF can't go lower, try decreasing cluster threshold
        clusterThreshold = Math.max(0, clusterThreshold - 0.05)
        if (clusterThreshold <= 0.05) break // nothing more we can do
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
