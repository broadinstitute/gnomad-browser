const {
  fetchMitochondrialGenomeCoverageForRegion,
  fetchMitochondrialGenomeCoverageForGene,
  fetchMitochondrialGenomeCoverageForTranscript,
} = require('../../queries/mitochondrial-coverage-queries')

const formatMitochondrialCoverageBins = (bins) =>
  bins.map((bin) => ({
    pos: bin.pos,
    mean: bin.mean,
    median: bin.median,
    over_100: bin.over_x[0],
    over_1000: bin.over_x[1],
  }))

const resolveMitochondrialGenomeCoverageInRegion = async (obj, args, ctx) => {
  const coverage = await fetchMitochondrialGenomeCoverageForRegion(ctx.esClient, args.dataset, obj)
  return formatMitochondrialCoverageBins(coverage)
}

const resolveMitochondrialGenomeCoverageInGene = async (obj, args, ctx) => {
  const coverage = await fetchMitochondrialGenomeCoverageForGene(ctx.esClient, args.dataset, obj)
  return formatMitochondrialCoverageBins(coverage)
}

const resolveMitochondrialGenomeCoverageInTranscript = async (obj, args, ctx) => {
  const coverage = await fetchMitochondrialGenomeCoverageForTranscript(
    ctx.esClient,
    args.dataset,
    obj
  )
  return formatMitochondrialCoverageBins(coverage)
}

module.exports = {
  Gene: {
    mitochondrial_coverage: resolveMitochondrialGenomeCoverageInGene,
  },
  Region: {
    mitochondrial_coverage: resolveMitochondrialGenomeCoverageInRegion,
  },
  Transcript: {
    mitochondrial_coverage: resolveMitochondrialGenomeCoverageInTranscript,
  },
}
