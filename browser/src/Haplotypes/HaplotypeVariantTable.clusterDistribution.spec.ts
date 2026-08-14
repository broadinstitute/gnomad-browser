import type { HaplotypeCluster } from './index'
import {
  buildClusterDistributionByKey,
  getActiveClusterCount,
  type ClusterDistributionEntry,
} from './HaplotypeVariantTable'

const snv = (variantId: string) => ({
  variant_id: variantId,
  chrom: 'chr22',
  pos: Number(variantId.match(/\d+/)?.[0] || 1),
  ref: 'A',
  alt: 'T',
  allele_type: 'snv',
})

const trv = (altIndex: number) => ({
  variant_id: `chr22-200-TRV-12~${altIndex}`,
  source_variant_id: 'chr22-200-TRV-12',
  chrom: 'chr22',
  pos: 200,
  end: 212,
  ref: 'AAAA',
  alt: 'A'.repeat(altIndex + 1),
  allele_type: 'trv',
})

const clusters = (): HaplotypeCluster[] => [
  {
    cluster_id: 'cluster-z',
    sample_count: 10,
    member_group_hashes: [],
    consensus_variants: [
      { variant: snv('22-100-A-T'), cluster_af: 0.2 },
      { variant: snv('22-100-A-T'), cluster_af: 0.7 },
      { variant: trv(1), cluster_af: 0.25 },
      { variant: trv(2), cluster_af: 0.6 },
    ] as any,
  },
  {
    cluster_id: 'cluster-a',
    sample_count: 8,
    member_group_hashes: [],
    consensus_variants: [
      { variant: trv(3), cluster_af: 0.4 },
      { variant: snv('22-300-C-G'), cluster_af: 0 },
    ] as any,
  },
  {
    cluster_id: 'cluster-m',
    sample_count: 4,
    member_group_hashes: [],
    consensus_variants: [],
  },
]

const referenceDistribution = (
  input: HaplotypeCluster[],
  keyForVariant: (variant: any) => string
): Map<string, ClusterDistributionEntry[]> => {
  const keys = new Set<string>()
  input.forEach((cluster) => {
    cluster.consensus_variants.forEach((consensus) => keys.add(keyForVariant(consensus.variant)))
  })

  const result = new Map<string, ClusterDistributionEntry[]>()
  keys.forEach((key) => {
    result.set(key, input.map((cluster) => {
      let af = 0
      cluster.consensus_variants.forEach((consensus) => {
        if (keyForVariant(consensus.variant) === key) af = Math.max(af, consensus.cluster_af)
      })
      return { cluster_id: cluster.cluster_id, af }
    }))
  })
  return result
}

const distributionKey = (variant: any) => {
  if (variant.allele_type === 'trv') return `source:${variant.source_variant_id}`
  return `variant:${variant.variant_id}`
}

describe('cluster consensus distribution index', () => {
  test('matches the prior semantics for stable order, sparse keys, duplicate maxima, and grouped TR alleles', () => {
    const input = clusters()
    const actual = buildClusterDistributionByKey(input)
    const expected = referenceDistribution(input, distributionKey)

    expect(actual).toEqual(expected)
    expect(actual.get('variant:22-100-A-T')).toEqual([
      { cluster_id: 'cluster-z', af: 0.7 },
      { cluster_id: 'cluster-a', af: 0 },
      { cluster_id: 'cluster-m', af: 0 },
    ])
    expect(actual.get('source:chr22-200-TRV-12')).toEqual([
      { cluster_id: 'cluster-z', af: 0.6 },
      { cluster_id: 'cluster-a', af: 0.4 },
      { cluster_id: 'cluster-m', af: 0 },
    ])
    expect(actual.get('variant:22-999-G-C')).toBeUndefined()
    expect(getActiveClusterCount(actual.get('source:chr22-200-TRV-12'))).toBe(2)
    expect(getActiveClusterCount(actual.get('variant:22-999-G-C'))).toBeUndefined()
  })

  test('iterates every cluster consensus array exactly once', () => {
    const input = clusters()
    const scanCounts = input.map(() => 0)
    input.forEach((cluster, index) => {
      const consensusVariants = cluster.consensus_variants
      Object.defineProperty(consensusVariants, Symbol.iterator, {
        configurable: true,
        value: () => {
          scanCounts[index] += 1
          return Array.prototype[Symbol.iterator].call(consensusVariants)
        },
      })
    })

    buildClusterDistributionByKey(input)

    expect(scanCounts).toEqual([1, 1, 1])
  })
})
