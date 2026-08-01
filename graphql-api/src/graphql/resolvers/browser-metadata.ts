import { getY1AvailableCohorts } from '../../queries/long_read_y1_provenance'

const resolvers = {
  Query: {
    meta: () => ({}),
  },
  BrowserMetadata: {
    long_read_cohorts: () => getY1AvailableCohorts(),
  },
}

export default resolvers
