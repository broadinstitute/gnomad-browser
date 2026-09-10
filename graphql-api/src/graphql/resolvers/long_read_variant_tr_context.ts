import {
  isCompleteExactTableContext,
  type LongReadTrTableCatalogContext,
} from '../../../../dataset-metadata/longReadTrCatalogContext'
import { parseTrLocusId } from '../../../../dataset-metadata/longReadTrLocusId'
import { resolveLongReadTrShortReadContext } from '../../queries/long_read_tr_reference'
import { getY1SourceSnapshot, type Y1SourceSnapshot } from '../../queries/long_read_y1_provenance'

type VariantRow = {
  allele_type?: string | null
  tr_locus_id?: string | null
  data_source?: string | null
  reference_genome?: string | null
  chrom?: string | null
  lr_cohort?: string | null
  source_release?: string | null
  source_run_id?: string | null
}

type RequestContext = { esClient: object }
type CatalogContext = LongReadTrTableCatalogContext | null

type RequestState = {
  joins: Map<string, Promise<CatalogContext>>
  sources: Map<string, Promise<Y1SourceSnapshot | null>>
  active: number
  waiting: Array<() => void>
}

// graphql-api creates a fresh context for each HTTP request. Never key this by
// esClient (which is application-scoped) or by an ALT/source-row object.
const requests = new WeakMap<RequestContext, RequestState>()

const withinLimit = async (state: RequestState, work: () => Promise<CatalogContext>) => {
  if (state.active >= 4) {
    await new Promise<void>((resolve) => state.waiting.push(resolve))
  } else {
    state.active += 1
  }
  try {
    return await work()
  } catch {
    // Catalog context is optional; even unexpected dependency errors retain rows.
    return null
  } finally {
    const next = state.waiting.shift()
    if (next) next() // Transfer the occupied slot directly to the next join.
    else state.active -= 1
  }
}

const normalizedChrom = (chrom: string) => chrom.replace(/^chr/i, '').toUpperCase()

/** A lightweight adapter to the existing exact join, not a second crosswalk. */
export const resolveVariantTrShortReadContext = (
  row: VariantRow,
  ctx: RequestContext
): Promise<CatalogContext> => {
  if (
    row.allele_type !== 'trv' ||
    row.data_source !== 'Y1_ACCEPTED' ||
    row.reference_genome !== 'GRCh38' ||
    (row.lr_cohort !== 'hgsvc_hprc' && row.lr_cohort !== 'aou') ||
    row.source_release !== 'y1' ||
    !row.source_run_id ||
    !row.chrom ||
    typeof row.tr_locus_id !== 'string'
  ) {
    return Promise.resolve(null)
  }
  const locus = parseTrLocusId(row.tr_locus_id)
  if (
    !locus ||
    locus.canonicalId !== row.tr_locus_id ||
    locus.components[0].chrom !== normalizedChrom(row.chrom)
  ) {
    return Promise.resolve(null)
  }
  const cohort = row.lr_cohort
  const release = row.source_release
  const run = row.source_run_id
  const chrom = locus.components[0].chrom
  let state = requests.get(ctx)
  if (!state) {
    state = { joins: new Map(), sources: new Map(), active: 0, waiting: [] }
    requests.set(ctx, state)
  }
  const request = state
  const key = JSON.stringify(['GRCh38', cohort, release, run, locus.canonicalId])
  const cached = request.joins.get(key)
  if (cached) return cached

  // Limiting the whole join also bounds detail fetches to four, while leaving
  // the authority's existing frozen-catalog state cache intact.
  const promise = withinLimit(request, async () => {
    const sourceKey = JSON.stringify([cohort, chrom])
    let sourcePromise = request.sources.get(sourceKey)
    if (!sourcePromise) {
      sourcePromise = Promise.resolve()
        .then(() => getY1SourceSnapshot(cohort, chrom))
        .catch(() => null)
      request.sources.set(sourceKey, sourcePromise)
    }
    const source = await sourcePromise
    if (
      !source ||
      !source.database ||
      source.run_id !== run ||
      source.release !== release ||
      source.reference_genome !== 'GRCh38' ||
      source.cohort !== cohort ||
      normalizedChrom(source.chrom) !== chrom ||
      source.load_scope !== 'full_chromosome' ||
      (source.state !== 'accepted_tasks' && source.state !== 'accepted_frozen')
    ) {
      return null
    }
    const context = await resolveLongReadTrShortReadContext(
      {
        id: locus.canonicalId,
        components: locus.components,
        chrom,
        reference_genome: 'GRCh38',
        lr_cohort: cohort,
      },
      ctx.esClient,
      async (requestedCohort, requestedChrom) =>
        requestedCohort === cohort && normalizedChrom(requestedChrom) === chrom ? source : null
    )
    // Rebind the response to independently obtained row/snapshot provenance,
    // never to expected values manufactured from the context being checked.
    return isCompleteExactTableContext(context, {
      locus,
      lrCohort: cohort,
      lrRunId: run,
      lrRelease: release,
    }) && context.lr_database === source.database
      ? context
      : null
  })
  request.joins.set(key, promise)
  return promise
}
