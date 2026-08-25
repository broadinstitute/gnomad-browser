import type { HaplotypeCluster, HaplotypeGroup } from '../Haplotypes'
import type {
  HaplotypeTargetDescriptor,
  RawPayload,
  TargetDisplaySidecar,
} from '../Haplotypes/haplotypeCompute'

const GRCH38_CONTIG_LENGTHS: Readonly<Record<string, number>> = Object.freeze({
  '1': 248956422,
  '2': 242193529,
  '3': 198295559,
  '4': 190214555,
  '5': 181538259,
  '6': 170805979,
  '7': 159345973,
  '8': 145138636,
  '9': 138394717,
  '10': 133797422,
  '11': 135086622,
  '12': 133275309,
  '13': 114364328,
  '14': 107043718,
  '15': 101991189,
  '16': 90338345,
  '17': 83257441,
  '18': 80373285,
  '19': 58617616,
  '20': 64444167,
  '21': 46709983,
  '22': 50818468,
  X: 156040895,
  Y: 57227415,
  M: 16569,
})

const normalizedChrom = (chrom: string) => chrom.replace(/^chr/i, '')

export const buildLocalHaplotypeTargetDescriptor = ({
  chrom,
  envelopeStart,
  envelopeStop,
  sourceVariantIds,
  selectedExactAlleleId,
}: {
  chrom: string
  envelopeStart: number
  envelopeStop: number
  sourceVariantIds: readonly string[]
  selectedExactAlleleId: string
}): HaplotypeTargetDescriptor => {
  const bareChrom = normalizedChrom(chrom)
  const contigLength = GRCH38_CONTIG_LENGTHS[bareChrom]
  if (!contigLength) throw new Error(`Unsupported GRCh38 contig: ${chrom}`)
  if (envelopeStart < 1 || envelopeStop < envelopeStart || envelopeStop > contigLength) {
    throw new Error('Invalid canonical tandem-repeat envelope')
  }

  return {
    canonical_envelope: { chrom: bareChrom, start: envelopeStart, stop: envelopeStop },
    source_variant_ids: [...sourceVariantIds],
    selected_exact_allele_id: selectedExactAlleleId,
    fixed_window: {
      chrom: bareChrom,
      start: Math.max(1, envelopeStart - 50_000),
      stop: Math.min(contigLength, envelopeStop + 50_000),
      flank_size: 50_000,
    },
  }
}

export const exactAlleleIdentity = (sourceVariantId: string, altIndex: number) =>
  `${sourceVariantId}~${altIndex}`

/** Fail closed before transferring a target-aware payload to the worker. */
export const validateLocalHaplotypePayload = ({
  payload,
  descriptor,
  expectedRunId,
  expectedRelease,
}: {
  payload: RawPayload
  descriptor: HaplotypeTargetDescriptor
  expectedRunId: string
  expectedRelease: string
}) => {
  const echoed = payload.target_descriptor
  if (
    !echoed ||
    echoed.selected_exact_allele_id !== descriptor.selected_exact_allele_id ||
    echoed.fixed_window.chrom !== descriptor.fixed_window.chrom ||
    echoed.fixed_window.start !== descriptor.fixed_window.start ||
    echoed.fixed_window.stop !== descriptor.fixed_window.stop ||
    echoed.source_variant_ids.length !== descriptor.source_variant_ids.length ||
    echoed.source_variant_ids.some((id, index) => id !== descriptor.source_variant_ids[index])
  ) {
    throw new Error('Haplotype response did not preserve the complete target descriptor')
  }

  const sourceIds = payload.variants.source_variant_id || []
  const altIndices = payload.variants.alt_index || []
  const presentSourceIds = new Set(sourceIds.filter((id): id is string => Boolean(id)))
  const missingSourceIds = descriptor.source_variant_ids.filter((id) => !presentSourceIds.has(id))
  const selectedMatchCount = sourceIds.filter(
    (sourceId, index) =>
      sourceId != null &&
      altIndices[index] != null &&
      exactAlleleIdentity(sourceId, Number(altIndices[index])) ===
        descriptor.selected_exact_allele_id
  ).length
  if (missingSourceIds.length > 0 || selectedMatchCount !== 1) {
    throw new Error('Haplotype response has an incomplete target source-record set')
  }

  const provenance = (
    payload as RawPayload & {
      provenance?: {
        available?: boolean
        source?: string
        release?: string
        run_id?: string | null
        cohort?: string
        chromosome?: string
      }
    }
  ).provenance
  if (
    !provenance?.available ||
    provenance.source !== 'Y1_ACCEPTED' ||
    provenance.run_id !== expectedRunId ||
    provenance.release !== expectedRelease ||
    provenance.cohort !== 'hgsvc_hprc' ||
    normalizedChrom(provenance.chromosome || '') !== descriptor.fixed_window.chrom
  ) {
    throw new Error('Haplotype response provenance does not match the tandem-repeat locus')
  }
}

