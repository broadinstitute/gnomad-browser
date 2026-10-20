import { TrLocusComponent, TrLocusId } from './longReadTrLocusId'

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
 * or independently validate a digest. Tables additionally bind row/source identity.
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
