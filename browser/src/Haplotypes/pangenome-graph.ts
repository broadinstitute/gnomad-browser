import { HaplotypeGroup } from './index'

export interface GraphNode {
  id: string
  position: number
  type: 'ref' | 'alt'
  alleles: string[]
  isVariantSite: boolean
}

export interface GraphPath {
  hash: number
  sampleCount: number
  nodeIds: string[]
  rawGroup: HaplotypeGroup
}

export interface PangenomeGraph {
  nodes: GraphNode[]
  paths: GraphPath[]
  start: number
  stop: number
}

export const buildPangenomeGraph = (
  groups: HaplotypeGroup[],
  start: number,
  stop: number
): PangenomeGraph => {
  // 1. Find all unique variant positions across all groups
  const variantPosSet = new Set<number>()
  groups.forEach((g) => {
    g.variants.variants.forEach((v) => variantPosSet.add(v.position))
  })
  const sortedPositions = Array.from(variantPosSet).sort((a, b) => a - b)

  // 2. Build canonical nodes
  const nodes: GraphNode[] = []

  // Create invariant block nodes between variants, and variant nodes at sites
  let prevPos = start
  sortedPositions.forEach((pos) => {
    if (pos > prevPos) {
      nodes.push({
        id: `ref-block-${prevPos}-${pos}`,
        position: prevPos,
        type: 'ref',
        alleles: ['REF'],
        isVariantSite: false,
      })
    }
    nodes.push({
      id: `var-ref-${pos}`,
      position: pos,
      type: 'ref',
      alleles: ['REF'],
      isVariantSite: true,
    })
    prevPos = pos + 1
  })

  // Add trailing ref block
  if (prevPos < stop) {
    nodes.push({
      id: `ref-block-${prevPos}-${stop}`,
      position: prevPos,
      type: 'ref',
      alleles: ['REF'],
      isVariantSite: false,
    })
  }

  // Inject alt nodes lazily based on group usage
  const paths: GraphPath[] = groups.map((g) => {
    const nodeIds: string[] = []

    // Quick lookup for variants in this group
    const varMap = new Map()
    g.variants.variants.forEach((v) => varMap.set(v.position, v))

    // Trace the path
    sortedPositions.forEach((pos) => {
      if (varMap.has(pos)) {
        const v = varMap.get(pos)
        const altId = `var-alt-${pos}-${v.alleles.join('-')}`
        // Ensure alt node exists
        if (!nodes.find((n) => n.id === altId)) {
          nodes.push({
            id: altId,
            position: pos,
            type: 'alt',
            alleles: v.alleles,
            isVariantSite: true,
          })
        }
        nodeIds.push(altId)
      } else {
        nodeIds.push(`var-ref-${pos}`)
      }
    })

    return {
      hash: g.hash,
      sampleCount: g.samples.length,
      nodeIds,
      rawGroup: g,
    }
  })

  // Sort nodes by position for downstream layout engines
  nodes.sort((a, b) => a.position - b.position)

  return { nodes, paths, start, stop }
}
