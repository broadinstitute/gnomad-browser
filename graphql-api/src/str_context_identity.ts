// Pure versioned identity rules shared by offline generation and API admission.
// No API/config imports: accepting a name is NOT schema, snapshot or data admission.
import { createHash } from 'node:crypto'

export const STR_CONTEXT_PROJECTION_VERSION = 'str-context-v2.3'

const canonical = (value: any): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
export const strContextDigest = (value: unknown) =>
  createHash('sha256').update(canonical(value)).digest('hex')

const isolatedId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value) &&
  value.length <= 80 &&
  !value.split('_').some((part) => ['current', 'live'].includes(part))

export const isSupportedContextPrimaryDatabase = (value: unknown): boolean => {
  if (typeof value !== 'string') return false
  const match = /^gnomad_lr_y1_scratch_v(?:5|6)_(.+)$/.exec(value)
  return !!match && isolatedId(match[1])
}

export type ContextNamespaces = {
  database: string // Fresh projection target; never the capture database.
  run_id: string // Immutable physical capture key, also used by route/mapping/query.
  cohort: string
  capture: { database: string; run_id: string }
  projection: { instance_id: string }
}

export const validateContextNamespaces = (r: ContextNamespaces): void => {
  if (
    !r ||
    !['aou', 'hgsvc_hprc'].includes(r.cohort) ||
    !isolatedId(r.run_id) ||
    !r.capture ||
    r.capture.run_id !== r.run_id ||
    r.capture.database !== `gnomad_lr_y1_scratch_histogram_${r.cohort}_${r.run_id}` ||
    !r.projection ||
    !isolatedId(r.projection.instance_id) ||
    r.database !==
      `gnomad_lr_y1_scratch_histogram_projection_${r.cohort}_${r.projection.instance_id}` ||
    r.database === r.capture.database
  ) {
    throw new Error('Invalid context capture/projection namespace identity')
  }
}
