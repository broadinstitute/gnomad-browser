import { createHash } from 'node:crypto'

export type PrimaryRepeatSelectionBasis =
  | 'EXACT_MAIN_CATALOG_COMPONENT'
  | 'LR_SOLE_COMPONENT'
  | 'REVIEWED_PRIMARY_REPEAT_REGISTRY'

export type PrimaryRepeatUnavailableReason =
  | 'IDENTITY_CONTEXT_UNAVAILABLE'
  | 'WRONG_ASSEMBLY'
  | 'INVALID_STORED_MOTIF'
  | 'MAIN_REGION_NOT_EXACT_COMPONENT'
  | 'STORED_MOTIF_NOT_EXACT_COMPONENT'
  | 'NON_BIJECTIVE_COMPONENT'
  | 'CATALOG_DIGEST_MISMATCH'
  | 'REGISTRY_DIGEST_MISMATCH'
  | 'REGISTRY_NOT_REVIEWED'
  | 'REGISTRY_IDENTITY_MISMATCH'
  | 'COMPOUND_PRIMARY_REPEAT_UNREVIEWED'

type Component = { chrom: string; start0: number; end0: number; motif: string }
type RegistryEntry = {
  registry_entry_id: string
  canonical_locus_id: string
  catalog_id: string | null
  ordered_components: Component[]
  component_index: number
  motif: string
  selection_basis: 'REVIEWED_PRIMARY_REPEAT_REGISTRY'
  biological_role: string | null
  approval_state: string
}
export type PrimaryRepeatRegistry = {
  schema_version: number
  contract: string
  reference_genome: string
  approval_state: string
  entries: RegistryEntry[]
  content_sha256: string
}

export type PrimaryRepeatRegistryState = {
  registry: PrimaryRepeatRegistry
  digest_valid: boolean
  reviewed: boolean
}

export type PrimaryRepeatIdentity = {
  status: 'AVAILABLE' | 'UNAVAILABLE'
  reason_code: PrimaryRepeatUnavailableReason | null
  motif: string | null
  component_index: number | null
  component: Component | null
  selection_basis: PrimaryRepeatSelectionBasis | null
  biological_role: string | null
  catalog_id: string | null
  catalog_digest: string | null
  registry_digest: string | null
}

const canonicalJson = (value: any): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export const primaryRepeatRegistryDigest = (value: PrimaryRepeatRegistry) => {
  const { content_sha256: _digest, ...body } = value
  return createHash('sha256').update(canonicalJson(body)).digest('hex')
}

export const primaryRepeatRegistryState = (
  value: PrimaryRepeatRegistry
): PrimaryRepeatRegistryState => ({
  registry: value,
  digest_valid:
    /^[0-9a-f]{64}$/.test(value.content_sha256 || '') &&
    primaryRepeatRegistryDigest(value) === value.content_sha256,
  reviewed:
    value.schema_version === 1 &&
    value.contract === 'GNOMAD_LR_PRIMARY_REPEAT_IDENTITY_V1' &&
    value.reference_genome === 'GRCh38' &&
    value.approval_state === 'REVIEWED' &&
    value.entries.length > 0 &&
    value.entries.every((entry) => entry.approval_state === 'REVIEWED'),
})

// No reviewed override registry currently exists. Keep the future registry basis wired to an
// explicit unavailable state so a compound identity can never become available by source order.
const unavailableRegistryState = primaryRepeatRegistryState({
  schema_version: 1,
  contract: 'GNOMAD_LR_PRIMARY_REPEAT_IDENTITY_V1',
  reference_genome: 'GRCh38',
  approval_state: 'UNAVAILABLE',
  entries: [],
  content_sha256: '',
})

const normalizedChrom = (value: unknown) => String(value).replace(/^chr/i, '').toUpperCase()
const exactComponent = (left: Component | null | undefined, right: Component | null | undefined) =>
  Boolean(
    left &&
      right &&
      normalizedChrom(left.chrom) === normalizedChrom(right.chrom) &&
      left.start0 === right.start0 &&
      left.end0 === right.end0 &&
      left.motif === right.motif
  )
const exactOrderedComponents = (left: Component[], right: Component[]) =>
  left.length === right.length &&
  left.every((component, index) => exactComponent(component, right[index]))
const exactUppercaseMotif = (motif: unknown): motif is string =>
  typeof motif === 'string' && /^[A-Z]+$/.test(motif)

const unavailable = (reason_code: PrimaryRepeatUnavailableReason): PrimaryRepeatIdentity => ({
  status: 'UNAVAILABLE',
  reason_code,
  motif: null,
  component_index: null,
  component: null,
  selection_basis: null,
  biological_role: null,
  catalog_id: null,
  catalog_digest: null,
  registry_digest: null,
})

const available = ({
  component,
  componentIndex,
  basis,
  role,
  catalogId,
  catalogDigest,
  registryDigest,
}: {
  component: Component
  componentIndex: number
  basis: PrimaryRepeatSelectionBasis
  role: string | null
  catalogId: string | null
  catalogDigest: string | null
  registryDigest: string | null
}): PrimaryRepeatIdentity => ({
  status: 'AVAILABLE',
  reason_code: null,
  motif: component.motif,
  component_index: componentIndex,
  component,
  selection_basis: basis,
  biological_role: role,
  catalog_id: catalogId,
  catalog_digest: catalogDigest,
  registry_digest: registryDigest,
})

