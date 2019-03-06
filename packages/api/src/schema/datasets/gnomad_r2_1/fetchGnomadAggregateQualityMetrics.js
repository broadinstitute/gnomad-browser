import { formatAggregateQualityMetrics } from '../aggregateQualityMetrics'

const fetchGnomadAggregateQualityMetrics = async ctx => {
  const [exomeResponse, genomeResponse] = await Promise.all(
    ['gnomad_r2_1_1_exomes', 'gnomad_r2_1_1_genomes'].map(tag =>
      ctx.database.elastic.search({
        index: 'aggregate_quality_metrics',
        type: 'metric',
        body: {
          query: {
            bool: {
              filter: {
                term: { tag },
              },
            },
          },
        },
        size: 50,
      })
    )
  )

  /* eslint-disable no-underscore-dangle */
  const exomeMetrics = exomeResponse.hits.hits.map(doc => doc._source)
  const genomeMetrics = genomeResponse.hits.hits.map(doc => doc._source)
  /* eslint-enable no-underscore-dangle */

  return {
    exome: formatAggregateQualityMetrics(exomeMetrics),
    genome: formatAggregateQualityMetrics(genomeMetrics),
  }
}

export default fetchGnomadAggregateQualityMetrics
