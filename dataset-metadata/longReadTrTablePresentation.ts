import { TrLocusId, trLocusDisplayEnvelope } from './longReadTrLocusId'
import { abbreviateLongReadTableLabel, condenseLongReadMotifs } from './longReadTablePresentation'

/** Table-only copy; getTrLocusRowDisplay retains its existing full-label contract. */
export const getTrLocusTableDisplay = (locus: TrLocusId) => {
  const envelope = trLocusDisplayEnvelope(locus)
  const fullLabel = `${envelope.chrom}-${envelope.start1}-${envelope.end1}-TR`
  return {
    canonicalId: locus.canonicalId,
    fullLabel,
    compactLabel: abbreviateLongReadTableLabel(fullLabel),
    storedMotifs: condenseLongReadMotifs(
      locus.components.map((component) => component.motif),
      'Stored: '
    ),
    orderedComponentCount: locus.components.length,
  }
}
