import type { client } from '../elasticsearch'
import type { ParquetDataStore } from '../parquet-data-store'

export interface GraphQLContext {
  esClient: typeof client
  parquetDataStore: ParquetDataStore | null
  requestId: string | null
}