const copyIdentity = ({
  sample_id: sampleId,
  vcf_strand: strand,
  phase_set: phaseSet,
}: {
  sample_id: string
  vcf_strand?: string | number | null
  phase_set?: string | number | null
}) => `${sampleId}\u0000${strand ?? ''}\u0000${phaseSet ?? ''}`

export type LocalTargetClusterRow = Readonly<{
  clusterId: string
  label: string
  representedCopyCount: number
  selectedCopyCount: number
  selectedFraction: number
  exactAlleleIds: readonly string[]
  assignmentStatus: 'homogeneous' | 'mixed' | 'unassigned'
}>

/**
 * Join display-only target assignments to an already computed cluster cut.
 * Exact target identity never participates in membership or row ordering.
 */
export const localTargetRows = ({
  clusters,
  groups,
  sidecar,
}: {
  clusters: readonly HaplotypeCluster[]
  groups: readonly HaplotypeGroup[]
  sidecar: TargetDisplaySidecar
}): LocalTargetClusterRow[] => {
  const groupByHash = new Map(groups.map((group) => [String(group.hash), group]))
  const assignmentByCopy = new Map(
    Object.values(sidecar.by_carrier).map((assignment) => [copyIdentity(assignment), assignment])
  )

  return clusters.map((cluster, index) => {
    const copyKeys = new Set<string>()
    cluster.member_group_hashes.forEach((hash) => {
      groupByHash.get(String(hash))?.samples.forEach((sample) => copyKeys.add(copyIdentity(sample)))
    })
    const assignments = [...copyKeys]
      .map((key) => assignmentByCopy.get(key))
      .filter((assignment): assignment is NonNullable<typeof assignment> => assignment != null)
    const exactAlleleIds = [
      ...new Set(assignments.flatMap((assignment) => assignment.exact_allele_ids)),
    ].sort()
    const selectedCopyCount = assignments.filter(
      (assignment) => assignment.is_selected_exact_allele
    ).length
    const representedCopyCount = copyKeys.size
    let assignmentStatus: LocalTargetClusterRow['assignmentStatus'] = 'mixed'
    if (exactAlleleIds.length === 0) assignmentStatus = 'unassigned'
    else if (exactAlleleIds.length === 1) assignmentStatus = 'homogeneous'

    return {
      clusterId: cluster.cluster_id,
      label: `Cluster ${index + 1}`,
      representedCopyCount,
      selectedCopyCount,
      selectedFraction: representedCopyCount ? selectedCopyCount / representedCopyCount : 0,
      exactAlleleIds,
      assignmentStatus,
    }
  })
}

export const serializeTargetDescriptor = (descriptor: HaplotypeTargetDescriptor) => {
  const serialized = JSON.stringify(descriptor)
  if (serialized.length > 32_768) throw new Error('Target descriptor is too large')
  return serialized
}
