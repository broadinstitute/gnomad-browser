import { scaleLinear } from 'd3-scale'
import { SUPERPOPULATION_COLORS } from './colors'
import type { TreeNode } from './genealogy-math'
import type { HaplotypeGroup, HaplotypeCluster } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

// --- Output types ---

export type TreeBranch = {
  sourcePosition: [number, number, number]
  targetPosition: [number, number, number]
  color: [number, number, number, number]
}

export type TreeNodePoint = {
  position: [number, number, number]
  radius: number
  color: [number, number, number, number]
  isThresholdNode: boolean
  distance: number
  type: 'tree-node'
  tooltipText: string
}

export type TreeClusterMarker = {
  position: [number, number, number]
  text: string
  color: [number, number, number, number]
  size: number
  isClusterRoot: true
  clusterId: string
  type: 'cluster-node'
  tooltipText: string
}

export type TreeLayout = {
  branches: TreeBranch[]
  nodes: TreeNodePoint[]
  clusterMarkers: TreeClusterMarker[]
  thresholdX: number | null
  maxDistance: number
  xScale: ReturnType<typeof scaleLinear<number, number>>
}

// --- Helpers ---

const MIN_BRANCH_PX = 10

function hexToRgba(hex: string, alpha = 255): [number, number, number, number] {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return [r, g, b, alpha]
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
      alpha,
    ]
  }
  return [128, 128, 128, alpha]
}

function getDominantPopulation(
  group: HaplotypeGroup,
  sampleMetadata?: SampleMetadataMap
): string {
  if (!sampleMetadata || sampleMetadata.size === 0) return 'N/A'
  const counts: Record<string, number> = {}
  for (const s of group.samples) {
    const meta = sampleMetadata.get(s.sample_id)
    const pop = meta?.superpopulation || 'N/A'
    counts[pop] = (counts[pop] || 0) + 1
  }
  let maxPop = 'N/A'
  let maxCount = 0
  for (const [pop, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      maxPop = pop
    }
  }
  return maxPop
}

function findLCA(node: TreeNode, targetHashes: Set<number>): TreeNode | null {
  if (node.groupHash !== null) {
    return targetHashes.has(node.groupHash) ? node : null
  }
  const leftResult = node.left ? findLCA(node.left, targetHashes) : null
  const rightResult = node.right ? findLCA(node.right, targetHashes) : null
  if (leftResult && rightResult) return node
  return leftResult || rightResult
}

function getMaxDistance(node: TreeNode): number {
  if (!node.left && !node.right) return 0
  return Math.max(
    node.distance,
    node.left ? getMaxDistance(node.left) : 0,
    node.right ? getMaxDistance(node.right) : 0
  )
}

// --- Main layout function ---

type BuildTreeLayoutProps = {
  tree: TreeNode
  leafYPositions: Map<number, number>
  panelWidth: number
  groups: HaplotypeGroup[]
  sampleMetadata?: SampleMetadataMap
  clusterThreshold: number
  isClusteredView: boolean
  clusters?: HaplotypeCluster[]
  expandedClusterIds?: Set<string>
  rowYPositions?: Map<string, number>
}

