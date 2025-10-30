// import React, { useState } from 'react'
// import { scaleLinear } from 'd3-scale'

// import React, { useState } from 'react'
// import { scaleLinear } from 'd3-scale'
// import { line, curveBasis } from 'd3-shape'
//
// // Test data structure
// const TEST_DATA: any = {
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
// const COPY_NUMBER_COLORS: any = {
//   0: '#8B4513',
//   1: '#FFA500',
//   2: '#FFFFFF',
// }
//
// const HaplotypeBubblePlot = ({ data, width = 700, height = 200 }: any) => {
//   const [hoveredNode, setHoveredNode] = useState<string | null>(null)
//
//   const margin: any = { top: 40, right: 20, bottom: 40, left: 20 }
//   const plotWidth: number = width - margin.left - margin.right
//   const plotHeight: number = height - margin.top - margin.bottom
//
//   // Calculate position extent
//   const allPositions: any = data.bubbles.flatMap((b: any) => b.nodes.map((n: any) => n.position))
//   const minPos: number = Math.min(...allPositions)
//   const maxPos: number = Math.max(...allPositions)
//
//   const xScale: any = scaleLinear().domain([minPos, maxPos]).range([0, plotWidth])
//
//   const nodeRadius: number = 8
//   const trackSpacing: number = 40
//   const trackOffset: number = plotHeight / 2
//
//   // Build node lookup
//   const nodeMap: Map<string, any> = new Map()
//   data.bubbles.forEach((bubble: any) => {
//     bubble.nodes.forEach((node: any) => {
//       nodeMap.set(node.id, node)
//     })
//   })
//
//   // Create curved line generator
//   const curvedLine: any = line()
//     .x((d: any) => d.x)
//     .y((d: any) => d.y)
//     .curve(curveBasis)
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
//             {[0, 1, 2].map((cn: number, i: number) => (
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
//           {data.bubbles.map((bubble: any, bubbleIdx: number) => {
//             const bubbleNodes: any = bubble.nodes
//             const bubbleMinX: number = Math.min(...bubbleNodes.map((n: any) => xScale(n.position)))
//             const bubbleMaxX: number = Math.max(...bubbleNodes.map((n: any) => xScale(n.position)))
//             const bubbleCenterX: number = (bubbleMinX + bubbleMaxX) / 2
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
//               {/* Draw curved edges */}
//               {bubble.paths.map((path: any, pathIdx: number) => {
//                 const track: number = path.track
//                 const y: number = trackOffset + (track - 0.5) * trackSpacing
//
//                 // Build points for the curved line
//                 const points: any[] = path.nodes.map((nodeId: string) => {
//                   const node: any = nodeMap.get(nodeId)
//                   return {
//                     x: xScale(node.position),
//                     y: y,
//                   }
//                 })
//
//                 return (
//                   <path
//                     key={pathIdx}
//                     d={curvedLine(points) || ''}
//                     fill="none"
//                     stroke="#4A90E2"
//                     strokeWidth={2}
//                     opacity={0.7}
//                   />
//                 )
//               })}
//
//               {/* Draw nodes */}
//               {bubble.nodes.map((node: any) => {
//                 // Find which track(s) this node appears on
//                 const tracks: any = bubble.paths
//                   .filter((path: any) => path.nodes.includes(node.id))
//                   .map((path: any) => path.track)
//
//                 // Use average track for nodes on multiple paths
//                 const avgTrack: number =
//                   tracks.reduce((a: number, b: number) => a + b, 0) / tracks.length
//                 const y: number = trackOffset + (avgTrack - 0.5) * trackSpacing
//
//                 const isHovered: boolean = hoveredNode === node.id
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
//
//
//
//

