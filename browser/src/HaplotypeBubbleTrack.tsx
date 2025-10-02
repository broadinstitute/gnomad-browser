import React, { useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { line, curveBumpX } from 'd3-shape'

type NodeID = string

type GraphNode = {
  id: NodeID
  position: number
  sequence: string
  copyNumber?: number
  next: NodeID[]
}

type HaplotypePath = {
  id: string
  nodes: NodeID[] // order matters
}

type HaplotypeGraph = {
  nodes: Map<NodeID, GraphNode>
  paths: HaplotypePath[]
}

const getMaxPosition = (graph: HaplotypeGraph): number => {
  let max = -Infinity
  graph.nodes.forEach((node: GraphNode) => {
    if (node.position > max) max = node.position
  })
  return max
}

const getMinPosition = (graph: HaplotypeGraph): number => {
  let min = Infinity
  graph.nodes.forEach((node: GraphNode) => {
    if (node.position < min) min = node.position
  })
  return min
}

const getMaxWidth = (graph: HaplotypeGraph): number => {
  const nodesByPosition: Map<number, GraphNode[]> = new Map()
  graph.nodes.forEach((node: GraphNode) => {
    if (!nodesByPosition.has(node.position)) {
      nodesByPosition.set(node.position, [])
    }
    nodesByPosition.get(node.position)!.push(node)
  })

  let maxWidth = 0
  nodesByPosition.forEach((nodes: GraphNode[]) => {
    if (nodes.length > maxWidth) maxWidth = nodes.length
  })
  return maxWidth
}

const createTestGraph = (): HaplotypeGraph => {
  const nodes = new Map<NodeID, GraphNode>()

  const addNode = (
    id: NodeID,
    position: number,
    sequence: string,
    copyNumber: number,
    next: string[] = []
  ): void => {
    nodes.set(id, { id, position, sequence, copyNumber, next })
  }

  // Linear start section
  addNode('n0', 0, 'A', 0, ['n1'])
  addNode('n1', 1, 'G', 1, ['n2'])
  addNode('n2', 2, 'C', 2, ['b1_start'])

  // Bubble 1 - 2 paths
  addNode('b1_start', 3, 'T', 1, ['b1_top1', 'b1_bot1'])
  addNode('b1_top1', 4, 'A', 1, ['b1_top2'])
  addNode('b1_top2', 5, 'G', 2, ['b1_top3'])
  addNode('b1_top3', 6, 'C', 1, ['b1_end'])
  addNode('b1_bot1', 4, 'T', 0, ['b1_bot2'])
  addNode('b1_bot2', 5, 'T', 1, ['b1_bot3'])
  addNode('b1_bot3', 6, 'A', 2, ['b1_end'])
  addNode('b1_end', 7, 'G', 1, ['n8'])

  // Connecting nodes
  addNode('n8', 8, 'T', 0, ['n9'])
  addNode('n9', 9, 'C', 1, ['b2_start'])

  // Bubble 2 - 3 paths with nested bubble in top path
  addNode('b2_start', 10, 'A', 2, ['b2_top1', 'b2_mid1', 'b2_bot1'])
  // Top path with nested bubble
  addNode('b2_top1', 11, 'G', 1, ['b2_top_nest_start'])
  addNode('b2_top_nest_start', 12, 'C', 0, ['b2_top_nest_a', 'b2_top_nest_b'])
  addNode('b2_top_nest_a', 13, 'T', 1, ['b2_top_nest_end'])
  addNode('b2_top_nest_b', 13, 'A', 2, ['b2_top_nest_end'])
  addNode('b2_top_nest_end', 14, 'G', 1, ['b2_top2'])
  addNode('b2_top2', 15, 'C', 2, ['b2_end'])
  // Middle path
  addNode('b2_mid1', 11, 'T', 0, ['b2_mid2'])
  addNode('b2_mid2', 13, 'A', 1, ['b2_mid3'])
  addNode('b2_mid3', 15, 'G', 2, ['b2_end'])
  // Bottom path
  addNode('b2_bot1', 11, 'C', 2, ['b2_bot2'])
  addNode('b2_bot2', 13, 'G', 1, ['b2_bot3'])
  addNode('b2_bot3', 15, 'T', 0, ['b2_end'])
  addNode('b2_end', 16, 'A', 1, ['n17'])

  // Connecting section
  addNode('n17', 17, 'T', 1, ['n18'])
  addNode('n18', 18, 'A', 2, ['b3_start'])

  // Bubble 3 - 3 paths
  addNode('b3_start', 19, 'C', 1, ['b3_top1', 'b3_mid1', 'b3_bot1'])
  addNode('b3_top1', 20, 'G', 2, ['b3_top2'])
  addNode('b3_top2', 21, 'T', 1, ['b3_top3'])
  addNode('b3_top3', 22, 'A', 2, ['b3_end'])
  addNode('b3_mid1', 20, 'A', 1, ['b3_mid2'])
  addNode('b3_mid2', 21, 'C', 0, ['b3_mid3'])
  addNode('b3_mid3', 22, 'G', 1, ['b3_end'])
  addNode('b3_bot1', 20, 'T', 0, ['b3_bot2'])
  addNode('b3_bot2', 21, 'G', 2, ['b3_bot3'])
  addNode('b3_bot3', 22, 'C', 1, ['b3_end'])
  addNode('b3_end', 23, 'T', 2, ['n24'])

  // End section
  addNode('n24', 24, 'C', 2, ['n25'])
  addNode('n25', 25, 'G', 1, [])

  const paths: HaplotypePath[] = [
    {
      id: 'haplotype1',
      nodes: [
        'n0',
        'n1',
        'n2',
        'b1_start',
        'b1_top1',
        'b1_top2',
        'b1_top3',
        'b1_end',
        'n8',
        'n9',
        'b2_start',
        'b2_top1',
        'b2_top_nest_start',
        'b2_top_nest_a',
        'b2_top_nest_end',
        'b2_top2',
        'b2_end',
        'n17',
        'n18',
        'b3_start',
        'b3_top1',
        'b3_top2',
        'b3_top3',
        'b3_end',
        'n24',
        'n25',
      ],
    },
    {
      id: 'haplotype2',
      nodes: [
        'n0',
        'n1',
        'n2',
        'b1_start',
        'b1_top1',
        'b1_top2',
        'b1_top3',
        'b1_end',
        'n8',
        'n9',
        'b2_start',
        'b2_top1',
        'b2_top_nest_start',
        'b2_top_nest_b',
        'b2_top_nest_end',
        'b2_top2',
        'b2_end',
        'n17',
        'n18',
        'b3_start',
        'b3_mid1',
        'b3_mid2',
        'b3_mid3',
        'b3_end',
        'n24',
        'n25',
      ],
    },
    {
      id: 'haplotype3',
      nodes: [
        'n0',
        'n1',
        'n2',
        'b1_start',
        'b1_bot1',
        'b1_bot2',
        'b1_bot3',
        'b1_end',
        'n8',
        'n9',
        'b2_start',
        'b2_mid1',
        'b2_mid2',
        'b2_mid3',
        'b2_end',
        'n17',
        'n18',
        'b3_start',
        'b3_mid1',
        'b3_mid2',
        'b3_mid3',
        'b3_end',
        'n24',
        'n25',
      ],
    },
    {
      id: 'haplotype4',
      nodes: [
        'n0',
        'n1',
        'n2',
        'b1_start',
        'b1_bot1',
        'b1_bot2',
        'b1_bot3',
        'b1_end',
        'n8',
        'n9',
        'b2_start',
        'b2_bot1',
        'b2_bot2',
        'b2_bot3',
        'b2_end',
        'n17',
        'n18',
        'b3_start',
        'b3_bot1',
        'b3_bot2',
        'b3_bot3',
        'b3_end',
        'n24',
        'n25',
      ],
    },
  ]

  return { nodes, paths }
}

const TEST_GRAPH: HaplotypeGraph = createTestGraph()

const COPY_NUMBER_COLORS: any = {
  0: '#8B4513',
  1: '#FFA500',
  2: '#FFFFFF',
}

const PATH_COLORS: any = {
  haplotype1: '#4A90E2',
  haplotype2: '#E24A90',
  haplotype3: '#50C878',
  haplotype4: '#9B59B6',
}

const HaplotypeBubblePlot = ({ graph, width = 900 }: any) => {
  const [hoveredNode, setHoveredNode] = useState<NodeID | null>(null)
  const [hoveredPath, setHoveredPath] = useState<NodeID | null>(null)

  const minPos: number = getMinPosition(graph)
  const maxPos: number = getMaxPosition(graph)
  const maxWidth: number = getMaxWidth(graph)

  const trackHeight: number = 50
  const margin: any = { top: 60, right: 20, bottom: 40, left: 20 }
  const height: number = margin.top + margin.bottom + maxWidth * trackHeight
  const plotWidth: number = width - margin.left - margin.right
  const plotHeight: number = height - margin.top - margin.bottom

  const xScale: any = scaleLinear().domain([minPos, maxPos]).range([0, plotWidth])

  const nodeYPositions: Map<string, number> = new Map()

  graph.paths.forEach((path: HaplotypePath, pathIdx: number) => {
    const y: number = trackHeight * (pathIdx + 0.5)
    path.nodes.forEach((nodeId: string) => {
      if (!nodeYPositions.has(nodeId)) {
        nodeYPositions.set(nodeId, y)
      } else {
        // if on multiple tracks, average y position to render it between them
        const currentY: number = nodeYPositions.get(nodeId)!
        nodeYPositions.set(nodeId, (currentY + y) / 2)
      }
    })
  })

  const nodeRadius: number = 8

  const curvedLine: any = line()
    .curve(curveBumpX)
    .x((d: any) => d.x)
    .y((d: any) => d.y)

  return (
    <div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
        Graph stats: {graph.nodes.size} nodes | Max width: {maxWidth} | Positions: {minPos}-{maxPos}
      </div>
      <svg width={width} height={height}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Legend - Copy Number */}
          <g transform="translate(0, -45)">
            <text fontSize={12} fontWeight="bold">
              k-mer copy number
            </text>
            {[0, 1, 2].map((cn: number, i: number) => (
              <g key={cn} transform={`translate(${i * 30 + 140}, 0)`}>
                <circle
                  cx={0}
                  cy={0}
                  r={6}
                  fill={COPY_NUMBER_COLORS[cn]}
                  stroke="#333"
                  strokeWidth={1}
                />
                <text x={10} y={0} dy="0.3em" fontSize={12}>
                  {cn}
                </text>
              </g>
            ))}
          </g>

          {/* Legend - Paths */}
          <g transform="translate(350, -45)">
            <text fontSize={12} fontWeight="bold">
              Paths
            </text>
            {graph.paths.map((path: HaplotypePath, i: number) => (
              <g
                key={path.id}
                transform={`translate(${i * 100 + 50}, 0)`}
                onMouseEnter={() => setHoveredPath(path.id)}
                onMouseLeave={() => setHoveredPath(null)}
                style={{ cursor: 'pointer' }}
              >
                <line
                  x1={0}
                  y1={0}
                  x2={20}
                  y2={0}
                  stroke={PATH_COLORS[path.id] || '#666'}
                  strokeWidth={hoveredPath === path.id ? 3 : 2}
                />
                <text x={25} y={0} dy="0.3em" fontSize={11}>
                  {path.id}
                </text>
              </g>
            ))}
          </g>

          {/* Draw paths */}
          {graph.paths.map((path: HaplotypePath) => {
            const points: any[] = path.nodes
              .map((nodeId: string) => {
                const node: GraphNode | undefined = graph.nodes.get(nodeId)
                const y: number | undefined = nodeYPositions.get(nodeId)
                if (!node || y === undefined) return null
                return {
                  x: xScale(node.position),
                  y: y,
                }
              })
              .filter((p: any) => p !== null)

            const isHighlighted: boolean = hoveredPath === path.id

            return (
              <path
                key={path.id}
                d={curvedLine(points) || ''}
                fill="none"
                stroke={PATH_COLORS[path.id] || '#666'}
                strokeWidth={isHighlighted ? 3 : 2}
                opacity={hoveredPath && !isHighlighted ? 0.2 : 0.7}
                onMouseEnter={() => setHoveredPath(path.id)}
                onMouseLeave={() => setHoveredPath(null)}
                style={{ cursor: 'pointer' }}
              />
            )
          })}

          {/* Draw nodes */}
          {Array.from(graph.nodes.values()).map((node: GraphNode) => {
            const y: number | undefined = nodeYPositions.get(node.id)
            if (y === undefined) return null

            const isHovered: boolean = hoveredNode === node.id

            return (
              <circle
                key={node.id}
                cx={xScale(node.position)}
                cy={y}
                r={isHovered ? nodeRadius * 1.3 : nodeRadius}
                fill={COPY_NUMBER_COLORS[node.copyNumber ?? 1] || '#999'}
                stroke="#333"
                strokeWidth={isHovered ? 2.5 : 1.5}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              />
            )
          })}

          {/* Position axis */}
          <line
            x1={0}
            y1={plotHeight + 10}
            x2={plotWidth}
            y2={plotHeight + 10}
            stroke="#333"
            strokeWidth={1}
          />
          {Array.from(new Set(Array.from(graph.nodes.values()).map((n: GraphNode) => n.position)))
            .sort((a: number, b: number) => a - b)
            .filter((_: number, i: number) => i % 2 === 0)
            .map((position: number) => (
              <g key={`axis-${position}`}>
                <line
                  x1={xScale(position)}
                  y1={plotHeight + 10}
                  x2={xScale(position)}
                  y2={plotHeight + 15}
                  stroke="#333"
                  strokeWidth={1}
                />
                <text x={xScale(position)} y={plotHeight + 25} textAnchor="middle" fontSize={10}>
                  {position}
                </text>
              </g>
            ))}
        </g>
      </svg>

      {hoveredNode && (
        <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'monospace' }}>
          <strong>Node:</strong> {hoveredNode} |<strong> Position:</strong>{' '}
          {graph.nodes.get(hoveredNode)?.position} |<strong> Sequence:</strong>{' '}
          {graph.nodes.get(hoveredNode)?.sequence} |<strong> Copy #:</strong>{' '}
          {graph.nodes.get(hoveredNode)?.copyNumber} |<strong> Next:</strong> [
          {graph.nodes.get(hoveredNode)?.next.join(', ')}]
        </div>
      )}
    </div>
  )
}

const Demo = () => {
  return (
    <div style={{ padding: 20 }}>
      <h2>Haplotype Bubble Visualization (Adjacency List)</h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
        Hover over paths or nodes to explore the graph structure
      </p>
      <HaplotypeBubblePlot graph={TEST_GRAPH} width={900} />
    </div>
  )
}

export default Demo
