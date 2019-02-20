import { fromJS, List } from 'immutable'

export {
  default as GenesTrack
} from './GenesTrack'

export const formatGenes = genes => genes.map(gene => ({
  gene_id: gene.gene_id,
  name: gene.gene_name,
  start: gene.start,
  stop: gene.stop,
  exonIntervals: gene.transcript.exons.filter(exon => exon.feature_type === 'CDS').map(exon => ({ start: exon.start, stop: exon.stop })),
}))

export const createTracks = (genesToMap, xScale) => {
  const previousGeneIsNotTooClose = (gene, previousGene) => {
    const previousGeneWidth = xScale(gene.get('start')) - xScale(previousGene.get('stop'))
    return (previousGeneWidth > 60)
  }
  const genes = fromJS(genesToMap)
  return genes
    .filter(gene => gene.get('exonIntervals').size > 0)
    .reduce((acc, gene, geneIndex) => {
      if (geneIndex === 0) {
        return acc.push(List([gene]))
      }
      let wasAdded = false
      return acc.reduce((tracks, track, trackIndex) => {
        if (wasAdded) {
          return tracks
        }
        const previousGene = track.last()
        if (previousGeneIsNotTooClose(gene, previousGene)) {
          wasAdded = true
          return tracks.set(trackIndex, tracks.get(trackIndex).push(gene))
        }
        if ((trackIndex === tracks.size - 1) && !wasAdded) {
          return tracks.push(List([gene]))
        }
        return tracks
      }, acc)
    }, new List())
}
