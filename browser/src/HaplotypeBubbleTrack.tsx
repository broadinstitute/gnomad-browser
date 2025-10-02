// import React, { useState } from 'react'
// import { scaleLinear } from 'd3-scale'

import React, { useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { line, curveBasis } from 'd3-shape'

// Test data structure
const TEST_DATA: any = {
  bubbles: [
    {
      id: 'bubble1',
      nodes: [
        { id: 'n0', position: 0, copyNumber: 0 },
        { id: 'n1', position: 1, copyNumber: 1 },
        { id: 'n2', position: 2, copyNumber: 2 },
        { id: 'n3', position: 3, copyNumber: 1 },
        { id: 'n4', position: 4, copyNumber: 2 },
        { id: 'n5', position: 5, copyNumber: 1 },
        { id: 'n6', position: 6, copyNumber: 0 },
        { id: 'n7', position: 7, copyNumber: 1 },
      ],
      paths: [
        { nodes: ['n0', 'n1', 'n2', 'n3', 'n6', 'n7'], track: 0 },
        { nodes: ['n0', 'n1', 'n4', 'n5', 'n6', 'n7'], track: 1 },
      ],
    },
    {
      id: 'bubble2',
      nodes: [
        { id: 'n8', position: 8, copyNumber: 1 },
        { id: 'n9', position: 9, copyNumber: 0 },
        { id: 'n10', position: 10, copyNumber: 2 },
        { id: 'n11', position: 11, copyNumber: 1 },
        { id: 'n12', position: 12, copyNumber: 0 },
        { id: 'n13', position: 13, copyNumber: 2 },
      ],
      paths: [
        { nodes: ['n8', 'n9', 'n10', 'n13'], track: 0 },
        { nodes: ['n8', 'n11', 'n12', 'n13'], track: 1 },
      ],
    },
    {
      id: 'bubble3',
      nodes: [
        { id: 'n14', position: 14, copyNumber: 1 },
        { id: 'n15', position: 15, copyNumber: 2 },
        { id: 'n16', position: 16, copyNumber: 0 },
        { id: 'n17', position: 17, copyNumber: 1 },
        { id: 'n18', position: 18, copyNumber: 2 },
        { id: 'n19', position: 19, copyNumber: 1 },
        { id: 'n20', position: 20, copyNumber: 2 },
      ],
      paths: [
        { nodes: ['n14', 'n15', 'n16', 'n17', 'n18', 'n19', 'n20'], track: 0 },
        { nodes: ['n14', 'n15', 'n18', 'n19', 'n20'], track: 1 },
      ],
    },
  ],
}

const COPY_NUMBER_COLORS: any = {
  0: '#8B4513',
  1: '#FFA500',
  2: '#FFFFFF',
}

const HaplotypeBubblePlot = ({ data, width = 700, height = 200 }: any) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const margin: any = { top: 40, right: 20, bottom: 40, left: 20 }
  const plotWidth: number = width - margin.left - margin.right
  const plotHeight: number = height - margin.top - margin.bottom

  // Calculate position extent
  const allPositions: any = data.bubbles.flatMap((b: any) => b.nodes.map((n: any) => n.position))
  const minPos: number = Math.min(...allPositions)
  const maxPos: number = Math.max(...allPositions)

  const xScale: any = scaleLinear().domain([minPos, maxPos]).range([0, plotWidth])

  const nodeRadius: number = 8
  const trackSpacing: number = 40
  const trackOffset: number = plotHeight / 2

  // Build node lookup
  const nodeMap: Map<string, any> = new Map()
  data.bubbles.forEach((bubble: any) => {
    bubble.nodes.forEach((node: any) => {
      nodeMap.set(node.id, node)
    })
  })

  // Create curved line generator
  const curvedLine: any = line()
    .x((d: any) => d.x)
    .y((d: any) => d.y)
    .curve(curveBasis)

  return (
    <div>
      <svg width={width} height={height}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Legend */}
          <g transform="translate(0, -30)">
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

          {/* Bubble labels */}
          {data.bubbles.map((bubble: any, bubbleIdx: number) => {
            const bubbleNodes: any = bubble.nodes
            const bubbleMinX: number = Math.min(...bubbleNodes.map((n: any) => xScale(n.position)))
            const bubbleMaxX: number = Math.max(...bubbleNodes.map((n: any) => xScale(n.position)))
            const bubbleCenterX: number = (bubbleMinX + bubbleMaxX) / 2

            return (
              <text
                key={bubble.id}
                x={bubbleCenterX}
                y={plotHeight + 25}
                textAnchor="middle"
                fontSize={12}
              >
                Bubble {bubbleIdx + 1}
              </text>
            )
          })}

          {/* Draw paths and nodes for each bubble */}
          {data.bubbles.map((bubble: any) => (
            <g key={bubble.id}>
              {/* Draw curved edges */}
              {bubble.paths.map((path: any, pathIdx: number) => {
                const track: number = path.track
                const y: number = trackOffset + (track - 0.5) * trackSpacing

                // Build points for the curved line
                const points: any[] = path.nodes.map((nodeId: string) => {
                  const node: any = nodeMap.get(nodeId)
                  return {
                    x: xScale(node.position),
                    y: y,
                  }
                })

                return (
                  <path
                    key={pathIdx}
                    d={curvedLine(points) || ''}
                    fill="none"
                    stroke="#4A90E2"
                    strokeWidth={2}
                    opacity={0.7}
                  />
                )
              })}

              {/* Draw nodes */}
              {bubble.nodes.map((node: any) => {
                // Find which track(s) this node appears on
                const tracks: any = bubble.paths
                  .filter((path: any) => path.nodes.includes(node.id))
                  .map((path: any) => path.track)

                // Use average track for nodes on multiple paths
                const avgTrack: number =
                  tracks.reduce((a: number, b: number) => a + b, 0) / tracks.length
                const y: number = trackOffset + (avgTrack - 0.5) * trackSpacing

                const isHovered: boolean = hoveredNode === node.id

                return (
                  <circle
                    key={node.id}
                    cx={xScale(node.position)}
                    cy={y}
                    r={isHovered ? nodeRadius * 1.2 : nodeRadius}
                    fill={COPY_NUMBER_COLORS[node.copyNumber] || '#999'}
                    stroke="#333"
                    strokeWidth={isHovered ? 2 : 1}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  />
                )
              })}
            </g>
          ))}
        </g>
      </svg>

      {hoveredNode && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          Node: {hoveredNode}, Copy Number: {nodeMap.get(hoveredNode)?.copyNumber}
        </div>
      )}
    </div>
  )
}

