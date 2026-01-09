import logger from './logger'
import { createUnlimitedElasticClient } from './elasticsearch'

const GC_POOL_NAMES = ['old', 'survivor', 'young']
const GC_METRICS = ['max_in_bytes', 'peak_max_in_bytes', 'peak_used_in_bytes', 'used_in_bytes']
const LOAD_AVERAGE_METRICS = ['1m', '5m', '15m']

const isFulfilled = <T>(promise: PromiseSettledResult<T>): promise is PromiseFulfilledResult<T> =>
  promise.status === 'fulfilled'

const isRejected = (promise: PromiseSettledResult<unknown>): promise is PromiseRejectedResult =>
  !isFulfilled(promise)

const hasNonzeroTotalMetrics = (indexData: any) => {
  const searchMetrics = indexData?.total?.search || {}
  const getMetrics = indexData?.total?.get || {}
  return (
    Object.keys(searchMetrics).some((key) => key.endsWith('_total') && searchMetrics[key] > 0) ||
    Object.keys(getMetrics).some((key) => key.endsWith('_total') && getMetrics[key] > 0)
  )
}

const filterIndexStats = (indexStatsPromise: PromiseSettledResult<any>) => {
  if (isRejected(indexStatsPromise)) {
    return {}
  }
  // Internal indices start with a dot, we don't want those as a rule
  const indexData = indexStatsPromise.value?.indices || {}
  const indexNames = Object.keys(indexData)
  const nonInternalIndexNames = indexNames.filter((indexName) => indexName[0] !== '.')

  // Also ignore indices that aren't getting queried (we should clean
  // these up)
  const indicesWithMetrics = nonInternalIndexNames.filter((indexName) =>
    hasNonzeroTotalMetrics(indexData?.[indexName])
  )

  const allResult = indexStatsPromise.value?._all?.total
  const result: any = { _all: allResult }
  indicesWithMetrics.forEach((indexName) => {
    result[indexName] = indexData[indexName].total
  })
  return result
}

const filterNodeStats = (nodeStatsPromise: PromiseSettledResult<any>) => {
  if (isRejected(nodeStatsPromise)) {
    return {}
  }
  const allNodesData = nodeStatsPromise.value?.nodes || null
  if (!allNodesData) {
    return {}
  }
  const nodeNames = Object.keys(allNodesData)
  const memKeys = Object.keys(allNodesData[nodeNames[0]]?.jvm?.mem)
  const cpuKeys = Object.keys(allNodesData[nodeNames[0]]?.os?.cpu)
  const deepMemData = nodeNames.map((nodeName) => allNodesData[nodeName]?.jvm?.mem)
  const deepCpuData = nodeNames.map((nodeName) => allNodesData[nodeName]?.os?.cpu)

  const wideMemData = Object.fromEntries(
    memKeys.map((memKey) => [
      memKey,
      deepMemData.map((deepMemDataForNode) => deepMemDataForNode[memKey]),
    ])
  )

  const wideCpuData = Object.fromEntries(
    cpuKeys.map((cpuKey) => [
      cpuKey,
      deepCpuData.map((deepCpuDataForNode) => deepCpuDataForNode[cpuKey]),
    ])
  )

  const { pools, ...memData }: any = {
    ...wideMemData,
  }

  GC_POOL_NAMES.forEach((poolName) => {
    GC_METRICS.forEach((metric) => {
      memData[`${poolName}_${metric}`] = pools.map(
        (poolsForNode: any) => poolsForNode[poolName][metric]
      )
    })
  })

  const { load_average, ...cpuData }: any = { ...wideCpuData }
  LOAD_AVERAGE_METRICS.forEach((metric) => {
    cpuData[`load_average_${metric}`] = load_average.map(
      (loadAverageForNode: any) => loadAverageForNode[metric]
    )
  })

  return { nodeNames, jvm: { mem: memData }, os: { cpu: cpuData } }
}

const startEsStatsPolling = (pollInterval: number) => {
  const statsEsClient = createUnlimitedElasticClient()
  const scheduleEsStatsPoll = async () => {
    const nodeStatsPromise = statsEsClient.nodes.stats({}).then((stats) => stats.body)
    const indexStatsPromise = statsEsClient.indices
      .stats({ metric: ['get', 'search'] })
      .then((stats) => stats.body)

    Promise.allSettled([indexStatsPromise, nodeStatsPromise]).then(([indexStats, nodeStats]) => {
      logger.info({ esMetrics: { type: 'index', indexStats: filterIndexStats(indexStats) } })
      logger.info({
        esMetrics: { type: 'node', nodeStats: filterNodeStats(nodeStats) },
      })
      setTimeout(scheduleEsStatsPoll, pollInterval)
    })
  }

  scheduleEsStatsPoll()
}

export default startEsStatsPolling
