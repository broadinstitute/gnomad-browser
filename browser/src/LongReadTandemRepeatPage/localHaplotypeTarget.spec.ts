import type { HaplotypeCluster, HaplotypeGroup } from '../Haplotypes'
import type { TargetDisplaySidecar } from '../Haplotypes/haplotypeCompute'
import {
  buildLocalHaplotypeTargetDescriptor,
  exactAlleleIdentity,
  localTargetRows,
  serializeTargetDescriptor,
  validateLocalHaplotypePayload,
} from './localHaplotypeTarget'

const group = (
  hash: number,
  copies: Array<{ sample_id: string; vcf_strand: number; phase_set: string | null }>
) =>
  ({
    hash,
    samples: copies.map((copy) => ({ ...copy, variant_sets: [] })),
    variants: { variants: [], readable_id: '' },
    below_threshold: { variants: [], readable_id: '' },
    start: 1,
    stop: 2,
  } as HaplotypeGroup)

const cluster = (id: string, hashes: string[]): HaplotypeCluster => ({
  cluster_id: id,
  sample_count: hashes.length,
  member_group_hashes: hashes,
  consensus_variants: [],
})

describe('local tandem-repeat haplotype target', () => {
  test('always builds a contig-clipped canonical envelope ±50 kb descriptor', () => {
    expect(
      buildLocalHaplotypeTargetDescriptor({
        chrom: 'chr1',
        envelopeStart: 12,
        envelopeStop: 20,
        sourceVariantIds: ['record-a', 'record-b'],
        selectedExactAlleleId: 'record-b~7',
      })
    ).toEqual({
      canonical_envelope: { chrom: '1', start: 12, stop: 20 },
      source_variant_ids: ['record-a', 'record-b'],
      selected_exact_allele_id: 'record-b~7',
      fixed_window: { chrom: '1', start: 1, stop: 50020, flank_size: 50000 },
    })

    expect(
      buildLocalHaplotypeTargetDescriptor({
        chrom: '1',
        envelopeStart: 248_956_410,
        envelopeStop: 248_956_422,
        sourceVariantIds: ['record-a'],
        selectedExactAlleleId: 'record-a~1',
      }).fixed_window.stop
    ).toBe(248_956_422)
  })

  test('uses source_variant_id~alt_index as exact identity', () => {
    expect(exactAlleleIdentity('4-3074876-A-AT', 72)).toBe('4-3074876-A-AT~72')
  })

  test('overlays exact assignments after clustering and preserves homogeneous and mixed rows', () => {
    const groups = [
      group(10, [
        { sample_id: 'hidden-a', vcf_strand: 1, phase_set: '10' },
        { sample_id: 'hidden-b', vcf_strand: 2, phase_set: '10' },
      ]),
      group(20, [{ sample_id: 'hidden-c', vcf_strand: 1, phase_set: null }]),
    ]
    const descriptor = buildLocalHaplotypeTargetDescriptor({
      chrom: '4',
      envelopeStart: 100,
      envelopeStop: 110,
      sourceVariantIds: ['target'],
      selectedExactAlleleId: 'target~7',
    })
    const sidecar = {
      descriptor,
      by_carrier: {
        a: {
          sample_id: 'hidden-a',
          vcf_strand: 1,
          phase_set: '10',
          exact_allele_ids: ['target~7'],
          assignment_status: 'assigned',
          is_selected_exact_allele: true,
          flanking_signature_status: 'usable',
        },
        b: {
          sample_id: 'hidden-b',
          vcf_strand: 2,
          phase_set: '10',
          exact_allele_ids: ['target~8'],
          assignment_status: 'assigned',
          is_selected_exact_allele: false,
          flanking_signature_status: 'usable',
        },
        c: {
          sample_id: 'hidden-c',
          vcf_strand: 1,
          phase_set: null,
          exact_allele_ids: ['target~8'],
          assignment_status: 'assigned',
          is_selected_exact_allele: false,
          flanking_signature_status: 'usable',
        },
      },
      counts: {},
    } as unknown as TargetDisplaySidecar

    const rows = localTargetRows({
      groups,
      clusters: [cluster('internal-z', ['10']), cluster('internal-a', ['20'])],
      sidecar,
    })

    expect(rows).toEqual([
      expect.objectContaining({
        clusterId: 'internal-z',
        label: 'Cluster 1',
        representedCopyCount: 2,
        selectedCopyCount: 1,
        selectedFraction: 0.5,
        exactAlleleIds: ['target~7', 'target~8'],
        assignmentStatus: 'mixed',
      }),
      expect.objectContaining({
        clusterId: 'internal-a',
        label: 'Cluster 2',
        representedCopyCount: 1,
        selectedCopyCount: 0,
        exactAlleleIds: ['target~8'],
        assignmentStatus: 'homogeneous',
      }),
    ])
    expect(JSON.stringify(rows)).not.toContain('hidden-')
  })

  test('fails closed unless descriptor, complete sources, selected identity, and provenance match', () => {
    const descriptor = buildLocalHaplotypeTargetDescriptor({
      chrom: '22',
      envelopeStart: 100,
      envelopeStop: 110,
      sourceVariantIds: ['target-a', 'target-b'],
      selectedExactAlleleId: 'target-b~2',
    })
    const payload = {
      target_descriptor: descriptor,
      variants: {
        source_variant_id: ['target-a', 'target-b'],
        alt_index: [1, 2],
      },
      provenance: {
        available: true,
        source: 'Y1_ACCEPTED',
        release: 'v1',
        run_id: 'run-1',
        cohort: 'hgsvc_hprc',
        chromosome: 'chr22',
      },
    } as any

    expect(() =>
      validateLocalHaplotypePayload({
        payload,
        descriptor,
        expectedRunId: 'run-1',
        expectedRelease: 'v1',
      })
    ).not.toThrow()
    expect(() =>
      validateLocalHaplotypePayload({
        payload: {
          ...payload,
          variants: { source_variant_id: ['target-b'], alt_index: [2] },
        },
        descriptor,
        expectedRunId: 'run-1',
        expectedRelease: 'v1',
      })
    ).toThrow('incomplete target source-record set')
    expect(() =>
      validateLocalHaplotypePayload({
        payload,
        descriptor,
        expectedRunId: 'another-run',
        expectedRelease: 'v1',
      })
    ).toThrow('provenance')
  })

  test('bounds serialized descriptors rather than truncating them', () => {
    const descriptor = buildLocalHaplotypeTargetDescriptor({
      chrom: '22',
      envelopeStart: 100,
      envelopeStop: 110,
      sourceVariantIds: ['target'],
      selectedExactAlleleId: 'target~1',
    })
    expect(JSON.parse(serializeTargetDescriptor(descriptor))).toEqual(descriptor)
    expect(() =>
      serializeTargetDescriptor({
        ...descriptor,
        source_variant_ids: [`target-${'A'.repeat(33_000)}`],
      })
    ).toThrow('too large')
  })
})
