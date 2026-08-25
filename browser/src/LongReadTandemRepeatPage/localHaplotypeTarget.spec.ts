import type { HaplotypeCluster, HaplotypeGroup } from '../Haplotypes'
import type { TargetDisplaySidecar } from '../Haplotypes/haplotypeCompute'
import {
  buildLocalHaplotypeTargetDescriptor,
  exactAlleleIdentity,
  localTargetGroupRows,
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
        unknownCopyCount: 0,
        exactAlleleIds: ['target~7', 'target~8'],
        exactAlleleVectors: [['target~7'], ['target~8']],
        assignmentStatus: 'mixed',
      }),
      expect.objectContaining({
        clusterId: 'internal-a',
        label: 'Cluster 2',
        representedCopyCount: 1,
        selectedCopyCount: 0,
        unknownCopyCount: 0,
        exactAlleleIds: ['target~8'],
        exactAlleleVectors: [['target~8']],
        assignmentStatus: 'homogeneous',
      }),
    ])
    expect(JSON.stringify(rows)).not.toContain('hidden-')
  })

  test('preserves assignment vectors and reports partial rather than mislabeling unknown copies', () => {
    const groups = [
      group(10, [
        { sample_id: 'copy-a', vcf_strand: 1, phase_set: null },
        { sample_id: 'copy-b', vcf_strand: 2, phase_set: null },
      ]),
      group(20, [
        { sample_id: 'copy-c', vcf_strand: 1, phase_set: null },
        { sample_id: 'copy-d', vcf_strand: 2, phase_set: null },
      ]),
    ]
    const descriptor = buildLocalHaplotypeTargetDescriptor({
      chrom: '4',
      envelopeStart: 100,
      envelopeStop: 110,
      sourceVariantIds: ['source-a', 'source-b'],
      selectedExactAlleleId: 'source-a~1',
    })
    const assignment = (sample_id: string, vcf_strand: number, exact_allele_ids: string[]) => ({
      sample_id,
      vcf_strand,
      phase_set: null,
      exact_allele_ids,
      assignment_status: exact_allele_ids.length ? 'assigned' : 'unknown',
      is_selected_exact_allele: exact_allele_ids.includes('source-a~1'),
      flanking_signature_status: 'usable',
    })
    const sidecar = {
      descriptor,
      by_carrier: {
        a: assignment('copy-a', 1, ['source-a~1', 'source-b~2']),
        b: assignment('copy-b', 2, ['source-b~2', 'source-a~1']),
        c: assignment('copy-c', 1, ['source-a~1']),
        d: assignment('copy-d', 2, []),
      },
      counts: {},
    } as unknown as TargetDisplaySidecar

    const rows = localTargetRows({
      groups,
      clusters: [cluster('same-vector', ['10']), cluster('partial', ['20'])],
      sidecar,
    })
    expect(rows[0]).toEqual(
      expect.objectContaining({
        exactAlleleVectors: [['source-a~1', 'source-b~2']],
        unknownCopyCount: 0,
        assignmentStatus: 'homogeneous',
      })
    )
    expect(rows[1]).toEqual(
      expect.objectContaining({
        exactAlleleVectors: [['source-a~1']],
        unknownCopyCount: 1,
        assignmentStatus: 'partial',
      })
    )
  })

  test('keeps observed, mixed, and unknown semantics on expanded haplotype-group rows', () => {
    const groups = [
      group(10, [
        { sample_id: 'copy-a', vcf_strand: 1, phase_set: null },
        { sample_id: 'copy-b', vcf_strand: 2, phase_set: null },
      ]),
      group(20, [{ sample_id: 'copy-c', vcf_strand: 1, phase_set: null }]),
    ]
    const descriptor = buildLocalHaplotypeTargetDescriptor({
      chrom: '4',
      envelopeStart: 100,
      envelopeStop: 110,
      sourceVariantIds: ['source-a', 'source-b'],
      selectedExactAlleleId: 'source-a~1',
    })
    const sidecar = {
      descriptor,
      by_carrier: {
        a: {
          sample_id: 'copy-a',
          vcf_strand: 1,
          phase_set: null,
          exact_allele_ids: ['source-a~1'],
          assignment_status: 'assigned',
          is_selected_exact_allele: true,
          flanking_signature_status: 'usable',
        },
        b: {
          sample_id: 'copy-b',
          vcf_strand: 2,
          phase_set: null,
          exact_allele_ids: ['source-b~2'],
          assignment_status: 'assigned',
          is_selected_exact_allele: false,
          flanking_signature_status: 'usable',
        },
        c: {
          sample_id: 'copy-c',
          vcf_strand: 1,
          phase_set: null,
          exact_allele_ids: [],
          assignment_status: 'unknown',
          is_selected_exact_allele: false,
          flanking_signature_status: 'usable',
        },
      },
      counts: {},
    } as unknown as TargetDisplaySidecar

    expect(localTargetGroupRows({ groups, sidecar })).toEqual([
      expect.objectContaining({
        groupHash: '10',
        representedCopyCount: 2,
        selectedCopyCount: 1,
        exactAlleleIds: ['source-a~1', 'source-b~2'],
        assignmentStatus: 'mixed',
        unknownCopyCount: 0,
      }),
      expect.objectContaining({
        groupHash: '20',
        representedCopyCount: 1,
        selectedCopyCount: 0,
        exactAlleleIds: [],
        assignmentStatus: 'unassigned',
        unknownCopyCount: 1,
      }),
    ])
  })

  test('fails closed unless descriptor, complete sources, selected identity, source AC, and provenance match', () => {
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
        freq_ac: [3, 7],
      },
      provenance: {
        available: true,
        source: 'Y1_ACCEPTED',
        release: 'v1',
        run_id: 'run-1',
        cohort: 'hgsvc_hprc',
        reference_genome: 'GRCh38',
        chromosome: 'chr22',
      },
    } as any

    expect(() =>
      validateLocalHaplotypePayload({
        payload,
        descriptor,
        expectedRunId: 'run-1',
        expectedRelease: 'v1',
        expectedSelectedAc: 7,
      })
    ).not.toThrow()
    expect(() =>
      validateLocalHaplotypePayload({
        payload: {
          ...payload,
          variants: { source_variant_id: ['target-b'], alt_index: [2], freq_ac: [7] },
        },
        descriptor,
        expectedRunId: 'run-1',
        expectedRelease: 'v1',
        expectedSelectedAc: 7,
      })
    ).toThrow('incomplete target source-record set')
    expect(() =>
      validateLocalHaplotypePayload({
        payload,
        descriptor,
        expectedRunId: 'another-run',
        expectedRelease: 'v1',
        expectedSelectedAc: 7,
      })
    ).toThrow('provenance')
    expect(() =>
      validateLocalHaplotypePayload({
        payload,
        descriptor,
        expectedRunId: 'run-1',
        expectedRelease: 'v1',
        expectedSelectedAc: 8,
      })
    ).toThrow('allele count')
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