const exactCatalogBiologicalRole = (context: any) => {
  const classifications = context?.matched_reference_repeat_unit_classifications
  if (
    Array.isArray(classifications) &&
    classifications.length === 1 &&
    String(classifications[0]).toLowerCase() === 'benign'
  ) {
    return 'benign reference motif'
  }
  return null
}

const resolveExactCatalogComponent = (locus: any, context: any): PrimaryRepeatIdentity => {
  const record = context.catalog_record
  if (!record) return unavailable('IDENTITY_CONTEXT_UNAVAILABLE')
  if (!/^[0-9a-f]{64}$/.test(context.catalog_digest || '')) {
    return unavailable('CATALOG_DIGEST_MISMATCH')
  }
  if (record.main_reference_region?.reference_genome !== 'GRCh38') {
    return unavailable('WRONG_ASSEMBLY')
  }
  if (!exactUppercaseMotif(record.reference_repeat_unit)) {
    return unavailable('INVALID_STORED_MOTIF')
  }

  const regionIndices = locus.components.flatMap((component: Component, index: number) =>
    normalizedChrom(record.main_reference_region?.chrom) === normalizedChrom(component.chrom) &&
    Number(record.main_reference_region?.start) === component.start0 &&
    Number(record.main_reference_region?.stop) === component.end0
      ? [index]
      : []
  )
  if (!regionIndices.length) return unavailable('MAIN_REGION_NOT_EXACT_COMPONENT')
  if (regionIndices.length !== 1) return unavailable('NON_BIJECTIVE_COMPONENT')

  const componentIndex = regionIndices[0]
  const component = locus.components[componentIndex]
  if (record.reference_repeat_unit !== component.motif) {
    return unavailable('STORED_MOTIF_NOT_EXACT_COMPONENT')
  }
  if (
    context.matched_component_index !== componentIndex ||
    !exactComponent(context.matched_component, component)
  ) {
    return unavailable('NON_BIJECTIVE_COMPONENT')
  }

  return available({
    component,
    componentIndex,
    basis: 'EXACT_MAIN_CATALOG_COMPONENT',
    role: exactCatalogBiologicalRole(context),
    catalogId: record.id,
    catalogDigest: context.catalog_digest,
    registryDigest: null,
  })
}

const matchingRegistryEntries = (state: PrimaryRepeatRegistryState, locus: any) =>
  state.registry.entries.filter((entry) => entry.canonical_locus_id === locus.id)

const resolveFutureRegistryComponent = (
  locus: any,
  state: PrimaryRepeatRegistryState
): PrimaryRepeatIdentity => {
  const entries = matchingRegistryEntries(state, locus)
  if (!entries.length) return unavailable('COMPOUND_PRIMARY_REPEAT_UNREVIEWED')
  if (!state.digest_valid) return unavailable('REGISTRY_DIGEST_MISMATCH')
  if (!state.reviewed) return unavailable('REGISTRY_NOT_REVIEWED')
  if (entries.length !== 1) return unavailable('REGISTRY_IDENTITY_MISMATCH')

  const entry = entries[0]
  if (
    entry.selection_basis !== 'REVIEWED_PRIMARY_REPEAT_REGISTRY' ||
    !exactOrderedComponents(entry.ordered_components, locus.components) ||
    !Number.isInteger(entry.component_index) ||
    entry.component_index < 0 ||
    entry.component_index >= locus.components.length ||
    entry.motif !== locus.components[entry.component_index].motif
  ) {
    return unavailable('REGISTRY_IDENTITY_MISMATCH')
  }

  const component = locus.components[entry.component_index]
  if (!exactUppercaseMotif(component.motif)) return unavailable('INVALID_STORED_MOTIF')
  return available({
    component,
    componentIndex: entry.component_index,
    basis: 'REVIEWED_PRIMARY_REPEAT_REGISTRY',
    role: entry.biological_role,
    catalogId: entry.catalog_id,
    catalogDigest: null,
    registryDigest: state.registry.content_sha256,
  })
}

export const resolveLongReadTrPrimaryRepeat = (
  locus: any,
  context: any,
  state: PrimaryRepeatRegistryState = unavailableRegistryState
): PrimaryRepeatIdentity => {
  if (locus.reference_genome !== 'GRCh38') return unavailable('WRONG_ASSEMBLY')
  if (context?.status === 'EXACT_UNIQUE') return resolveExactCatalogComponent(locus, context)

  // An ambiguous, unavailable, or stale known-locus context is not anonymous and must not
  // silently fall back to source order. Only an explicit NONE result admits the anonymous path.
  if (context?.status !== 'NONE') return unavailable('IDENTITY_CONTEXT_UNAVAILABLE')

  if (locus.components.length === 1) {
    const component = locus.components[0]
    if (!exactUppercaseMotif(component.motif)) return unavailable('INVALID_STORED_MOTIF')
    return available({
      component,
      componentIndex: 0,
      basis: 'LR_SOLE_COMPONENT',
      role: null,
      catalogId: null,
      catalogDigest: null,
      registryDigest: null,
    })
  }

  return resolveFutureRegistryComponent(locus, state)
}