// import React, { useState } from 'react'
// import { scaleLinear } from 'd3-scale'
// import { line, curveBasis, curveBumpX, curveCardinal } from 'd3-shape'
//
// // Graph-based data structure
// interface GraphNode {
//   id: string
//   position: number
//   sequence: string
//   copyNumber?: number
// }
//
// interface GraphEdge {
//   from: string
//   to: string
// }
//
// interface HaplotypePath {
//   id: string
//   nodes: string[] // Ordered list of node IDs
// }
//
// interface HaplotypeGraph {
//   nodes: GraphNode[]
//   edges: GraphEdge[]
//   paths: HaplotypePath[]
// }
//
//
// // Test graph matching the reference image structure
// const TEST_GRAPH: HaplotypeGraph = {
//   nodes: [
//     // Linear start section
//     { id: 'n0', position: 0, sequence: 'A', copyNumber: 0 },
//     { id: 'n1', position: 1, sequence: 'G', copyNumber: 1 },
//     { id: 'n2', position: 2, sequence: 'C', copyNumber: 2 },
//
//     // Bubble 1 - larger bubble with multiple internal nodes
//     { id: 'b1_start', position: 3, sequence: 'T', copyNumber: 1 },
//     { id: 'b1_top1', position: 4, sequence: 'A', copyNumber: 1 },
//     { id: 'b1_top2', position: 5, sequence: 'G', copyNumber: 2 },
//     { id: 'b1_top3', position: 6, sequence: 'C', copyNumber: 1 },
//     { id: 'b1_bot1', position: 4, sequence: 'T', copyNumber: 0 },
//     { id: 'b1_bot2', position: 5, sequence: 'T', copyNumber: 1 },
//     { id: 'b1_bot3', position: 6, sequence: 'A', copyNumber: 2 },
//     { id: 'b1_end', position: 7, sequence: 'G', copyNumber: 1 },
//
//     // Connecting nodes
//     { id: 'n8', position: 8, sequence: 'T', copyNumber: 0 },
//     { id: 'n9', position: 9, sequence: 'C', copyNumber: 1 },
//
//     // Bubble 2 - rounder bubble
//     { id: 'b2_start', position: 10, sequence: 'A', copyNumber: 2 },
//     { id: 'b2_top1', position: 11, sequence: 'G', copyNumber: 1 },
//     { id: 'b2_top2', position: 12, sequence: 'T', copyNumber: 0 },
//     { id: 'b2_bot1', position: 11, sequence: 'C', copyNumber: 2 },
//     { id: 'b2_bot2', position: 12, sequence: 'A', copyNumber: 1 },
//     { id: 'b2_end', position: 13, sequence: 'G', copyNumber: 0 },
//
//     // Connecting section
//     { id: 'n14', position: 14, sequence: 'T', copyNumber: 1 },
//     { id: 'n15', position: 15, sequence: 'A', copyNumber: 2 },
//
//     // Bubble 3 - elongated bubble
//     { id: 'b3_start', position: 16, sequence: 'C', copyNumber: 1 },
//     { id: 'b3_top1', position: 17, sequence: 'G', copyNumber: 2 },
//     { id: 'b3_top2', position: 18, sequence: 'T', copyNumber: 1 },
//     { id: 'b3_top3', position: 19, sequence: 'A', copyNumber: 2 },
//     { id: 'b3_bot1', position: 17, sequence: 'A', copyNumber: 0 },
//     { id: 'b3_bot2', position: 18, sequence: 'C', copyNumber: 1 },
//     { id: 'b3_bot3', position: 19, sequence: 'G', copyNumber: 2 },
//     { id: 'b3_end', position: 20, sequence: 'T', copyNumber: 1 },
//
//     // End section
//     { id: 'n21', position: 21, sequence: 'C', copyNumber: 2 },
//     { id: 'n22', position: 22, sequence: 'G', copyNumber: 1 },
//   ],
//   edges: [
//     // Linear start
//     { from: 'n0', to: 'n1' },
//     { from: 'n1', to: 'n2' },
//     { from: 'n2', to: 'b1_start' },
//
//     // Bubble 1
//     { from: 'b1_start', to: 'b1_top1' },
//     { from: 'b1_top1', to: 'b1_top2' },
//     { from: 'b1_top2', to: 'b1_top3' },
//     { from: 'b1_top3', to: 'b1_end' },
//     { from: 'b1_start', to: 'b1_bot1' },
//     { from: 'b1_bot1', to: 'b1_bot2' },
//     { from: 'b1_bot2', to: 'b1_bot3' },
//     { from: 'b1_bot3', to: 'b1_end' },
//
//     // Connection
//     { from: 'b1_end', to: 'n8' },
//     { from: 'n8', to: 'n9' },
//     { from: 'n9', to: 'b2_start' },
//
//     // Bubble 2
//     { from: 'b2_start', to: 'b2_top1' },
//     { from: 'b2_top1', to: 'b2_top2' },
//     { from: 'b2_top2', to: 'b2_end' },
//     { from: 'b2_start', to: 'b2_bot1' },
//     { from: 'b2_bot1', to: 'b2_bot2' },
//     { from: 'b2_bot2', to: 'b2_end' },
//
//     // Connection
//     { from: 'b2_end', to: 'n14' },
//     { from: 'n14', to: 'n15' },
//     { from: 'n15', to: 'b3_start' },
//
//     // Bubble 3
//     { from: 'b3_start', to: 'b3_top1' },
//     { from: 'b3_top1', to: 'b3_top2' },
//     { from: 'b3_top2', to: 'b3_top3' },
//     { from: 'b3_top3', to: 'b3_end' },
//     { from: 'b3_start', to: 'b3_bot1' },
//     { from: 'b3_bot1', to: 'b3_bot2' },
//     { from: 'b3_bot2', to: 'b3_bot3' },
//     { from: 'b3_bot3', to: 'b3_end' },
//
//     // End
//     { from: 'b3_end', to: 'n21' },
//     { from: 'n21', to: 'n22' },
//   ],
//   paths: [
//     {
//       id: 'haplotype1',
//       nodes: ['n0', 'n1', 'n2', 'b1_start', 'b1_top1', 'b1_top2', 'b1_top3', 'b1_end',
//         'n8', 'n9', 'b2_start', 'b2_top1', 'b2_top2', 'b2_end',
//         'n14', 'n15', 'b3_start', 'b3_top1', 'b3_top2', 'b3_top3', 'b3_end', 'n21', 'n22']
//     },
//     {
//       id: 'haplotype2',
//       nodes: ['n0', 'n1', 'n2', 'b1_start', 'b1_bot1', 'b1_bot2', 'b1_bot3', 'b1_end',
//         'n8', 'n9', 'b2_start', 'b2_bot1', 'b2_bot2', 'b2_end',
//         'n14', 'n15', 'b3_start', 'b3_bot1', 'b3_bot2', 'b3_bot3', 'b3_end', 'n21', 'n22']
//     },
//   ],
// }
//
//
// // Test graph with multiple bubbles
// // const TEST_GRAPH: HaplotypeGraph = {
// //   nodes: [
// //     // Bubble 1
// //     { id: 'start1', position: 0, sequence: 'A', copyNumber: 2 },
// //     { id: 'n1_alt1', position: 2, sequence: 'C', copyNumber: 1 },
// //     { id: 'n1_alt2', position: 2, sequence: 'G', copyNumber: 2 },
// //     { id: 'merge1', position: 4, sequence: 'T', copyNumber: 2 },
// //
// //     // Bubble 2
// //     { id: 'n2_ref', position: 6, sequence: 'AA', copyNumber: 0 },
// //     { id: 'n2_alt1', position: 6, sequence: 'A', copyNumber: 1 },
// //     { id: 'n2_alt2', position: 6, sequence: 'AAA', copyNumber: 2 },
// //     { id: 'merge2', position: 8, sequence: 'G', copyNumber: 1 },
// //
// //     // Bubble 3
// //     { id: 'n3_ref', position: 10, sequence: 'GGG', copyNumber: 2 },
// //     { id: 'n3_alt1', position: 10, sequence: 'G', copyNumber: 1 },
// //     { id: 'n3_alt2', position: 10, sequence: 'GG', copyNumber: 0 },
// //     { id: 'merge3', position: 12, sequence: 'C', copyNumber: 1 },
// //     { id: 'end', position: 14, sequence: 'T', copyNumber: 2 },
// //   ],
// //   edges: [
// //     // Bubble 1 connections
// //     { from: 'start1', to: 'n1_alt1' },
// //     { from: 'start1', to: 'n1_alt2' },
// //     { from: 'n1_alt1', to: 'merge1' },
// //     { from: 'n1_alt2', to: 'merge1' },
// //
// //     // Bubble 2 connections
// //     { from: 'merge1', to: 'n2_ref' },
// //     { from: 'merge1', to: 'n2_alt1' },
// //     { from: 'merge1', to: 'n2_alt2' },
// //     { from: 'n2_ref', to: 'merge2' },
// //     { from: 'n2_alt1', to: 'merge2' },
// //     { from: 'n2_alt2', to: 'merge2' },
// //
// //     // Bubble 3 connections
// //     { from: 'merge2', to: 'n3_ref' },
// //     { from: 'merge2', to: 'n3_alt1' },
// //     { from: 'merge2', to: 'n3_alt2' },
// //     { from: 'n3_ref', to: 'merge3' },
// //     { from: 'n3_alt1', to: 'merge3' },
// //     { from: 'n3_alt2', to: 'merge3' },
// //     { from: 'merge3', to: 'end' },
// //   ],
// //   paths: [
// //     { id: 'haplotype1', nodes: ['start1', 'n1_alt1', 'merge1', 'n2_alt1', 'merge2', 'n3_ref', 'merge3', 'end'] },
// //     { id: 'haplotype2', nodes: ['start1', 'n1_alt2', 'merge1', 'n2_alt2', 'merge2', 'n3_alt1', 'merge3', 'end'] },
// //     { id: 'reference', nodes: ['start1', 'n1_alt2', 'merge1', 'n2_ref', 'merge2', 'n3_ref', 'merge3', 'end'] },
// //   ],
// // }
//
// const COPY_NUMBER_COLORS: any = {
//   0: '#8B4513',
//   1: '#FFA500',
//   2: '#FFFFFF',
// }
//
// const PATH_COLORS: any = {
//   haplotype1: '#4A90E2',
//   haplotype2: '#E24A90',
//   reference: '#50C878',
// }
//
// const HaplotypeBubblePlot = ({ graph, width = 800, height = 250 }: any) => {
//   const [hoveredNode, setHoveredNode] = useState<string | null>(null)
//   const [hoveredPath, setHoveredPath] = useState<string | null>(null)
//
//   const margin: any = { top: 60, right: 20, bottom: 40, left: 20 }
//   const plotWidth: number = width - margin.left - margin.right
//   const plotHeight: number = height - margin.top - margin.bottom
//
//   // Build node map
//   const nodeMap: Map<string, GraphNode> = new Map()
//   graph.nodes.forEach((node: GraphNode) => {
//     nodeMap.set(node.id, node)
//   })
//
//   // Calculate position extent
//   const positions: number[] = graph.nodes.map((n: GraphNode) => n.position)
//   const minPos: number = Math.min(...positions)
//   const maxPos: number = Math.max(...positions)
//
//   const xScale: any = scaleLinear()
//     .domain([minPos, maxPos])
//     .range([0, plotWidth])
//
//   // Layout: assign y-coordinates to nodes based on their position in paths
//   const nodeYPositions: Map<string, number> = new Map()
//   const trackHeight: number = plotHeight / (graph.paths.length + 1)
//
//   graph.paths.forEach((path: HaplotypePath, pathIdx: number) => {
//     const y: number = trackHeight * (pathIdx + 1)
//     path.nodes.forEach((nodeId: string) => {
//       // Average y position if node appears in multiple paths
//       if (!nodeYPositions.has(nodeId)) {
//         nodeYPositions.set(nodeId, y)
//       } else {
//         const currentY: number = nodeYPositions.get(nodeId)!
//         nodeYPositions.set(nodeId, (currentY + y) / 2)
//       }
//     })
//   })
//
//   const nodeRadius: number = 8
//
//   // Create curved line generator
//   const curvedLine: any = line()
//     // .curve(curveBasis)
//     // .curve(curveBumpX)
//     .curve(curveCardinal.tension(0.0))
//     .x((d: any) => d.x)
//     .y((d: any) => d.y)
//
//   return (
//     <div>
//       <svg width={width} height={height}>
//         <g transform={`translate(${margin.left}, ${margin.top})`}>
//           {/* Legend - Copy Number */}
//           <g transform="translate(0, -45)">
//             <text fontSize={12} fontWeight="bold">
//               k-mer copy number
//             </text>
//             {[0, 1, 2].map((cn: number, i: number) => (
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
//           {/* Legend - Paths */}
//           <g transform="translate(350, -45)">
//             <text fontSize={12} fontWeight="bold">
//               Paths
//             </text>
//             {graph.paths.map((path: HaplotypePath, i: number) => (
//               <g
//                 key={path.id}
//                 transform={`translate(${i * 100 + 50}, 0)`}
//                 onMouseEnter={() => setHoveredPath(path.id)}
//                 onMouseLeave={() => setHoveredPath(null)}
//                 style={{ cursor: 'pointer' }}
//               >
//                 <line
//                   x1={0}
//                   y1={0}
//                   x2={20}
//                   y2={0}
//                   stroke={PATH_COLORS[path.id] || '#666'}
//                   strokeWidth={hoveredPath === path.id ? 3 : 2}
//                 />
//                 <text x={25} y={0} dy="0.3em" fontSize={11}>
//                   {path.id}
//                 </text>
//               </g>
//             ))}
//           </g>
//
//           {/* Draw paths */}
//           {graph.paths.map((path: HaplotypePath) => {
//             const points: any[] = path.nodes
//               .map((nodeId: string) => {
//                 const node: GraphNode | undefined = nodeMap.get(nodeId)
//                 const y: number | undefined = nodeYPositions.get(nodeId)
//                 if (!node || y === undefined) return null
//                 return {
//                   x: xScale(node.position),
//                   y: y,
//                 }
//               })
//               .filter((p: any) => p !== null)
//
//             const isHighlighted: boolean = hoveredPath === path.id
//
//             return (
//               <path
//                 key={path.id}
//                 d={curvedLine(points) || ''}
//                 fill="none"
//                 stroke={PATH_COLORS[path.id] || '#666'}
//                 strokeWidth={isHighlighted ? 3 : 2}
//                 opacity={hoveredPath && !isHighlighted ? 0.2 : 0.7}
//                 onMouseEnter={() => setHoveredPath(path.id)}
//                 onMouseLeave={() => setHoveredPath(null)}
//                 style={{ cursor: 'pointer' }}
//               />
//             )
//           })}
//
//           {/* Draw nodes */}
//           {graph.nodes.map((node: GraphNode) => {
//             const y: number | undefined = nodeYPositions.get(node.id)
//             if (y === undefined) return null
//
//             const isHovered: boolean = hoveredNode === node.id
//
//             return (
//               <circle
//                 key={node.id}
//                 cx={xScale(node.position)}
//                 cy={y}
//                 r={isHovered ? nodeRadius * 1.3 : nodeRadius}
//                 fill={COPY_NUMBER_COLORS[node.copyNumber ?? 1] || '#999'}
//                 stroke="#333"
//                 strokeWidth={isHovered ? 2.5 : 1.5}
//                 style={{ cursor: 'pointer' }}
//                 onMouseEnter={() => setHoveredNode(node.id)}
//                 onMouseLeave={() => setHoveredNode(null)}
//               />
//             )
//           })}
//
//           {/* Position axis */}
//           <line
//             x1={0}
//             y1={plotHeight + 10}
//             x2={plotWidth}
//             y2={plotHeight + 10}
//             stroke="#333"
//             strokeWidth={1}
//           />
//           {graph.nodes
//             .filter((n: GraphNode, i: number, arr: GraphNode[]) =>
//               arr.findIndex((n2: GraphNode) => n2.position === n.position) === i
//             )
//             .map((node: GraphNode) => (
//               <g key={`axis-${node.position}`}>
//                 <line
//                   x1={xScale(node.position)}
//                   y1={plotHeight + 10}
//                   x2={xScale(node.position)}
//                   y2={plotHeight + 15}
//                   stroke="#333"
//                   strokeWidth={1}
//                 />
//                 <text
//                   x={xScale(node.position)}
//                   y={plotHeight + 25}
//                   textAnchor="middle"
//                   fontSize={10}
//                 >
//                   {node.position}
//                 </text>
//               </g>
//             ))}
//         </g>
//       </svg>
//
//       {hoveredNode && (
//         <div style={{ marginTop: 10, fontSize: 12, fontFamily: 'monospace' }}>
//           <strong>Node:</strong> {hoveredNode} |
//           <strong> Position:</strong> {nodeMap.get(hoveredNode)?.position} |
//           <strong> Sequence:</strong> {nodeMap.get(hoveredNode)?.sequence} |
//           <strong> Copy #:</strong> {nodeMap.get(hoveredNode)?.copyNumber}
//         </div>
//       )}
//     </div>
//   )
// }
//
// // Demo component
// const Demo = () => {
//   return (
//     <div style={{ padding: 20 }}>
//       <h2>Haplotype Bubble Visualization (Graph Input)</h2>
//       <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
//         Hover over paths or nodes to explore the graph structure
//       </p>
//       <HaplotypeBubblePlot graph={TEST_GRAPH} width={800} height={250} />
//     </div>
//   )
// }
//
// export default Demo
//
//
//

