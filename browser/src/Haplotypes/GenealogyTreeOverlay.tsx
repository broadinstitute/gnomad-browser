import React from 'react'
import { scaleLinear } from 'd3-scale'
import { TooltipAnchor } from '@gnomad/ui'
import { SUPERPOPULATION_COLORS } from './colors'
import type { TreeNode } from './genealogy-math'
import type { HaplotypeGroup } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

type Props = {
  tree: TreeNode
  leafYPositions: Map<number, number>
  panelWidth: number
  totalHeight: number
  groups: HaplotypeGroup[]
  sampleMetadata?: SampleMetadataMap
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

const GenealogyTreeOverlay = ({
  tree,
  leafYPositions,
  panelWidth,
  totalHeight,
  groups,
  sampleMetadata,
}: Props) => {
  // Build a hash->group lookup
  const groupByHash = new Map<number, HaplotypeGroup>()
  for (const g of groups) {
    groupByHash.set(g.hash, g)
  }

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
  // Leave padding for leaf circles and root
  const xPad = 20
  const xScale = scaleLinear()
    .domain([0, maxDistance])
    .range([xPad, panelWidth - xPad])

  const elements: React.ReactNode[] = []

  // Recursive draw: returns the y center of the subtree
  const drawNode = (node: TreeNode, depth: number): number => {
    if (node.groupHash !== null) {
      // Leaf node
      const y = leafYPositions.get(node.groupHash)
      if (y === undefined) return 0
      const x = xPad // leaves at left edge

      const group = groupByHash.get(node.groupHash)
      const pop = group ? getDominantPopulation(group, sampleMetadata) : 'N/A'
      const color = SUPERPOPULATION_COLORS[pop] || SUPERPOPULATION_COLORS['N/A']

      elements.push(
        <circle
          key={`leaf-${node.groupHash}`}
          cx={x}
          cy={y}
          r={3}
          fill={color}
          stroke="#333"
          strokeWidth={0.5}
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

    // Ensure merge point is to the right of both children
    const effectiveMergeX = Math.max(mergeX, leftChildX + MIN_BRANCH_PX, rightChildX + MIN_BRANCH_PX)

    // Horizontal lines from children to merge x
    elements.push(
      <line
        key={`h-left-${depth}-${leftY}`}
        x1={leftChildX}
        y1={leftY}
        x2={effectiveMergeX}
        y2={leftY}
        stroke="#888"
        strokeWidth={1}
      />
    )
    elements.push(
      <line
        key={`h-right-${depth}-${rightY}`}
        x1={rightChildX}
        y1={rightY}
        x2={effectiveMergeX}
        y2={rightY}
        stroke="#888"
        strokeWidth={1}
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
        stroke="#888"
        strokeWidth={1}
      />
    )

    // Tooltip on the merge node
    const midY = (leftY + rightY) / 2
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
          fill="#888"
          stroke="none"
          style={{ cursor: 'pointer' }}
        />
      </TooltipAnchor>
    )

    return midY
  }

  drawNode(tree, 0)

  return (
    <svg
      width={panelWidth}
      height={totalHeight}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        pointerEvents: 'all',
      }}
    >
      {elements}
    </svg>
  )
}

export default GenealogyTreeOverlay
