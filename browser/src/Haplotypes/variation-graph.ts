import { HaplotypeGroup } from './index'

export interface VarGraphNode {
  id: string
  position: number
  type: 'ref' | 'alt'
  alleles: string[]
  alleleType: string
  alleleLength: number
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
  haplotypes: Set<string>
}

export interface Bubble {
  sourceNode: string
  sinkNode: string
  position: number
  altNodeId: string
  alleles: string[]
  alleleType: string
  alleleLength: number
  weight: number
  totalHaplotypes: number
  isSuperbubble: boolean
  span: [number, number]
  mergedBubbles?: Bubble[]
}

/** Pre-computed per-column flow data for rendering */
export interface ColumnFlow {
  position: number
  refWeight: number
  altWeight: number
  alleleType: string
  alleleLength: number
  alleles: string[]
}

/** Pre-computed inter-column transition data for rendering */
export interface InterColumnFlow {
  fromPos: number
  toPos: number
  refToRef: number
  refToAlt: number
  altToRef: number
  altToAlt: number
}

export interface VariationGraph {
  nodes: Map<string, VarGraphNode>
  edges: Map<string, GraphEdge>
  bubbles: Bubble[]
  columns: ColumnFlow[]
  transitions: InterColumnFlow[]
  totalHaplotypes: number
}

/**
 * Build a variation graph from haplotype groups.
 *
 * Each HaplotypeGroup has samples (all sharing the same variant set) and variants.
 * We walk each group's variants to build nodes and weighted edges, then detect
 * simple bubbles (one per variant site) and collapse consecutive ones into superbubbles
 * when the exact same haplotype set traverses the alt path.
 */
