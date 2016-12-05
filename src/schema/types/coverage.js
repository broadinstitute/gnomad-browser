/* eslint-disable camelcase */

import R from 'ramda'
import {
  GraphQLObjectType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLString,
} from 'graphql'

const coverageType = new GraphQLObjectType({
  name: 'Coverage',
  fields: () => ({
    _id: { type: GraphQLString },
    // 10: { type: GraphQLFloat },
    xpos: { type: GraphQLInt },
    // 15: { type: GraphQLFloat },
    // 25: { type: GraphQLFloat },
    // 30: { type: GraphQLFloat },
    median: { type: GraphQLFloat },
    pos: { type: GraphQLFloat },
    // 50: { type: GraphQLFloat },
    // 1: { type: GraphQLFloat },
    // 5: { type: GraphQLFloat },
    // 20: { type: GraphQLFloat },
    // 100: { type: GraphQLFloat },
    mean: { type: GraphQLFloat },
  }),
})

export default coverageType

export const lookUpCoverageByStartStop = (db, collection, xstart, xstop) => {
  const result = db.collection(collection).find({ xpos: { '$gte': Number(xstart), '$lte': Number(xstop) } }).toArray()
  return result
  // result.then(data => {
  //   const processed = R.pipe(
  //     R.splitEvery(10),
  //     // R.tap(console.log),
  //     R.take(1),
  //     R.flatten,
  //   )(data)
  //   // console.log(processed)
  //   return processed
  // })
}
  // db.exome_coverage.find({ xpos: { "$gte": 1055505222, "$lte": 1055530526 } })
