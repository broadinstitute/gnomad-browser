import React, { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import { TooltipAnchor } from '@gnomad/ui'
import { SUPERPOPULATION_COLORS } from './colors'
import type { TreeNode } from './genealogy-math'
import type { HaplotypeGroup, HaplotypeCluster } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

type Props = {
  tree: TreeNode
  leafYPositions: Map<number, number>
  panelWidth: number
  totalHeight: number
  groups: HaplotypeGroup[]
  sampleMetadata?: SampleMetadataMap
  // Interactive cluster props
  clusterThreshold?: number
  onClusterThresholdChange?: (threshold: number) => void
  expandedClusterIds?: Set<string>
  toggleClusterExpansion?: (clusterId: string) => void
  clusters?: HaplotypeCluster[]
  // Combined row Y positions: group hash -> y AND cluster_id -> y
  rowYPositions?: Map<string, number>
  isClusteredView?: boolean
}

const MIN_BRANCH_PX = 10

const getDominantPopulation = (
  group: HaplotypeGroup,
  sampleMetadata?: SampleMetadataMap
): string => {
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

/**
 * Find the Lowest Common Ancestor (LCA) of a set of leaf group hashes in the tree.
 * Returns null if none of the hashes are found.
 */
function findLCA(
  node: TreeNode,
  targetHashes: Set<number>
): TreeNode | null {
  if (node.groupHash !== null) {
    return targetHashes.has(node.groupHash) ? node : null
  }
  const leftResult = node.left ? findLCA(node.left, targetHashes) : null
  const rightResult = node.right ? findLCA(node.right, targetHashes) : null
  if (leftResult && rightResult) return node // this is the LCA
  return leftResult || rightResult
}

/**
 * Collect all leaf groupHashes under a subtree.
 */
function collectLeaves(node: TreeNode): number[] {
  if (node.groupHash !== null) return [node.groupHash]
  const left = node.left ? collectLeaves(node.left) : []
  const right = node.right ? collectLeaves(node.right) : []
  return [...left, ...right]
}

const GenealogyTreeOverlay = ({
  tree,
  leafYPositions,
  panelWidth,
  totalHeight,
  groups,
  sampleMetadata,
  clusterThreshold = 0,
  onClusterThresholdChange,
  expandedClusterIds,
  toggleClusterExpansion,
  clusters,
  rowYPositions,
  isClusteredView = false,
}: Props) => {
  // Build a hash->group lookup
  const groupByHash = new Map<number, HaplotypeGroup>()
  for (const g of groups) {
    groupByHash.set(g.hash, g)
  }

  // Build cluster LCA map: cluster_id -> LCA node in the tree
  const clusterLCAMap = useMemo(() => {
    const map = new Map<string, TreeNode>()
    if (!clusters || !isClusteredView) return map
    for (const cluster of clusters) {
      const hashes = new Set(cluster.member_group_hashes.map((h) => parseInt(h, 10)))
      const lca = findLCA(tree, hashes)
      if (lca) {
        map.set(cluster.cluster_id, lca)
      }
    }
    return map
  }, [tree, clusters, isClusteredView])

  // Reverse map: node reference -> cluster_id (for nodes that are cluster roots)
  const nodeToClusterId = useMemo(() => {
    const map = new Map<TreeNode, string>()
    for (const [clusterId, node] of clusterLCAMap) {
      map.set(node, clusterId)
    }
    return map
  }, [clusterLCAMap])

  // Find max distance in tree for x-scaling
  const getMaxDistance = (node: TreeNode): number => {
    if (!node.left && !node.right) return 0
    return Math.max(
      node.distance,
      node.left ? getMaxDistance(node.left) : 0,
      node.right ? getMaxDistance(node.right) : 0
    )
  }
  const maxDistance = Math.max(1, getMaxDistance(tree))

  // X scale: root on right, leaves on left
  const xPad = 20
  const xScale = scaleLinear()
    .domain([0, maxDistance])
    .range([xPad, panelWidth - xPad])

  // Convert 0-1 slider threshold to tree distance scale
  const scaledThreshold = clusterThreshold * maxDistance

  const elements: React.ReactNode[] = []

  // Recursive draw: returns the y center of the subtree
  const drawNode = (node: TreeNode, depth: number): number => {
    // Check if this node is a cluster root in clustered view
    const clusterId = isClusteredView ? nodeToClusterId.get(node) : undefined
    const isClusterRoot = clusterId !== undefined
    const isExpanded = isClusterRoot && expandedClusterIds?.has(clusterId!)

    // If cluster root and NOT expanded, render as terminal cluster node
    if (isClusterRoot && !isExpanded) {
      // Use rowYPositions for cluster Y position
      const clusterY = rowYPositions?.get(clusterId!)
      if (clusterY === undefined) return 0

      const x = Math.max(xScale(node.distance), xPad + MIN_BRANCH_PX)

      // Draw a triangle marker for collapsed cluster
      const triSize = 5
      elements.push(
        <g
          key={`cluster-node-${clusterId}`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            toggleClusterExpansion?.(clusterId!)
          }}
        >
          <TooltipAnchor
            tooltipComponent={() => (
              <span>Click to expand cluster ({clusters?.find(c => c.cluster_id === clusterId)?.member_group_hashes.length || 0} groups)</span>
            )}
          >
            <path
              d={`M ${x - triSize} ${clusterY - triSize} L ${x + triSize} ${clusterY} L ${x - triSize} ${clusterY + triSize} Z`}
              fill="#4a90d9"
              stroke="#333"
              strokeWidth={0.5}
              opacity={0.8}
            />
          </TooltipAnchor>
        </g>
      )
      return clusterY
    }

    // If cluster root and IS expanded, continue drawing children normally
    // but with muted styling below the threshold line

    if (node.groupHash !== null) {
      // Leaf node
      const y = leafYPositions.get(node.groupHash)
      if (y === undefined) return 0
      const x = xPad // leaves at left edge

      const group = groupByHash.get(node.groupHash)
      const pop = group ? getDominantPopulation(group, sampleMetadata) : 'N/A'
      const color = SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A']

      // Mute leaves that are below threshold (inside an expanded cluster)
      const isBelowThreshold = isClusteredView && node.distance <= scaledThreshold
      const opacity = isBelowThreshold ? 0.4 : 1

      elements.push(
        <circle
          key={`leaf-${node.groupHash}`}
          cx={x}
          cy={y}
          r={3}
          fill={color}
          stroke="#333"
          strokeWidth={0.5}
          opacity={opacity}
        />
      )
      return y
    }

    const leftY = node.left ? drawNode(node.left, depth + 1) : 0
    const rightY = node.right ? drawNode(node.right, depth + 1) : 0

    const mergeX = Math.max(
      xScale(node.distance),
      (node.left ? xPad : 0) + MIN_BRANCH_PX
    )

    // Horizontal branches from children to merge point
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

    // Check if left/right children are cluster roots (collapsed) — use their x position
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

    // Ensure merge point is to the right of both children
    const effectiveMergeX = Math.max(mergeX, effectiveLeftChildX + MIN_BRANCH_PX, effectiveRightChildX + MIN_BRANCH_PX)

    // Determine if branches are below threshold (muted)
    const isBelowThreshold = isClusteredView && node.distance <= scaledThreshold
    const branchColor = isBelowThreshold ? '#ccc' : '#888'
    const branchOpacity = isBelowThreshold ? 0.5 : 1

    // Horizontal lines from children to merge x
    elements.push(
      <line
        key={`h-left-${depth}-${leftY}`}
        x1={effectiveLeftChildX}
        y1={leftY}
        x2={effectiveMergeX}
        y2={leftY}
        stroke={branchColor}
        strokeWidth={1}
        opacity={branchOpacity}
      />
    )
    elements.push(
      <line
        key={`h-right-${depth}-${rightY}`}
        x1={effectiveRightChildX}
        y1={rightY}
        x2={effectiveMergeX}
        y2={rightY}
        stroke={branchColor}
        strokeWidth={1}
        opacity={branchOpacity}
      />
    )

    // Vertical connector
    elements.push(
      <line
        key={`v-${depth}-${leftY}-${rightY}`}
        x1={effectiveMergeX}
        y1={leftY}
        x2={effectiveMergeX}
        y2={rightY}
        stroke={branchColor}
        strokeWidth={1}
        opacity={branchOpacity}
      />
    )

    // Merge node: clickable to change threshold (for nodes above threshold) or tooltip
    const midY = (leftY + rightY) / 2
    const isAboveThreshold = node.distance > scaledThreshold

    if (isAboveThreshold && onClusterThresholdChange && isClusteredView) {
      // Clicking this node sets the global threshold to this distance
      elements.push(
        <TooltipAnchor
          key={`node-${depth}-${leftY}-${rightY}`}
          tooltipComponent={() => (
            <span>
              Distance: {Math.round(node.distance * 100) / 100} — click to set cluster threshold
            </span>
          )}
        >
          <circle
            cx={effectiveMergeX}
            cy={midY}
            r={3.5}
            fill="#4a90d9"
            stroke="#333"
            strokeWidth={0.5}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation()
              // Normalize: threshold is 0-1, so divide by maxDistance
              onClusterThresholdChange(node.distance / maxDistance)
            }}
          />
        </TooltipAnchor>
      )
    } else {
      // Standard tooltip-only node
      elements.push(
        <TooltipAnchor
          key={`node-${depth}-${leftY}-${rightY}`}
          tooltipComponent={() => (
            <span>Separated by {Math.round(node.distance)} variant{Math.round(node.distance) !== 1 ? 's' : ''}</span>
          )}
        >
          <circle
            cx={effectiveMergeX}
            cy={midY}
            r={2.5}
            fill={isBelowThreshold ? '#ccc' : '#888'}
            stroke="none"
            style={{ cursor: isClusteredView ? 'pointer' : 'default' }}
            opacity={isBelowThreshold ? 0.5 : 1}
          />
        </TooltipAnchor>
      )
    }

    return midY
  }

  drawNode(tree, 0)

  // Draw threshold cut-line if in clustered view
  const thresholdX = isClusteredView && clusterThreshold > 0
    ? xScale(clusterThreshold * maxDistance)
    : null

  return (
    <svg
      width={panelWidth}
      height={totalHeight}
      style={{
        pointerEvents: 'all',
      }}
    >
      {elements}
      {thresholdX !== null && (
        <line
          x1={thresholdX}
          y1={0}
          x2={thresholdX}
          y2={totalHeight}
          stroke="#d9534f"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          opacity={0.7}
          pointerEvents="none"
        />
      )}
    </svg>
  )
}

export default GenealogyTreeOverlay
