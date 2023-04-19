import {
  fetchMitochondrialGenomeCoverageForRegion,
  fetchMitochondrialGenomeCoverageForGene,
  fetchMitochondrialGenomeCoverageForTranscript,
} from '../../queries/mitochondrial-coverage-queries'

const formatMitochondrialCoverageBins = (bins: any) =>
  bins.map((bin: any) => ({
    pos: bin.pos,
    mean: bin.mean,
    median: bin.median,
    over_100: bin.over_x[0],
    over_1000: bin.over_x[1],
  }))

const resolveMitochondrialGenomeCoverageInRegion = async (obj: any, args: any, ctx: any) => {
  const coverage = await fetchMitochondrialGenomeCoverageForRegion(ctx.esClient, args.dataset, obj)
  return formatMitochondrialCoverageBins(coverage)
}

const resolveMitochondrialGenomeCoverageInGene = async (obj: any, args: any, ctx: any) => {
  const coverage = await fetchMitochondrialGenomeCoverageForGene(ctx.esClient, args.dataset, obj)
  return formatMitochondrialCoverageBins(coverage)
}

const resolveMitochondrialGenomeCoverageInTranscript = async (obj: any, args: any, ctx: any) => {
  const coverage = await fetchMitochondrialGenomeCoverageForTranscript(
    ctx.esClient,
    args.dataset,
    obj
  )
  return formatMitochondrialCoverageBins(coverage)
}

const resolvers = {
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

export default resolvers