import React, { useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { line, curveBasis } from 'd3-shape'

// Graph node with adjacency list
interface GraphNode {
  id: string
  position: number
  sequence: string
  copyNumber?: number
  next: string[] // IDs of nodes this connects to
}

interface HaplotypePath {
  id: string
  nodes: string[] // Ordered list of node IDs
}

interface HaplotypeGraph {
  nodes: Map<string, GraphNode>
  paths: HaplotypePath[]
}

// Helper functions to analyze graph properties
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

// Calculate maximum width (number of simultaneous divergent paths)
const getMaxWidth = (graph: HaplotypeGraph): number => {
  // Group nodes by position
  const nodesByPosition: Map<number, GraphNode[]> = new Map()
  graph.nodes.forEach((node: GraphNode) => {
    if (!nodesByPosition.has(node.position)) {
      nodesByPosition.set(node.position, [])
    }
    nodesByPosition.get(node.position)!.push(node)
  })

  // Max width is the maximum number of nodes at any single position
  let maxWidth = 0
  nodesByPosition.forEach((nodes: GraphNode[]) => {
    if (nodes.length > maxWidth) maxWidth = nodes.length
  })
  return maxWidth
}

// Test graph with adjacency list structure
const createTestGraph = (): HaplotypeGraph => {
  const nodes = new Map<string, GraphNode>()

  const addNode = (
    id: string,
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)

  // Calculate graph properties
  const minPos: number = getMinPosition(graph)
  const maxPos: number = getMaxPosition(graph)
  const maxWidth: number = getMaxWidth(graph)

  // Dynamic height based on graph width
  const trackHeight: number = 50
  const margin: any = { top: 60, right: 20, bottom: 40, left: 20 }
  const height: number = margin.top + margin.bottom + maxWidth * trackHeight
  const plotWidth: number = width - margin.left - margin.right
  const plotHeight: number = height - margin.top - margin.bottom

  const xScale: any = scaleLinear().domain([minPos, maxPos]).range([0, plotWidth])

  // Layout: assign y-coordinates to nodes
  // For each path, assign a track, then position nodes accordingly
  const nodeYPositions: Map<string, number> = new Map()

  graph.paths.forEach((path: HaplotypePath, pathIdx: number) => {
    const y: number = trackHeight * (pathIdx + 0.5)
    path.nodes.forEach((nodeId: string) => {
      // If node already positioned, average with new position
      if (!nodeYPositions.has(nodeId)) {
        nodeYPositions.set(nodeId, y)
      } else {
        const currentY: number = nodeYPositions.get(nodeId)!
        nodeYPositions.set(nodeId, (currentY + y) / 2)
      }
    })
  })

  const nodeRadius: number = 8

  // Create curved line generator
  const curvedLine: any = line()
    .curve(curveBasis)
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
            .filter((_: number, i: number) => i % 2 === 0) // Show every other position for clarity
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

// Demo component
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
