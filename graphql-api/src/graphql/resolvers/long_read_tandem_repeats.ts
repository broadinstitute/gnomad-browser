import { parseTrLocusId } from '../../../../dataset-metadata/longReadTrLocusId'
import { UserVisibleError } from '../../errors'
import { fetchLongReadTrRepeatCountPlots } from '../../queries/long_read_tr_histograms'
import { fetchLongReadTrLocus, MAX_TR_LOCUS_PAGE_SIZE } from '../../queries/long_read_tr_loci'
import { getY1SourceSnapshot } from '../../queries/long_read_y1_provenance'
import { resolveLongReadTrShortReadDistributions } from '../../queries/long_read_tr_short_read_distributions'
import {
  buildLongReadTrReferenceConnection,
  legacyMatchesFromContext,
  resolveLongReadTrShortReadContext,
} from '../../queries/long_read_tr_reference'
import { getY1AncillaryRoute } from './ancillary-availability'

const resolveLongReadTandemRepeatLocus = async (_obj: any, args: any, _ctx: any) => {
  const locus = parseTrLocusId(args.id)
  if (!locus) throw new UserVisibleError('Invalid tandem-repeat locus ID')
  if (!Number.isInteger(args.first) || args.first < 1 || args.first > MAX_TR_LOCUS_PAGE_SIZE) {
    throw new UserVisibleError(`first must be between 1 and ${MAX_TR_LOCUS_PAGE_SIZE}`)
  }
  const source = await getY1SourceSnapshot(args.lr_cohort, locus.components[0].chrom)
  if (!source) return null

  try {
    const result = await fetchLongReadTrLocus({
      id: locus.canonicalId,
      cohort: args.lr_cohort,
      first: args.first,
      after: args.after,
      selectedAllele: args.allele,
      source,
    })
    if (!result) return null
    return result
  } catch (error) {
    if (error instanceof Error && error.message === 'TR_LOCUS_INVARIANT') {
      throw new UserVisibleError('Tandem-repeat locus source records violate identity invariants')
    }
    if (error instanceof Error && error.message === 'INVALID_TR_LOCUS_CURSOR') {
      throw new UserVisibleError('Invalid tandem-repeat allele cursor')
    }
    throw error
  }
}

const shortReadContext = (locus: any, ctx: any) =>
  resolveLongReadTrShortReadContext(locus, ctx.esClient, getY1SourceSnapshot)

export default {
  Query: {
    long_read_tandem_repeat_locus: resolveLongReadTandemRepeatLocus,
    long_read_tandem_repeat_reference: (_obj: any, args: any, ctx: any) =>
      buildLongReadTrReferenceConnection(args, ctx.esClient, getY1SourceSnapshot),
    long_read_tandem_repeat_short_read_distributions: (_obj: any, args: any, ctx: any) =>
      resolveLongReadTrShortReadDistributions(args, ctx.esClient, getY1SourceSnapshot),
  },
  LongReadTandemRepeatLocus: {
    short_read_context: (locus: any, _args: any, ctx: any) => shortReadContext(locus, ctx),
    short_read_matches: (locus: any, _args: any, ctx: any) =>
      legacyMatchesFromContext(shortReadContext(locus, ctx)),
    repeat_count_plots: async (locus: any) => {
      try {
        return await fetchLongReadTrRepeatCountPlots(
          locus,
          getY1AncillaryRoute(locus.lr_cohort, 'str_histogram')
        )
      } catch {
        // Optional ancillary rows must fail closed without turning an otherwise valid
        // canonical locus into a GraphQL error. In particular, a stale or malformed
        // histogram identity is unavailable; it is never rebound to another source.
        return {
          status: 'UNAVAILABLE_ANCILLARY',
          reason_code: 'ADMITTED_HISTOGRAM_COULD_NOT_BE_VALIDATED',
          identity: null,
          unit: null,
          repeat_unit: null,
          overall: null,
          callability: [],
          allele_size_distribution: [],
          genotype_distribution: [],
          max_repunits: null,
          interaction: {
            interaction_status: 'UNAVAILABLE_PLOTS',
            reason:
              'Contributor interaction is unavailable because the repeat-count plots are unavailable.',
          },
        }
      }
    },
  },
}