export function buildGenealogyTreeLayout(props: BuildTreeLayoutProps): TreeLayout {
  const {
    tree,
    leafYPositions,
    panelWidth,
    groups,
    sampleMetadata,
    clusterThreshold,
    isClusteredView,
    clusters,
    expandedClusterIds,
    rowYPositions,
  } = props

  const branches: TreeBranch[] = []
  const nodes: TreeNodePoint[] = []
  const clusterMarkers: TreeClusterMarker[] = []

  // Build lookups
  const groupByHash = new Map<number, HaplotypeGroup>()
  for (const g of groups) {
    groupByHash.set(g.hash, g)
  }

  // Cluster LCA map
  const clusterLCAMap = new Map<string, TreeNode>()
  const nodeToClusterId = new Map<TreeNode, string>()
  if (clusters && isClusteredView) {
    for (const cluster of clusters) {
      const hashes = new Set(cluster.member_group_hashes.map((h) => parseInt(String(h), 10)))
      const lca = findLCA(tree, hashes)
      if (lca) {
        clusterLCAMap.set(cluster.cluster_id, lca)
        nodeToClusterId.set(lca, cluster.cluster_id)
      }
    }
  }

  const maxDistance = Math.max(1, getMaxDistance(tree))
  const xPad = 20
  const xScale = scaleLinear()
    .domain([0, maxDistance])
    .range([xPad, panelWidth - xPad])

  const scaledThreshold = clusterThreshold * maxDistance

  // Recursive traversal
  const drawNode = (node: TreeNode, depth: number): number => {
    const clusterId = isClusteredView ? nodeToClusterId.get(node) : undefined
    const isClusterRoot = clusterId !== undefined
    const isExpanded = isClusterRoot && expandedClusterIds?.has(clusterId!)

    // Collapsed cluster node
    if (isClusterRoot && !isExpanded) {
      const clusterY = rowYPositions?.get(clusterId!)
      if (clusterY === undefined) return 0

      const x = Math.max(xScale(node.distance), xPad + MIN_BRANCH_PX)
      const memberCount = clusters?.find(c => c.cluster_id === clusterId)?.member_group_hashes.length || 0

      clusterMarkers.push({
        position: [x, clusterY, 0],
        text: '\u25B6',
        color: [74, 144, 217, 204], // #4a90d9 at 80% opacity
        size: 12,
        isClusterRoot: true,
        clusterId: clusterId!,
        type: 'cluster-node',
        tooltipText: `Click to expand cluster (${memberCount} groups)`,
      })
      return clusterY
    }

    // Leaf node
    if (node.groupHash !== null) {
      const y = leafYPositions.get(node.groupHash)
      if (y === undefined) return 0
      const x = xPad

      const group = groupByHash.get(node.groupHash)
      const pop = group ? getDominantPopulation(group, sampleMetadata) : 'N/A'
      const colorHex = SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A']
      const color = hexToRgba(colorHex)

      const isBelowThreshold = isClusteredView && node.distance <= scaledThreshold
      if (isBelowThreshold) {
        color[3] = 102 // ~40% opacity
      }

      nodes.push({
        position: [x, y, 0],
        radius: 3,
        color,
        isThresholdNode: false,
        distance: node.distance,
        type: 'tree-node',
        tooltipText: `Group ${node.groupHash}`,
      })
      return y
    }

    // Internal node
    const leftY = node.left ? drawNode(node.left, depth + 1) : 0
    const rightY = node.right ? drawNode(node.right, depth + 1) : 0

    const mergeX = Math.max(xScale(node.distance), (node.left ? xPad : 0) + MIN_BRANCH_PX)

    const leftChildX = node.left
      ? node.left.groupHash !== null
        ? xPad
        : Math.max(xScale(node.left.distance), xPad + MIN_BRANCH_PX)
      : mergeX
    const rightChildX = node.right
      ? node.right.groupHash !== null
        ? xPad
        : Math.max(xScale(node.right.distance), xPad + MIN_BRANCH_PX)
      : mergeX

    // Check for collapsed cluster children
    const leftClusterId = node.left ? nodeToClusterId.get(node.left) : undefined
    const leftIsCollapsedCluster = leftClusterId !== undefined && !expandedClusterIds?.has(leftClusterId)
    const rightClusterId = node.right ? nodeToClusterId.get(node.right) : undefined
    const rightIsCollapsedCluster = rightClusterId !== undefined && !expandedClusterIds?.has(rightClusterId)

    const effectiveLeftChildX = leftIsCollapsedCluster && node.left
      ? Math.max(xScale(node.left.distance), xPad + MIN_BRANCH_PX)
      : leftChildX
    const effectiveRightChildX = rightIsCollapsedCluster && node.right
      ? Math.max(xScale(node.right.distance), xPad + MIN_BRANCH_PX)
      : rightChildX

    const effectiveMergeX = Math.max(mergeX, effectiveLeftChildX + MIN_BRANCH_PX, effectiveRightChildX + MIN_BRANCH_PX)

    const isBelowThreshold = isClusteredView && node.distance <= scaledThreshold
    const branchColor: [number, number, number, number] = isBelowThreshold
      ? [204, 204, 204, 128] // #ccc at 50%
      : [136, 136, 136, 255] // #888

    // Horizontal branches
    branches.push({
      sourcePosition: [effectiveLeftChildX, leftY, 0],
      targetPosition: [effectiveMergeX, leftY, 0],
      color: branchColor,
    })
    branches.push({
      sourcePosition: [effectiveRightChildX, rightY, 0],
      targetPosition: [effectiveMergeX, rightY, 0],
      color: branchColor,
    })

    // Vertical connector
    branches.push({
      sourcePosition: [effectiveMergeX, leftY, 0],
      targetPosition: [effectiveMergeX, rightY, 0],
      color: branchColor,
    })

    // Merge node
    const midY = (leftY + rightY) / 2
    const isAboveThreshold = node.distance > scaledThreshold

    if (isAboveThreshold && isClusteredView) {
      nodes.push({
        position: [effectiveMergeX, midY, 0],
        radius: 3.5,
        color: [74, 144, 217, 255], // #4a90d9
        isThresholdNode: true,
        distance: node.distance,
        type: 'tree-node',
        tooltipText: `Distance: ${Math.round(node.distance * 100) / 100} — click to set cluster threshold`,
      })
    } else {
      nodes.push({
        position: [effectiveMergeX, midY, 0],
        radius: 2.5,
        color: isBelowThreshold ? [204, 204, 204, 128] : [136, 136, 136, 255],
        isThresholdNode: false,
        distance: node.distance,
        type: 'tree-node',
        tooltipText: `Separated by ${Math.round(node.distance)} variant${Math.round(node.distance) !== 1 ? 's' : ''}`,
      })
    }

    return midY
  }

  drawNode(tree, 0)

  const thresholdX = isClusteredView && clusterThreshold > 0
    ? xScale(clusterThreshold * maxDistance)
    : null

  return { branches, nodes, clusterMarkers, thresholdX, maxDistance, xScale }
}
