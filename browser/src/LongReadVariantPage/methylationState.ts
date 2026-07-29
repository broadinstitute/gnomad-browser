import type { Methylation } from '../Haplotypes'

export type MethylationSourceScope = {
  modality?: string | null
  source?: string | null
  release?: string | null
  cohort?: string | null
  reference_genome?: string | null
  chromosome?: string | null
  run_id?: string | null
  status?: string | null
  // Not exposed by current provenance; reserved as required full-contract identity.
  ancillary_run_id?: string | null
  source_version?: string | null
  source_manifest_hash?: string | null
  orientation_receipt?: string | null
}

export type MethylationBatch = {
  records: Methylation[]
  completedSampleIds: string[]
}

type FutureMethylationEnvelope = {
  records?: Methylation[] | null
  completed_sample_ids?: string[] | null
  completed_samples?: string[] | null
}

export type MethylationRequestToken = {
  id: number
  scope: string
  controller: AbortController
}

/**
 * One gate is used per request flow. IDs never repeat, so an old HGSVC response
 * cannot become current again after an HGSVC -> AoU -> HGSVC transition.
 */
export class MethylationRequestGate {
  private nextId = 0

  private currentToken: MethylationRequestToken | null = null

  begin(scope: string): MethylationRequestToken {
    this.invalidate()
    this.nextId += 1
    const token = {
      id: this.nextId,
      scope,
      controller: new AbortController(),
    }
    this.currentToken = token
    return token
  }

  invalidate() {
    this.currentToken?.controller.abort()
    this.currentToken = null
    this.nextId += 1
  }

  isCurrent(token: MethylationRequestToken): boolean {
    return !token.controller.signal.aborted &&
      this.currentToken?.id === token.id &&
      this.currentToken.scope === token.scope
  }

  cancel(token: MethylationRequestToken) {
    token.controller.abort()
    if (this.currentToken?.id === token.id) this.currentToken = null
  }
}

/** Pass the token's abort signal to a request and suppress any late response. */
export const responseForCurrentMethylationRequest = async <T>(
  gate: MethylationRequestGate,
  token: MethylationRequestToken,
  request: (signal: AbortSignal) => Promise<T>
): Promise<T | undefined> => {
  const response = await request(token.controller.signal)
  return gate.isCurrent(token) ? response : undefined
}

/**
 * Scope requests by every source identity currently exposed to the browser.
 * Before SOURCE_PHASED is enabled, extend this input with ancillary run,
 * manifest, and orientation-receipt identities rather than inferring them from
 * VCF strand or source haplotype.
 */
export const methylationRequestScope = ({
  cohort,
  chrom,
  start,
  stop,
  dataLayer,
  source,
  enabled,
}: {
  cohort: string
  chrom: string
  start: number
  stop: number
  dataLayer: 'SAMPLE_TOTAL' | 'SOURCE_PHASED'
  source?: MethylationSourceScope | null
  enabled: boolean
}) => JSON.stringify([
  cohort,
  chrom,
  start,
  stop,
  dataLayer,
  enabled,
  source?.modality ?? 'METHYLATION',
  source?.source ?? null,
  source?.release ?? null,
  source?.cohort ?? null,
  source?.reference_genome ?? null,
  source?.chromosome ?? null,
  source?.run_id ?? null,
  source?.status ?? null,
  source?.ancillary_run_id ?? null,
  source?.source_version ?? null,
  source?.source_manifest_hash ?? null,
  source?.orientation_receipt ?? null,
])

/**
 * Complete identity available on today's compatibility records. The request
 * scope supplies release/cohort/reference/modality/run identity. Nullable row
 * fields make the future extension to source/run/manifest/orientation identity
 * explicit without treating SAMPLE_TOTAL rows as phased observations.
 */
export const methylationRecordIdentity = (
  requestScope: string,
  row: Methylation
): string => JSON.stringify([
  requestScope,
  row.data_layer ?? 'SAMPLE_TOTAL',
  row.chr,
  row.pos1,
  row.pos2,
  row.sample,
  row.source_haplotype ?? null,
  row.vcf_strand ?? null,
  row.phase_set ?? null,
  row.ancillary_run_id ?? null,
  row.source_version ?? null,
  row.source_manifest_hash ?? null,
])

export const mergeMethylationRecords = (
  previous: ReadonlyMap<string, Methylation>,
  records: Methylation[],
  requestScope: string
): Map<string, Methylation> => {
  if (records.length === 0) return new Map(previous)
  const merged = new Map(previous)
  records.forEach((record) => {
    merged.set(methylationRecordIdentity(requestScope, record), record)
  })
  return merged
}

export const methylationSampleIdentity = (
  requestScope: string,
  sampleId: string
): string => JSON.stringify([requestScope, sampleId])

export const incompleteMethylationSampleIds = (
  sampleIds: string[],
  completedIdentities: ReadonlySet<string>,
  requestScope: string
): string[] => sampleIds.filter(
  (sampleId) => !completedIdentities.has(methylationSampleIdentity(requestScope, sampleId))
)

/**
 * The compatibility field is an array, where a successful empty array means
 * every requested sample completed with zero regional CpG rows. A future
 * envelope may narrow completion with explicit metadata.
 */
export const methylationBatchFromGraphQL = (
  result: any,
  requestedSampleIds: string[]
): MethylationBatch | null => {
  // `methylation_region` is the additive future envelope name; the existing
  // list field remains the compatibility contract.
  const payload: Methylation[] | FutureMethylationEnvelope | null | undefined =
    result?.data?.methylation_region ?? result?.data?.methylation

  if (Array.isArray(payload)) {
    return { records: payload, completedSampleIds: [...requestedSampleIds] }
  }
  if (!payload || !Array.isArray(payload.records)) return null

  const explicitCompleted = payload.completed_sample_ids ?? payload.completed_samples
  return {
    records: payload.records,
    completedSampleIds: explicitCompleted == null
      ? [...requestedSampleIds]
      : explicitCompleted.filter((sampleId) => requestedSampleIds.includes(sampleId)),
  }
}