export const buildVariationGraph = (
  groups: HaplotypeGroup[],
  start: number,
  stop: number
): VariationGraph => {
  const nodes = new Map<string, VarGraphNode>()
  const edges = new Map<string, GraphEdge>()

  // Collect all unique variant positions across all groups
  const variantPosSet = new Set<number>()
  const variantsByPos = new Map<number, { alleles: string[]; alleleType: string; alleleLength: number }>()

  for (const group of groups) {
    for (const v of group.variants.variants) {
      variantPosSet.add(v.position)
      if (!variantsByPos.has(v.position)) {
        variantsByPos.set(v.position, {
          alleles: v.alleles,
          alleleType: v.allele_type || 'snv',
          alleleLength: v.allele_length || 0,
        })
      }
    }
  }

  const sortedPositions = Array.from(variantPosSet).sort((a, b) => a - b)
  if (sortedPositions.length === 0) {
    return { nodes, edges, bubbles: [], columns: [], transitions: [], totalHaplotypes: 0 }
  }

  // Create ref and alt nodes for each variant position
  for (const pos of sortedPositions) {
    const info = variantsByPos.get(pos)!
    const refId = `ref-${pos}`
    const altId = `alt-${pos}`

    nodes.set(refId, {
      id: refId,
      position: pos,
      type: 'ref',
      alleles: ['REF'],
      alleleType: 'ref',
      alleleLength: 0,
    })

    nodes.set(altId, {
      id: altId,
      position: pos,
      type: 'alt',
      alleles: info.alleles,
      alleleType: info.alleleType,
      alleleLength: info.alleleLength,
    })
  }

  // Helper to add/increment an edge
  const addEdge = (source: string, target: string, hapId: string) => {
    const key = `${source}->${target}`
    if (!edges.has(key)) {
      edges.set(key, { source, target, weight: 0, haplotypes: new Set() })
    }
    const edge = edges.get(key)!
    edge.haplotypes.add(hapId)
    edge.weight = edge.haplotypes.size
  }

  // Total haplotype count for AF calculation
  let totalHaplotypes = 0

  // Walk each group's path through the variant sites
  for (const group of groups) {
    if (group.variants.variants.length === 0) continue

    const groupVariantPositions = new Set(group.variants.variants.map((v) => v.position))

    // Each sample in the group takes the same path
    for (const sample of group.samples) {
      const hapId = sample.sample_id
      totalHaplotypes++

      let prevNodeId = 'SOURCE'

      for (const pos of sortedPositions) {
        const nodeId = groupVariantPositions.has(pos) ? `alt-${pos}` : `ref-${pos}`
        addEdge(prevNodeId, nodeId, hapId)
        prevNodeId = nodeId
      }

      addEdge(prevNodeId, 'SINK', hapId)
    }
  }

  // Build simple bubbles — one per variant position
  const simpleBubbles: Bubble[] = sortedPositions.map((pos) => {
    const altId = `alt-${pos}`
    const info = variantsByPos.get(pos)!

    // Count haplotypes taking the alt path at this position
    let altWeight = 0
    const altHaplotypes = new Set<string>()

    for (const [, edge] of edges) {
      if (edge.target === altId) {
        for (const h of edge.haplotypes) {
          altHaplotypes.add(h)
        }
        altWeight = altHaplotypes.size
      }
    }

    return {
      sourceNode: `ref-${pos}`,
      sinkNode: `ref-${pos}`,
      position: pos,
      altNodeId: altId,
      alleles: info.alleles,
      alleleType: info.alleleType,
      alleleLength: info.alleleLength,
      weight: altWeight,
      totalHaplotypes,
      isSuperbubble: false,
      span: [pos, pos + Math.max(1, info.alleleLength)] as [number, number],
    }
  })

  // Detect superbubbles: consecutive positions where the exact same haplotype set takes alt
  const bubbles: Bubble[] = []
  const altHapSets: Set<string>[] = simpleBubbles.map((b) => {
    const haps = new Set<string>()
    for (const [, edge] of edges) {
      if (edge.target === b.altNodeId) {
        for (const h of edge.haplotypes) haps.add(h)
      }
    }
    return haps
  })

  let i = 0
  while (i < simpleBubbles.length) {
    let j = i + 1

    // Check consecutive bubbles for exact haplotype set match
    while (j < simpleBubbles.length) {
      const setA = altHapSets[i]
      const setB = altHapSets[j]
      if (setA.size !== setB.size) break
      let match = true
      for (const h of setA) {
        if (!setB.has(h)) {
          match = false
          break
        }
      }
      if (!match) break
      j++
    }

    if (j - i > 1) {
      // Superbubble: merge consecutive bubbles i..j-1
      const merged = simpleBubbles.slice(i, j)
      const spanStart = merged[0].position
      const lastBubble = merged[merged.length - 1]
      const spanEnd = lastBubble.position + Math.max(1, lastBubble.alleleLength)

      bubbles.push({
        sourceNode: merged[0].sourceNode,
        sinkNode: lastBubble.sinkNode,
        position: spanStart,
        altNodeId: merged[0].altNodeId,
        alleles: merged[0].alleles,
        alleleType: 'superbubble',
        alleleLength: spanEnd - spanStart,
        weight: merged[0].weight,
        totalHaplotypes,
        isSuperbubble: true,
        span: [spanStart, spanEnd],
        mergedBubbles: merged,
      })
    } else {
      bubbles.push(simpleBubbles[i])
    }

    i = j
  }

  // Pre-compute column flows for rendering
  const columns: ColumnFlow[] = sortedPositions.map((pos) => {
    const info = variantsByPos.get(pos)!
    const altId = `alt-${pos}`
    let altWeight = 0
    for (const [, edge] of edges) {
      if (edge.target === altId) altWeight += edge.weight
    }
    // Deduplicate: altWeight is haplotypes reaching alt via any incoming edge.
    // Since a haplotype can only arrive via one edge, this is correct.
    // But we computed weight as edge.haplotypes.size, so just count unique haplotypes on alt.
    const altHaps = new Set<string>()
    for (const [, edge] of edges) {
      if (edge.target === altId) {
        for (const h of edge.haplotypes) altHaps.add(h)
      }
    }
    return {
      position: pos,
      refWeight: totalHaplotypes - altHaps.size,
      altWeight: altHaps.size,
      alleleType: info.alleleType,
      alleleLength: info.alleleLength,
      alleles: info.alleles,
    }
  })

  // Pre-compute inter-column transitions for rendering
  const transitions: InterColumnFlow[] = []
  for (let idx = 0; idx < sortedPositions.length - 1; idx++) {
    const fromPos = sortedPositions[idx]
    const toPos = sortedPositions[idx + 1]

    const getEdgeWeight = (src: string, tgt: string) => {
      const key = `${src}->${tgt}`
      return edges.get(key)?.weight || 0
    }

    transitions.push({
      fromPos,
      toPos,
      refToRef: getEdgeWeight(`ref-${fromPos}`, `ref-${toPos}`),
      refToAlt: getEdgeWeight(`ref-${fromPos}`, `alt-${toPos}`),
      altToRef: getEdgeWeight(`alt-${fromPos}`, `ref-${toPos}`),
      altToAlt: getEdgeWeight(`alt-${fromPos}`, `alt-${toPos}`),
    })
  }

  return { nodes, edges, bubbles, columns, transitions, totalHaplotypes }
}
