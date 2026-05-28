/**
 * Backend UPGMA tree construction for haplotype clustering.
 *
 * Builds a UPGMA tree from SV-only Jaccard distances between haplotype groups.
 * Tree cutting and cluster computation are done client-side
 * (browser/src/Haplotypes/haplotypeCompute.ts).
 */

import type { LRVariant } from './haplotype-grouping'

export type TreeNode = {
  left: TreeNode | null
  right: TreeNode | null
  distance: number
  groupHash: string | null
  size: number
}

/**
 * Check whether a variant qualifies as a structural variant for clustering purposes.
 */
const isSV = (v: LRVariant): boolean =>
  Math.abs(v.allele_length) >= 50 || v.allele_type === 'trv'

/**
 * Compute pairwise Jaccard distance matrix between haplotype groups,
 * considering only SV variants (abs(allele_length) >= 50 or allele_type === 'trv').
 *
 * Jaccard distance: J(A,B) = 1 - |A ∩ B| / |A ∪ B|
 * If both sets are empty, distance is 0.
 */
export const computeSVDistanceMatrix = (groups: any[]): number[][] => {
  // Extract sets of variant_id for SVs only
  const variantSets = groups.map(
    (g) => new Set(
      g.variants.variants
        .filter((v: LRVariant) => isSV(v))
        .map((v: LRVariant) => v.variant_id)
    )
  )

  const n = groups.length
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const setI = variantSets[i]
      const setJ = variantSets[j]

      // Compute intersection size
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

/**
 * Build a UPGMA tree from a distance matrix.
 * Returns the root tree node and a leafOrder array of group hashes
 * (in-order traversal for dendrogram row sorting).
 *
 * Ported from browser/src/Haplotypes/genealogy-math.ts, adapted to use
 * string group hashes.
 */
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
      left: null,
      right: null,
      distance: 0,
      groupHash: groups[0].hash,
      size: 1,
    }
    return { tree: leaf, leafOrder: [groups[0].hash] }
  }

  // Initialize clusters: each leaf is its own cluster
  let clusters: TreeNode[] = groups.map((g) => ({
    left: null,
    right: null,
    distance: 0,
    groupHash: g.hash,
    size: 1,
  }))

  // Copy distance matrix (we'll modify it during merging)
  let dist: number[][] = distanceMatrix.map((row) => [...row])
  // Track cluster sizes for UPGMA averaging
  let sizes: number[] = new Array(n).fill(1)
  // Active indices
  let active: number[] = Array.from({ length: n }, (_, i) => i)

  while (active.length > 1) {
    // Find the two closest active clusters
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

    // Merge clusters i and j
    const merged: TreeNode = {
      left: clusters[idxI],
      right: clusters[idxJ],
      distance: minDist,
      groupHash: null,
      size: clusters[idxI].size + clusters[idxJ].size,
    }

    // Update distances: UPGMA weighted average
    const sI = sizes[idxI]
    const sJ = sizes[idxJ]
    for (const k of active) {
      if (k === idxI || k === idxJ) continue
      dist[idxI][k] = (dist[idxI][k] * sI + dist[idxJ][k] * sJ) / (sI + sJ)
      dist[k][idxI] = dist[idxI][k]
    }

    sizes[idxI] = sI + sJ
    clusters[idxI] = merged

    // Remove j from active
    active.splice(minJ, 1)
  }

  const tree = clusters[active[0]]

  // In-order traversal to get leaf order
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

// getClustersAtThreshold and getLeafGroupHashes have been consolidated
// to the frontend (browser/src/Haplotypes/haplotypeCompute.ts).
// Tree cutting and cluster computation are now done client-side.
