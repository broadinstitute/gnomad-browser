import { scaleLinear } from 'd3-scale'
import { longReadAncestryGroupDisplayId } from '../LongReadVariantPage/longReadAncestryGroups'
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

export type TreePieSlice = {
  population: string
  count: number
  fraction: number
  color: [number, number, number, number]
}

export type TreeNodePoint = {
  position: [number, number, number]
  radius: number
  color: [number, number, number, number]
  slices: TreePieSlice[]
  sampleCount: number
  isThresholdNode: boolean
  distance: number
  type: 'tree-node'
  tooltipText: string
}

export type TreePieWedge = {
  polygon: [number, number, number][]
  color: [number, number, number, number]
  node: TreeNodePoint
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
  pieWedges: TreePieWedge[]
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

const SUPERPOPULATION_ORDER = ['AFR', 'AMR', 'EAS', 'EUR', 'SAS', 'ASJ', 'RMI', 'OTH', 'N/A']

function normalizeSuperpopulation(population: string | null | undefined): string {
  return population && SUPERPOPULATION_COLORS[population] ? population : 'N/A'
}

function getDominantFromCounts(counts: Record<string, number>): string {
  return SUPERPOPULATION_ORDER.reduce(
    (dominant, population) => (counts[population] || 0) > (counts[dominant] || 0) ? population : dominant,
    'N/A'
  )
}

export function ancestrySlicesFromCounts(
  counts: Record<string, number>,
  alpha = 255
): TreePieSlice[] {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  if (total === 0) {
    return [{ population: 'N/A', count: 0, fraction: 1, color: hexToRgba(SUPERPOPULATION_COLORS['N/A'], alpha) }]
  }
  return SUPERPOPULATION_ORDER
    .filter(population => (counts[population] || 0) > 0)
    .map(population => ({
      population,
      count: counts[population],
      fraction: counts[population] / total,
      color: hexToRgba(SUPERPOPULATION_COLORS[population], alpha),
    }))
}

function ancestryTooltip(counts: Record<string, number>): string {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  const details = ancestrySlicesFromCounts(counts)
    .filter(slice => slice.count > 0)
    .map(slice => `${slice.population === 'N/A' ? 'Unknown/unavailable' : longReadAncestryGroupDisplayId(slice.population)}: ${slice.count} (${(slice.fraction * 100).toFixed(1)}%)`)
    .join('; ')
  return total > 0
    ? `Ancestry of ${total} represented sample${total === 1 ? '' : 's'} — ${details}`
    : 'Ancestry unavailable — no represented sample metadata'
}

export function buildTreePieWedges(nodes: TreeNodePoint[]): TreePieWedge[] {
  return nodes.flatMap(node => node.slices.reduce(
    (result, slice) => {
      const endAngle = result.startAngle + slice.fraction * Math.PI * 2
      // Keep compact nodes smooth without multiplying geometry in dense trees.
      const steps = Math.max(2, Math.ceil(slice.fraction * 16))
      const arc = Array.from({ length: steps + 1 }, (_, step) => {
        const angle = result.startAngle + (endAngle - result.startAngle) * step / steps
        return [
          node.position[0] + Math.cos(angle) * node.radius,
          node.position[1] + Math.sin(angle) * node.radius,
          node.position[2],
        ] as [number, number, number]
      })
      return {
        startAngle: endAngle,
        wedges: [...result.wedges, { polygon: [node.position, ...arc], color: slice.color, node }],
      }
    },
    { startAngle: -Math.PI / 2, wedges: [] as TreePieWedge[] }
  ).wedges)
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

  // Build lookups. Every represented sample contributes one count; absent or
  // unrecognized metadata is retained as N/A rather than silently omitted.
  const groupByHash = new Map<number, HaplotypeGroup>(groups.map(group => [group.hash, group]))
  const countsForGroup = (group: HaplotypeGroup | undefined): Record<string, number> => (
    (group?.samples || []).reduce((counts, sample) => {
      const population = normalizeSuperpopulation(sampleMetadata?.get(sample.sample_id)?.superpopulation)
      return { ...counts, [population]: (counts[population] || 0) + 1 }
    }, {} as Record<string, number>)
  )

  // Cluster LCA map
  const clusterLCAMap = new Map<string, TreeNode>()
  const nodeToClusterId = new Map<TreeNode, string>()
  if (clusters && isClusteredView) {
    clusters.forEach(cluster => {
      const hashes = new Set(cluster.member_group_hashes.map((h) => parseInt(String(h), 10)))
      const lca = findLCA(tree, hashes)
      if (lca) {
        clusterLCAMap.set(cluster.cluster_id, lca)
        nodeToClusterId.set(lca, cluster.cluster_id)
      }
    })
  }

  const maxDistance = Math.max(1, getMaxDistance(tree))
  const xPad = 20
  const xScale = scaleLinear()
    .domain([0, maxDistance])
    .range([xPad, panelWidth - xPad])

  const scaledThreshold = clusterThreshold * maxDistance

  // Recursive traversal — returns { y, popCounts } for population aggregation
  type DrawResult = { y: number; popCounts: Record<string, number> }

  const drawNode = (node: TreeNode, depth: number): DrawResult => {
    const clusterId = isClusteredView ? nodeToClusterId.get(node) : undefined
    const isClusterRoot = clusterId !== undefined
    const isExpanded = isClusterRoot && expandedClusterIds?.has(clusterId!)

    // Collapsed cluster node
    if (isClusterRoot && !isExpanded) {
      const clusterY = rowYPositions?.get(clusterId!)
      if (clusterY === undefined) return { y: 0, popCounts: {} }

      const x = Math.max(xScale(node.distance), xPad + MIN_BRANCH_PX)
      const cluster = clusters?.find(c => c.cluster_id === clusterId)
      const memberCount = cluster?.member_group_hashes.length || 0

      // Aggregate population for cluster marker color
      const popCounts = (cluster?.member_group_hashes || []).reduce((counts, h) => {
        const hash = typeof h === 'string' ? (parseInt(h, 10) || 0) : h
        const groupCounts = countsForGroup(groupByHash.get(hash))
        return Object.entries(groupCounts).reduce(
          (merged, [population, count]) => ({ ...merged, [population]: (merged[population] || 0) + count }),
          counts
        )
      }, {} as Record<string, number>)
      const dominantPop = getDominantFromCounts(popCounts)
      const clusterColor = hexToRgba(SUPERPOPULATION_COLORS[dominantPop] || SUPERPOPULATION_COLORS['N/A'], 204)

      clusterMarkers.push({
        position: [x, clusterY, 0],
        text: '\u25B6',
        color: clusterColor,
        size: 12,
        isClusterRoot: true,
        clusterId: clusterId!,
        type: 'cluster-node',
        tooltipText: `Click to expand cluster (${memberCount} groups). ${ancestryTooltip(popCounts)}`,
      })
      return { y: clusterY, popCounts }
    }

    // Leaf node
    if (node.groupHash !== null) {
      const y = leafYPositions.get(node.groupHash)
      if (y === undefined) return { y: 0, popCounts: {} }
      const x = xPad

      const group = groupByHash.get(node.groupHash)
      const popCounts = countsForGroup(group)
      const pop = getDominantFromCounts(popCounts)
      const colorHex = SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A']
      const color = hexToRgba(colorHex)

      const isBelowThreshold = isClusteredView && node.distance <= scaledThreshold
      if (isBelowThreshold) {
        color[3] = 102 // ~40% opacity
      }

      const sampleCount = Object.values(popCounts).reduce((sum, count) => sum + count, 0)
      nodes.push({
        position: [x, y, 0],
        radius: 5,
        color,
        slices: ancestrySlicesFromCounts(popCounts, color[3]),
        sampleCount,
        isThresholdNode: false,
        distance: node.distance,
        type: 'tree-node',
        tooltipText: `Group ${node.groupHash}. ${ancestryTooltip(popCounts)}`,
      })
      return { y, popCounts }
    }

    // Internal node
    const leftResult = node.left ? drawNode(node.left, depth + 1) : { y: 0, popCounts: {} }
    const rightResult = node.right ? drawNode(node.right, depth + 1) : { y: 0, popCounts: {} }
    const leftY = leftResult.y
    const rightY = rightResult.y

    // Merge population counts from children
    const popCounts = Object.entries(rightResult.popCounts).reduce(
      (counts, [population, count]) => ({ ...counts, [population]: (counts[population] || 0) + count }),
      { ...leftResult.popCounts }
    )

    const mergeX = Math.max(xScale(node.distance), (node.left ? xPad : 0) + MIN_BRANCH_PX)

    const childX = (child: TreeNode | null): number => {
      if (!child) return mergeX
      return child.groupHash !== null
        ? xPad
        : Math.max(xScale(child.distance), xPad + MIN_BRANCH_PX)
    }
    const leftChildX = childX(node.left)
    const rightChildX = childX(node.right)

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

    // Merge node — colored by dominant population of descendants
    const midY = (leftY + rightY) / 2
    const isAboveThreshold = node.distance > scaledThreshold
    const dominantPop = getDominantFromCounts(popCounts)
    const popColor = hexToRgba(SUPERPOPULATION_COLORS[dominantPop] || SUPERPOPULATION_COLORS['N/A'])

    if (isAboveThreshold && isClusteredView) {
      const sampleCount = Object.values(popCounts).reduce((sum, count) => sum + count, 0)
      nodes.push({
        position: [effectiveMergeX, midY, 0],
        radius: 5,
        color: popColor,
        slices: ancestrySlicesFromCounts(popCounts),
        sampleCount,
        isThresholdNode: true,
        distance: node.distance,
        type: 'tree-node',
        tooltipText: `Distance: ${Math.round(node.distance * 100) / 100} — click to set cluster threshold. ${ancestryTooltip(popCounts)}`,
      })
    } else {
      const nodeColor: [number, number, number, number] = isBelowThreshold
        ? [popColor[0], popColor[1], popColor[2], 128]
        : popColor
      const sampleCount = Object.values(popCounts).reduce((sum, count) => sum + count, 0)
      nodes.push({
        position: [effectiveMergeX, midY, 0],
        radius: 4,
        color: nodeColor,
        slices: ancestrySlicesFromCounts(popCounts, nodeColor[3]),
        sampleCount,
        isThresholdNode: false,
        distance: node.distance,
        type: 'tree-node',
        tooltipText: `Separated by ${Math.round(node.distance)} variant${Math.round(node.distance) !== 1 ? 's' : ''}. ${ancestryTooltip(popCounts)}`,
      })
    }

    return { y: midY, popCounts }
  }

  drawNode(tree, 0)

  const thresholdX = isClusteredView && clusterThreshold > 0
    ? xScale(clusterThreshold * maxDistance)
    : null

  return { branches, nodes, pieWedges: buildTreePieWedges(nodes), clusterMarkers, thresholdX, maxDistance, xScale }
}
