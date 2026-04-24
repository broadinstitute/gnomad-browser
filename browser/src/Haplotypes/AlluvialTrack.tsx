import React, { useMemo } from 'react'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { scaleLinear } from 'd3-scale'
import { PangenomeGraph, GraphNode } from './pangenome-graph'
import { PATH_COLORS } from './colors'
import HaplotypeHelpButton from './HelpButton'

const MAX_PATHS = 30
const NODE_GAP = 10
const MIN_PATH_HEIGHT = 16
const HEADER_HEIGHT = 90

type Props = {
  graph: PangenomeGraph
}

const buildPathD = (coords: { x: number; y: number }[]): string => {
  if (coords.length === 0) return ''
  if (coords.length === 1) return `M${coords[0].x},${coords[0].y}`

  let d = `M${coords[0].x},${coords[0].y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]
    const curr = coords[i]
    const cpx = (prev.x + curr.x) / 2
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}

/**
 * Compute vertical Y positions for each path at a given column.
 * This is independent of scalePosition (x-axis) and can be used for left panel labels.
 */
const computeColumnLayout = (
  displayPaths: PangenomeGraph['paths'],
  graph: PangenomeGraph,
  uniquePositions: number[],
  colIdx: number,
  thicknessScale: (n: number) => number,
  minThickness: number,
  flowHeight: number,
) => {
  const pos = uniquePositions[colIdx]
  const pathNodeAtCol = displayPaths.map((path) => {
    const varMap = new Map<number, string>()
    path.nodeIds.forEach((nid) => {
      const node = graph.nodes.find((n) => n.id === nid)
      if (node && node.isVariantSite) varMap.set(node.position, nid)
    })
    const nid = varMap.get(pos)
    if (nid) return graph.nodes.find((n) => n.id === nid) || null
    return graph.nodes.find((n) => n.id === `var-ref-${pos}`) || null
  })

  const groups = new Map<string, { nodeId: string; isAlt: boolean; pathIndices: number[] }>()
  displayPaths.forEach((_, pathIdx) => {
    const node = pathNodeAtCol[pathIdx]
    const nodeId = node?.id || `var-ref-${pos}`
    const isAlt = node?.type === 'alt'
    if (!groups.has(nodeId)) {
      groups.set(nodeId, { nodeId, isAlt: isAlt || false, pathIndices: [] })
    }
    groups.get(nodeId)!.pathIndices.push(pathIdx)
  })

  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    if (!a.isAlt && b.isAlt) return -1
    if (a.isAlt && !b.isAlt) return 1
    return 0
  })

  const groupHeights = sortedGroups.map((g) => {
    const samples = g.pathIndices.reduce((s, pi) => s + displayPaths[pi].sampleCount, 0)
    return Math.max(thicknessScale(samples), g.pathIndices.length * minThickness)
  })
  const totalStackHeight =
    groupHeights.reduce((s, h) => s + h, 0) + (sortedGroups.length - 1) * NODE_GAP

  let currentY = HEADER_HEIGHT + (flowHeight - totalStackHeight) / 2
  const pathYPositions = new Array<number>(displayPaths.length)

  sortedGroups.forEach((group, gi) => {
    const groupH = groupHeights[gi]
    let innerY = currentY
    group.pathIndices.forEach((pathIdx) => {
      const pathH = Math.max(minThickness, thicknessScale(displayPaths[pathIdx].sampleCount))
      pathYPositions[pathIdx] = innerY + pathH / 2
      innerY += pathH
    })
    currentY += groupH + NODE_GAP
  })

  return pathYPositions
}

const AlluvialHelp = () => (
  <>
    <h4 style={{ marginTop: 0 }}>Overview</h4>
    <p>
      The alluvial (Sankey) view shows haplotype groups as colored ribbons flowing through variant
      sites across a genomic region. It reveals how haplotypes share or diverge at each variant position.
    </p>

    <h4>Reading the Plot</h4>
    <ul>
      <li><strong>Ribbons</strong> — Each colored ribbon represents a haplotype group. The <strong>thickness</strong> is proportional to the number of samples sharing that haplotype.</li>
      <li><strong style={{ color: '#4a90d9' }}>Blue dots</strong> — Reference allele nodes. Ribbons passing through a blue dot carry the reference allele at that position.</li>
      <li><strong style={{ color: '#d73027' }}>Red dots</strong> — Alternate allele nodes. Ribbons passing through a red dot carry an alternate allele.</li>
      <li><strong>Convergence</strong> — When ribbons merge at the same node, those haplotypes share the same allele at that site.</li>
      <li><strong>Divergence</strong> — When ribbons split to different nodes, haplotypes differ at that site.</li>
    </ul>

    <h4>Left Panel Labels</h4>
    <ul>
      <li><strong>Orange circle + number</strong> — Sample count (how many haplotypes in this group)</li>
      <li><strong>Gray circle + number</strong> — Variant count (how many variant sites this group carries)</li>
      <li><strong>Colored line</strong> — Matches the ribbon color in the plot</li>
    </ul>

    <h4>Interpreting Patterns</h4>
    <ul>
      <li><strong>Wide ribbons</strong> indicate common haplotypes shared by many individuals.</li>
      <li><strong>Thin ribbons</strong> at the bottom are rare, unique haplotypes.</li>
      <li>Regions with many red dots and ribbon splitting indicate <strong>high haplotype diversity</strong>.</li>
      <li>Regions where most ribbons pass through the same node indicate <strong>low diversity</strong> (conserved).</li>
    </ul>

    <h4>Limitations</h4>
    <ul>
      <li>Only the top 30 groups by sample count are shown to avoid visual clutter.</li>
      <li>X-coordinates use genomic position (proportional spacing), so dense variant clusters may appear cramped.</li>
      <li>The AF threshold slider filters which variants define groups — raising it simplifies the view.</li>
    </ul>
  </>
)

const AlluvialTrack = ({ graph }: Props) => {
  const variantNodes = graph.nodes.filter((n) => n.isVariantSite)
  const uniquePositions = Array.from(new Set(variantNodes.map((n) => n.position))).sort(
    (a, b) => a - b
  )

  const sortedPaths = useMemo(
    () => [...graph.paths].sort((a, b) => b.sampleCount - a.sampleCount),
    [graph.paths]
  )
  const displayPaths = sortedPaths.slice(0, MAX_PATHS)
  const truncated = graph.paths.length > MAX_PATHS

  const totalDisplayedSamples = displayPaths.reduce((s, p) => s + p.sampleCount, 0)
  const naturalHeight = displayPaths.length * MIN_PATH_HEIGHT + (displayPaths.length - 1) * NODE_GAP
  const PLOT_HEIGHT = Math.max(400, naturalHeight + HEADER_HEIGHT)
  const flowHeight = PLOT_HEIGHT - HEADER_HEIGHT

  const thicknessScale = scaleLinear()
    .domain([0, totalDisplayedSamples])
    .range([0, flowHeight * 0.8])

  const minThickness = MIN_PATH_HEIGHT * 0.6

  const maxSamples = displayPaths.reduce((max, p) => Math.max(max, p.sampleCount), 0)
  const maxVariants = displayPaths.reduce(
    (max, p) => Math.max(max, p.rawGroup.variants.variants.length),
    0
  )
  const sampleColorScale = scaleLinear<string>()
    .domain([0, maxSamples || 1])
    .range(['#fee0b6', '#b35806'])
  const variantColorScale = scaleLinear<string>()
    .domain([0, maxVariants || 1])
    .range(['#efefef', '#7f7f7f'])

  // Pre-compute label Y positions from the first column layout (independent of scalePosition)
  const labelYPositions = useMemo(() => {
    if (uniquePositions.length === 0) {
      return displayPaths.map((_, i) => HEADER_HEIGHT + i * MIN_PATH_HEIGHT)
    }
    return computeColumnLayout(
      displayPaths, graph, uniquePositions, 0,
      thicknessScale, minThickness, flowHeight
    )
  }, [displayPaths, graph, uniquePositions, thicknessScale, minThickness, flowHeight])

  return (
    <Track
      renderLeftPanel={() => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0 2px 0' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Haplotype Paths</span>
            <HaplotypeHelpButton title="Alluvial Flow — How to Read This View">
              <AlluvialHelp />
            </HaplotypeHelpButton>
          </div>
          <svg width={200} height={PLOT_HEIGHT}>
            <text x={0} y={12} fontSize='9' fill='#666'>
              {displayPaths.length} of {graph.paths.length} groups
              {truncated ? ' (truncated)' : ''}
            </text>
            {/* Legend */}
            <line x1={5} y1={45} x2={25} y2={45} stroke={PATH_COLORS[0]} strokeWidth={3} strokeOpacity={0.55} />
            <text x={30} y={48} fontSize='8' fill='#333'>Path (thickness = sample count)</text>
            <circle cx={15} cy={60} r={3} fill='#4a90d9' stroke='#fff' strokeWidth={1} />
            <text x={30} y={63} fontSize='8' fill='#333'>Ref node</text>
            <circle cx={15} cy={75} r={4} fill='#d73027' stroke='#fff' strokeWidth={1} />
            <text x={30} y={78} fontSize='8' fill='#333'>Alt node</text>

            {/* Per-path labels */}
            {displayPaths.map((path, pathIdx) => {
              const cy = labelYPositions[pathIdx]
              const color = PATH_COLORS[pathIdx % PATH_COLORS.length]
              const group = path.rawGroup
              const variantCount = group.variants.variants.length
              return (
                <TooltipAnchor
                  key={`label-${pathIdx}`}
                  tooltipComponent={() => (
                    <dl style={{ margin: 0 }}>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Start:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{group.start}</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Stop:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{group.stop}</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Samples:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{path.sampleCount}</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Size:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{group.stop - group.start} bp</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Variants:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{variantCount}</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Sample IDs:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{group.samples.map(s => s.sample_id).join(', ')}</dd></div>
                    </dl>
                  )}
                >
                  <g>
                    <circle cx={5} cy={cy} r={4} fill={sampleColorScale(path.sampleCount)} />
                    <text x={13} y={cy + 3} fontSize='9' fill='#333'>{path.sampleCount}</text>
                    <circle cx={42} cy={cy} r={4} fill={variantColorScale(variantCount)} />
                    <text x={50} y={cy + 3} fontSize='9' fill='#333'>{variantCount}</text>
                    <line x1={72} y1={cy} x2={82} y2={cy} stroke={color} strokeWidth={3} strokeOpacity={0.7} />
                  </g>
                </TooltipAnchor>
              )
            })}
          </svg>
        </div>
      )}
    >
      {({ scalePosition, width }: { scalePosition: (input: number) => number; width: number }) => {
        if (uniquePositions.length === 0) {
          return (
            <svg width={width} height={100}>
              <text x={width / 2} y={50} textAnchor='middle' fill='#666' fontSize='12'>
                No variant sites in region
              </text>
            </svg>
          )
        }

        const pathCoords: { x: number; y: number }[][] = displayPaths.map(() => [])

        const pathNodeAtPos: (GraphNode | null)[][] = displayPaths.map((path) => {
          const varMap = new Map<number, string>()
          path.nodeIds.forEach((nid) => {
            const node = graph.nodes.find((n) => n.id === nid)
            if (node && node.isVariantSite) {
              varMap.set(node.position, nid)
            }
          })
          return uniquePositions.map((pos) => {
            const nid = varMap.get(pos)
            if (nid) return graph.nodes.find((n) => n.id === nid) || null
            return graph.nodes.find((n) => n.id === `var-ref-${pos}`) || null
          })
        })

        uniquePositions.forEach((pos, colIdx) => {
          const x = scalePosition(pos)
          const groups = new Map<string, { nodeId: string; isAlt: boolean; pathIndices: number[] }>()
          displayPaths.forEach((_, pathIdx) => {
            const node = pathNodeAtPos[pathIdx][colIdx]
            const nodeId = node?.id || `var-ref-${pos}`
            const isAlt = node?.type === 'alt'
            if (!groups.has(nodeId)) {
              groups.set(nodeId, { nodeId, isAlt: isAlt || false, pathIndices: [] })
            }
            groups.get(nodeId)!.pathIndices.push(pathIdx)
          })

          const sortedGroups = Array.from(groups.values()).sort((a, b) => {
            if (!a.isAlt && b.isAlt) return -1
            if (a.isAlt && !b.isAlt) return 1
            return 0
          })

          const groupHeights = sortedGroups.map((g) => {
            const samples = g.pathIndices.reduce((s, pi) => s + displayPaths[pi].sampleCount, 0)
            return Math.max(thicknessScale(samples), g.pathIndices.length * minThickness)
          })
          const totalStackHeight =
            groupHeights.reduce((s, h) => s + h, 0) + (sortedGroups.length - 1) * NODE_GAP

          let currentY = HEADER_HEIGHT + (flowHeight - totalStackHeight) / 2

          sortedGroups.forEach((group, gi) => {
            const groupH = groupHeights[gi]
            let innerY = currentY
            group.pathIndices.forEach((pathIdx) => {
              const pathH = Math.max(minThickness, thicknessScale(displayPaths[pathIdx].sampleCount))
              const centerY = innerY + pathH / 2
              pathCoords[pathIdx].push({ x, y: centerY })
              innerY += pathH
            })
            currentY += groupH + NODE_GAP
          })
        })

        return (
          <svg width={width} height={PLOT_HEIGHT}>
            {/* Vertical gridlines */}
            {uniquePositions.map((pos, i) => (
              <line
                key={`vgrid-${i}`}
                x1={scalePosition(pos)} y1={HEADER_HEIGHT}
                x2={scalePosition(pos)} y2={PLOT_HEIGHT}
                stroke='#f0f0f0' strokeWidth={0.5}
              />
            ))}

            {/* Path ribbons */}
            {displayPaths.map((path, pathIdx) => {
              const coords = pathCoords[pathIdx]
              if (coords.length === 0) return null
              const color = PATH_COLORS[pathIdx % PATH_COLORS.length]
              const strokeWidth = Math.max(minThickness, thicknessScale(path.sampleCount))
              return (
                <path
                  key={`ribbon-${pathIdx}`}
                  d={buildPathD(coords)}
                  fill='none'
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={0.55}
                  strokeLinecap='round'
                >
                  <title>{`Group ${path.hash} | ${path.sampleCount} sample${path.sampleCount > 1 ? 's' : ''}`}</title>
                </path>
              )
            })}

            {/* Allele node markers with tooltips */}
            {uniquePositions.map((pos, colIdx) => {
              const x = scalePosition(pos)
              const seen = new Map<string, { y: number; isAlt: boolean; node: GraphNode | null; pathCount: number }>()
              displayPaths.forEach((_, pathIdx) => {
                const node = pathNodeAtPos[pathIdx][colIdx]
                const nodeId = node?.id || `var-ref-${pos}`
                if (!seen.has(nodeId)) {
                  seen.set(nodeId, {
                    y: pathCoords[pathIdx][colIdx].y,
                    isAlt: node?.type === 'alt' || false,
                    node,
                    pathCount: 1,
                  })
                } else {
                  seen.get(nodeId)!.pathCount++
                }
              })
              return Array.from(seen.entries()).map(([nodeId, { y, isAlt, node, pathCount }]) => (
                <TooltipAnchor
                  key={`node-${colIdx}-${nodeId}`}
                  tooltipComponent={() => (
                    <dl style={{ margin: 0 }}>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Position:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{pos.toLocaleString()}</dd></div>
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Type:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{isAlt ? 'Alternate' : 'Reference'}</dd></div>
                      {node && node.alleles.length > 1 && (
                        <>
                          <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Ref:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{node.alleles[0].length > 20 ? node.alleles[0].substring(0, 20) + '...' : node.alleles[0]}</dd></div>
                          <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Alt:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{node.alleles[1].length > 20 ? node.alleles[1].substring(0, 20) + '...' : node.alleles[1]}</dd></div>
                        </>
                      )}
                      <div><dt style={{ display: 'inline', fontWeight: 'bold' }}>Groups through node:</dt> <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{pathCount}</dd></div>
                    </dl>
                  )}
                >
                  <circle
                    cx={x} cy={y}
                    r={isAlt ? 4 : 3}
                    fill={isAlt ? '#d73027' : '#4a90d9'}
                    stroke='#fff' strokeWidth={1}
                  />
                </TooltipAnchor>
              ))
            })}
          </svg>
        )
      }}
    </Track>
  )
}

export default AlluvialTrack
