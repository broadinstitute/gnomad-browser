import { TrLocusComponent, TrLocusId } from './longReadTrLocusId'
import { condenseLongReadMotifs } from './longReadTablePresentation'

export type LongReadTrCatalogCohort = 'hgsvc_hprc' | 'aou'

/** Minimal browser-neutral projection; the full locus-page record also satisfies it. */
export type LongReadTrCatalogContext = {
  status: string
  reason_code: string | null
  catalog_dataset: string
  catalog_source: string
  catalog_digest: string
  catalog_record: {
    id: string
    reference_repeat_unit: string
    main_reference_region: {
      reference_genome: string
      chrom: string
      start: number
      stop: number
    }
  } | null
  matched_component_index: number | null
  matched_component: TrLocusComponent | null
  matched_reference_region_index: number | null
  lr_database: string | null
  lr_release: string | null
  lr_run_id: string | null
  lr_cohort: LongReadTrCatalogCohort | null
}

export type CatalogRepeatUnit = { repeat_unit: string; classification: string }

/** Dedicated gene-query selection, not a claim to contain the full catalog record. */
export type LongReadTrTableCatalogContext = Omit<LongReadTrCatalogContext, 'catalog_record'> & {
  catalog_record:
    | (NonNullable<LongReadTrCatalogContext['catalog_record']> & {
        repeat_units: CatalogRepeatUnit[]
      })
    | null
}

type CompleteExactContext<T extends LongReadTrCatalogContext> = T & {
  catalog_record: NonNullable<T['catalog_record']>
  matched_component_index: number
  matched_component: TrLocusComponent
  matched_reference_region_index: number
}

/**
 * Existing LR-page completeness gate, extracted without changing its behavior.
 * This consumes a resolver-validated response; it does not perform a catalog join
 * or independently validate a digest. Page wiring is intentionally separate.
 */
export const isCompleteExactContext = <T extends LongReadTrCatalogContext>(
  context: T | null | undefined,
  lrCohort: LongReadTrCatalogCohort
): context is CompleteExactContext<T> =>
  Boolean(
    context?.status === 'EXACT_UNIQUE' &&
      context.catalog_dataset &&
      context.catalog_source &&
      context.catalog_digest &&
      context.catalog_record?.id &&
      context.catalog_record.reference_repeat_unit &&
      context.catalog_record.main_reference_region &&
      context.matched_component_index != null &&
      context.matched_component &&
      context.matched_reference_region_index != null &&
      context.lr_database &&
      context.lr_release &&
      context.lr_run_id &&
      context.lr_cohort === lrCohort
  )

export type LongReadTrTableCatalogScope = {
  locus: TrLocusId
  lrCohort: LongReadTrCatalogCohort
  lrRunId: string
  lrRelease: string
}

/** Additional table gate: bind validated context to THIS row's exact locus and source. */
export const isCompleteExactTableContext = (
  context: LongReadTrTableCatalogContext | null | undefined,
  scope: LongReadTrTableCatalogScope
): context is CompleteExactContext<LongReadTrTableCatalogContext> => {
  if (!isCompleteExactContext(context, scope.lrCohort)) return false
  const component = scope.locus.components[context.matched_component_index]
  return Boolean(
    context.reason_code === null &&
      context.catalog_dataset === 'gnomad_r4' &&
      /^[a-f0-9]{64}$/.test(context.catalog_digest) &&
      context.catalog_record.main_reference_region.reference_genome === 'GRCh38' &&
      Number.isSafeInteger(context.matched_component_index) &&
      Number.isSafeInteger(context.matched_reference_region_index) &&
      context.matched_reference_region_index >= 0 &&
      component &&
      component.chrom === context.matched_component.chrom &&
      component.start0 === context.matched_component.start0 &&
      component.end0 === context.matched_component.end0 &&
      component.motif === context.matched_component.motif &&
      context.catalog_record.reference_repeat_unit === component.motif &&
      scope.lrRunId &&
      scope.lrRelease &&
      context.lr_run_id === scope.lrRunId &&
      context.lr_release === scope.lrRelease &&
      Array.isArray(context.catalog_record.repeat_units)
  )
}

/**
 * Exact catalog strings only, never observed-allele classification. A conflicting
 * classification for ANY exact string fails the entire pathogenic list closed.
 * null denotes conflict; [] denotes a valid catalog with no pathogenic motifs.
 */
export const selectCatalogPathogenicMotifs = (
  units: readonly CatalogRepeatUnit[]
): string[] | null => {
  const classifications = new Map<string, string>()
  for (const unit of units) {
    if (
      classifications.has(unit.repeat_unit) &&
      classifications.get(unit.repeat_unit) !== unit.classification
    ) {
      return null
    }
    classifications.set(unit.repeat_unit, unit.classification)
  }
  return [...classifications.entries()]
    .filter(([, classification]) => classification === 'pathogenic')
    .map(([motif]) => motif)
}

export const CATALOG_PATHOGENIC_CONTEXT_EXPLANATION =
  'Motifs reported as pathogenic when expanded at this catalog locus. Reference/disease context only; not evidence that an LR allele contains this motif or meets a pathogenic threshold.'

/** Null denies all catalog context/link; a null line alone does not deny the catalog. */
export const getTrTableCatalogPresentation = (
  context: LongReadTrTableCatalogContext | null | undefined,
  scope: LongReadTrTableCatalogScope
) => {
  if (!isCompleteExactTableContext(context, scope)) return null
  const motifs = selectCatalogPathogenicMotifs(context.catalog_record.repeat_units)
  return {
    context,
    pathogenicMotifs: motifs,
    pathogenicLine:
      motifs && motifs.length > 0 ? condenseLongReadMotifs(motifs, 'Catalog pathogenic: ') : null,
    explanation: CATALOG_PATHOGENIC_CONTEXT_EXPLANATION,
  }
}
