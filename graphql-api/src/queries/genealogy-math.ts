/**
 * Backend UPGMA tree construction for haplotype clustering.
 *
 * Builds a UPGMA tree from SV-only Jaccard distances between haplotype groups.
 * Optimized: two-pointer Jaccard + SLINK-style min tracking for O(N²) average case.
 */

import type { LRVariant } from './haplotype-grouping'

export type TreeNode = {
  left: TreeNode | null
  right: TreeNode | null
  distance: number
  groupHash: string | null
  size: number
}

const isSV = (v: LRVariant): boolean =>
  Math.abs(v.allele_length) >= 50 || v.allele_type === 'trv'

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

type DistanceMetric = 'auto' | 'sv_only' | 'snv_only' | 'all'

const isSNV = (v: any): boolean => v.allele_type === 'snv'

export const computeSVDistanceMatrix = (groups: any[], distanceMetric: DistanceMetric = 'auto'): number[][] => {
  // Build sorted integer index arrays for SV variant_ids
  const allSVIds = new Map<string, number>()
  for (const g of groups) {
    for (const v of g.variants.variants) {
      if (isSV(v) && !allSVIds.has(v.variant_id)) {
        allSVIds.set(v.variant_id, allSVIds.size)
      }
    }
  }

  // Determine which variants to use based on distance metric
  const useMode: 'sv' | 'snv' | 'all' =
    distanceMetric === 'sv_only' ? 'sv'
    : distanceMetric === 'snv_only' ? 'snv'
    : distanceMetric === 'all' ? 'all'
    : allSVIds.size >= 5 ? 'sv' : 'all' // auto: SV-only when enough SVs, else all

  const filteredIds = new Map<string, number>()
  for (const g of groups) {
    for (const v of g.variants.variants) {
      if (useMode === 'sv' && !isSV(v)) continue
      if (useMode === 'snv' && !isSNV(v)) continue
      if (!filteredIds.has(v.variant_id)) {
        filteredIds.set(v.variant_id, filteredIds.size)
      }
    }
  }

  const varIndices: number[][] = groups.map((g) => {
    const indices: number[] = []
    for (const v of g.variants.variants) {
      const idx = filteredIds.get(v.variant_id)
      if (idx !== undefined) indices.push(idx)
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
  groups: any[]
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
      groupHash: groups[0].hash, size: 1,
    }
    return { tree: leaf, leafOrder: [groups[0].hash] }
  }

  const clusters: TreeNode[] = groups.map((g) => ({
    left: null, right: null, distance: 0,
    groupHash: g.hash, size: 1,
  }))

  const dist: number[][] = distanceMatrix.map((row) => [...row])
  const sizes: number[] = new Array(n).fill(1)
  const active: boolean[] = new Array(n).fill(true)

  // SLINK-style min tracking
  const rowMin: number[] = new Array(n).fill(Infinity)
  const rowMinIdx: number[] = new Array(n).fill(-1)

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

  let rootIdx = 0
  for (let i = 0; i < n; i++) {
    if (active[i]) { rootIdx = i; break }
  }
  const tree = clusters[rootIdx]

  // In-order traversal for leaf order
  const leafOrder: string[] = []
  const traverse = (node: TreeNode) => {
    if (node.groupHash !== null) {
      leafOrder.push(node.groupHash)
      return
    }
    if (node.left) traverse(node.left)
    if (node.right) traverse(node.right)
  }
  traverse(tree)

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
