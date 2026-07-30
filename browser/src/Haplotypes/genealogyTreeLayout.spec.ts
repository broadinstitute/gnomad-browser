import { SUPERPOPULATION_COLORS } from './colors'
import {
  ancestrySlicesFromCounts,
  buildGenealogyTreeLayout,
  buildTreePieWedges,
  TreeNodePoint,
} from './genealogyTreeLayout'
import type { TreeNode } from './genealogy-math'
import type { HaplotypeGroup } from './index'
import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'

const leaf = (groupHash: number): TreeNode => ({
  left: null,
  right: null,
  distance: 0,
  groupHash,
  size: 1,
})

const group = (hash: number, sampleIds: string[]): HaplotypeGroup => ({
  hash,
  samples: sampleIds.map(sample_id => ({
    sample_id,
    vcf_strand: 1,
    phase_set: null,
    variant_sets: [],
  })),
  variants: { variants: [], readable_id: '' },
  below_threshold: { variants: [], readable_id: '' },
  start: 1,
  stop: 2,
})

const metadata = (entries: [string, string][]): SampleMetadataMap => new Map(
  entries.map(([sampleId, superpopulation]) => [
    sampleId,
    { subpopulation: '', superpopulation },
  ])
)

const layoutFor = (
  tree: TreeNode,
  groups: HaplotypeGroup[],
  sampleMetadata?: SampleMetadataMap
) => buildGenealogyTreeLayout({
  tree,
  groups,
  sampleMetadata,
  leafYPositions: new Map(groups.map((g, index) => [g.hash, index * 20 + 10])),
  panelWidth: 200,
  clusterThreshold: 0,
  isClusteredView: false,
})

describe('genealogy ancestry pie nodes', () => {
  test('leaf composition counts every represented sample', () => {
    const layout = layoutFor(
      leaf(1),
      [group(1, ['a', 'b', 'c'])],
      metadata([['a', 'AFR'], ['b', 'AFR'], ['c', 'EUR']])
    )

    expect(layout.nodes[0].sampleCount).toBe(3)
    expect(layout.nodes[0].slices.map(s => [s.population, s.count, s.fraction])).toEqual([
      ['AFR', 2, 2 / 3],
      ['EUR', 1, 1 / 3],
    ])
    expect(layout.nodes[0].tooltipText).toContain('AFR: 2 (66.7%)')
  })

  test('internal composition sums descendant counts rather than averaging child percentages', () => {
    const tree: TreeNode = { left: leaf(1), right: leaf(2), distance: 4, groupHash: null, size: 2 }
    const layout = layoutFor(
      tree,
      [group(1, ['a', 'b', 'c']), group(2, ['d'])],
      metadata([['a', 'AFR'], ['b', 'AFR'], ['c', 'AFR'], ['d', 'EUR']])
    )
    const root = layout.nodes[2]

    expect(root.sampleCount).toBe(4)
    expect(root.slices.map(s => [s.population, s.count, s.fraction])).toEqual([
      ['AFR', 3, 0.75],
      ['EUR', 1, 0.25],
    ])
  })

  test('missing and unrecognized ancestry is retained as unknown/unavailable', () => {
    const layout = layoutFor(
      leaf(1),
      [group(1, ['known', 'missing', 'unexpected'])],
      metadata([['known', 'EAS'], ['unexpected', 'XYZ']])
    )

    expect(layout.nodes[0].slices.map(s => [s.population, s.count])).toEqual([
      ['EAS', 1],
      ['N/A', 2],
    ])
    expect(layout.nodes[0].tooltipText).toContain('Unknown/unavailable: 2 (66.7%)')
  })

  test('slice order and canonical colors are deterministic', () => {
    const slices = ancestrySlicesFromCounts({ 'N/A': 1, EUR: 1, AFR: 1, EAS: 1 })

    expect(slices.map(s => s.population)).toEqual(['AFR', 'EAS', 'EUR', 'N/A'])
    expect(slices.map(s => s.color)).toEqual([
      [148, 20, 148, 255],
      [18, 139, 68, 255],
      [106, 166, 206, 255],
      [158, 158, 158, 255],
    ])
    expect(SUPERPOPULATION_COLORS.AFR).toBe('#941494')
  })

  test('render geometry uses the node radius and preserves the node as hit target', () => {
    const node: TreeNodePoint = {
      position: [20, 30, 0],
      radius: 5,
      color: [0, 0, 0, 255],
      slices: ancestrySlicesFromCounts({ AFR: 1, EUR: 1 }),
      sampleCount: 2,
      isThresholdNode: false,
      distance: 0,
      type: 'tree-node',
      tooltipText: 'test',
    }
    const wedges = buildTreePieWedges([node])

    expect(wedges).toHaveLength(2)
    expect(wedges.every(wedge => wedge.node === node)).toBe(true)
    expect(wedges.flatMap(wedge => wedge.polygon.slice(1)).every(([x, y]) => (
      Math.abs(Math.hypot(x - 20, y - 30) - 5) < 1e-10
    ))).toBe(true)
  })

  test('metadata absence produces a neutral fallback pie', () => {
    const node = layoutFor(leaf(1), [group(1, ['a', 'b'])]).nodes[0]
    expect(node.slices).toEqual([{
      population: 'N/A',
      count: 2,
      fraction: 1,
      color: [158, 158, 158, 255],
    }])
  })
})
