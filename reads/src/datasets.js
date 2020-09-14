import logger from './logging'

const datasets = (process.env.DATASETS || '')
  .split(',')
  .filter(Boolean)
  .reduce(
    (acc, datasetId) => ({
      ...acc,
      [datasetId.toLowerCase()]: {
        exomes: {
          readsDirectory: process.env[`${datasetId.toUpperCase()}_EXOMES_READS_DIRECTORY`],
          publicPath: process.env[`${datasetId.toUpperCase()}_EXOMES_PUBLIC_PATH`],
        },
        genomes: {
          readsDirectory: process.env[`${datasetId.toUpperCase()}_GENOMES_READS_DIRECTORY`],
          publicPath: process.env[`${datasetId.toUpperCase()}_GENOMES_PUBLIC_PATH`],
        },
      },
    }),
    {}
  )

logger.info(`Dataset configuration: ${JSON.stringify(datasets)}`)

export default datasets
