import type { client } from '../elasticsearch'

export interface GraphQLContext {
  esClient: typeof client
  requestId: string | null
}