// Demo component
const HaplotypeBubbleTrack = () => {
  return (
    <div style={{ padding: 20 }}>
      <h2>Haplotype Bubble Visualization</h2>
      <HaplotypeBubblePlot data={TEST_DATA} width={700} height={200} />
    </div>
  )
}

export default HaplotypeBubbleTrack

// const TEST_DATA = {
//   bubbles: [
//     {
//       id: 'bubble1',
//       nodes: [
//         { id: 'n0', position: 0, copyNumber: 0 },
//         { id: 'n1', position: 1, copyNumber: 1 },
//         { id: 'n2', position: 2, copyNumber: 2 },
//         { id: 'n3', position: 3, copyNumber: 1 },
//         { id: 'n4', position: 4, copyNumber: 2 },
//         { id: 'n5', position: 5, copyNumber: 1 },
//         { id: 'n6', position: 6, copyNumber: 0 },
//         { id: 'n7', position: 7, copyNumber: 1 },
//       ],
//       paths: [
//         { nodes: ['n0', 'n1', 'n2', 'n3', 'n6', 'n7'], track: 0 },
//         { nodes: ['n0', 'n1', 'n4', 'n5', 'n6', 'n7'], track: 1 },
//       ],
//     },
//     {
//       id: 'bubble2',
//       nodes: [
//         { id: 'n8', position: 8, copyNumber: 1 },
//         { id: 'n9', position: 9, copyNumber: 0 },
//         { id: 'n10', position: 10, copyNumber: 2 },
//         { id: 'n11', position: 11, copyNumber: 1 },
//         { id: 'n12', position: 12, copyNumber: 0 },
//         { id: 'n13', position: 13, copyNumber: 2 },
//       ],
//       paths: [
//         { nodes: ['n8', 'n9', 'n10', 'n13'], track: 0 },
//         { nodes: ['n8', 'n11', 'n12', 'n13'], track: 1 },
//       ],
//     },
//     {
//       id: 'bubble3',
//       nodes: [
//         { id: 'n14', position: 14, copyNumber: 1 },
//         { id: 'n15', position: 15, copyNumber: 2 },
//         { id: 'n16', position: 16, copyNumber: 0 },
//         { id: 'n17', position: 17, copyNumber: 1 },
//         { id: 'n18', position: 18, copyNumber: 2 },
//         { id: 'n19', position: 19, copyNumber: 1 },
//         { id: 'n20', position: 20, copyNumber: 2 },
//       ],
//       paths: [
//         { nodes: ['n14', 'n15', 'n16', 'n17', 'n18', 'n19', 'n20'], track: 0 },
//         { nodes: ['n14', 'n15', 'n18', 'n19', 'n20'], track: 1 },
//       ],
//     },
//   ],
// }
//
// const COPY_NUMBER_COLORS: Record<number, string> = {
//   0: '#8B4513',
//   1: '#FFA500',
//   2: '#FFFFFF',
// }
//
// type HaplootypeBubblePlotTypes = {
//   data: any;
//   width: any;
//   height: any;
// }
//
// const HaplotypeBubblePlot = ({ data, width = 700, height = 200 }: HaplootypeBubblePlotTypes) => {
//   const [hoveredNode, setHoveredNode] = useState(null)
//
//   const margin = { top: 40, right: 20, bottom: 40, left: 20 }
//   const plotWidth = width - margin.left - margin.right
//   const plotHeight = height - margin.top - margin.bottom
//
//   // Calculate position extent
//   const allPositions = data.bubbles.flatMap((b: any) => b.nodes.map((n: any) => n.position))
//   const minPos = Math.min(...allPositions)
//   const maxPos = Math.max(...allPositions)
//
//   const xScale = scaleLinear()
//     .domain([minPos, maxPos])
//     .range([0, plotWidth])
//
//   const nodeRadius = 8
//   const trackSpacing = 40
//   const trackOffset = plotHeight / 2
//
//   // Build node lookup
//   const nodeMap = new Map()
//   data.bubbles.forEach((bubble: any) => {
//     bubble.nodes.forEach((node: any) => {
//       nodeMap.set(node.id, node)
//     })
//   })
//
//   return (
//     <div>
//       <svg width={width} height={height}>
//         <g transform={`translate(${margin.left}, ${margin.top})`}>
//           {/* Legend */}
//           <g transform="translate(0, -30)">
//             <text fontSize={12} fontWeight="bold">
//               k-mer copy number
//             </text>
//             {[0, 1, 2].map((cn, i) => (
//               <g key={cn} transform={`translate(${i * 30 + 140}, 0)`}>
//                 <circle
//                   cx={0}
//                   cy={0}
//                   r={6}
//                   fill={COPY_NUMBER_COLORS[cn]}
//                   stroke="#333"
//                   strokeWidth={1}
//                 />
//                 <text x={10} y={0} dy="0.3em" fontSize={12}>
//                   {cn}
//                 </text>
//               </g>
//             ))}
//           </g>
//
//           {/* Bubble labels */}
//           {data.bubbles.map((bubble: any, bubbleIdx: any) => {
//             const bubbleNodes = bubble.nodes
//             const bubbleMinX = Math.min(...bubbleNodes.map((n: any) => xScale(n.position)))
//             const bubbleMaxX = Math.max(...bubbleNodes.map((n: any) => xScale(n.position)))
//             const bubbleCenterX = (bubbleMinX + bubbleMaxX) / 2
//
//             return (
//               <text
//                 key={bubble.id}
//                 x={bubbleCenterX}
//                 y={plotHeight + 25}
//                 textAnchor="middle"
//                 fontSize={12}
//               >
//                 Bubble {bubbleIdx + 1}
//               </text>
//             )
//           })}
//
//           {/* Draw paths and nodes for each bubble */}
//           {data.bubbles.map((bubble: any) => (
//             <g key={bubble.id}>
//               {/* Draw edges */}
//               {bubble.paths.map((path: any, pathIdx: any) => {
//                 const track = path.track
//                 const y = trackOffset + (track - 0.5) * trackSpacing
//
//                 return (
//                   <g key={pathIdx}>
//                     {path.nodes.slice(0, -1).map((nodeId: any, i: number) => {
//                       const node1 = nodeMap.get(nodeId)
//                       const node2 = nodeMap.get(path.nodes[i + 1])
//
//                       return (
//                         <line
//                           key={`${nodeId}-${node2.id}`}
//                           x1={xScale(node1.position)}
//                           y1={y}
//                           x2={xScale(node2.position)}
//                           y2={y}
//                           stroke="#333"
//                           strokeWidth={2}
//                         />
//                       )
//                     })}
//                   </g>
//                 )
//               })}
//
//               {/* Draw nodes */}
//               {bubble.nodes.map((node: any) => {
//                 // Find which track(s) this node appears on
//                 const tracks = bubble.paths
//                   .filter((path: any) => path.nodes.includes(node.id))
//                   .map((path: any) => path.track)
//
//                 // Use average track for nodes on multiple paths
//                 const avgTrack = tracks.reduce((a: any, b: any) => a + b, 0) / tracks.length
//                 const y = trackOffset + (avgTrack - 0.5) * trackSpacing
//
//                 const isHovered = hoveredNode === node.id
//
//                 return (
//                   <circle
//                     key={node.id}
//                     cx={xScale(node.position)}
//                     cy={y}
//                     r={isHovered ? nodeRadius * 1.2 : nodeRadius}
//                     fill={COPY_NUMBER_COLORS[node.copyNumber] || '#999'}
//                     stroke="#333"
//                     strokeWidth={isHovered ? 2 : 1}
//                     style={{ cursor: 'pointer' }}
//                     onMouseEnter={() => setHoveredNode(node.id)}
//                     onMouseLeave={() => setHoveredNode(null)}
//                   />
//                 )
//               })}
//             </g>
//           ))}
//         </g>
//       </svg>
//
//       {hoveredNode && (
//         <div style={{ marginTop: 10, fontSize: 12 }}>
//           Node: {hoveredNode}, Copy Number: {nodeMap.get(hoveredNode)?.copyNumber}
//         </div>
//       )}
//     </div>
//   )
// }
//
// // Demo component
// const HaplotypeBubbleTrack = () => {
//   return (
//     <div style={{ padding: 20 }}>
//       <h2>Haplotype Bubble Visualization</h2>
//       <HaplotypeBubblePlot data={TEST_DATA} width={700} height={200} />
//     </div>
//   )
// }
//
// export default HaplotypeBubbleTrack
