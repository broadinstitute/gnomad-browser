const { graphqlHTTP } = require('express-graphql')
const { GraphQLError, execute, parse, validate } = require('graphql')
const {
  default: queryComplexity,
  directiveEstimator,
  simpleEstimator,
} = require('graphql-query-complexity')

const config = require('../config')
const logger = require('../logger')

const { applyRateLimits } = require('./rate-limiting')
const schema = require('./schema')

const customParseFn = (...args) => {
  try {
    return parse(...args)
  } catch (error) {
    // Identify parse errors so that customFormatErrorFn will allow them to be returned to the user.
    throw new GraphQLError(
      error.message,
      error.nodes,
      error.source,
      error.positions,
      error.path,
      error.originalError,
      {
        ...error.extensions,
        isParseError: true,
      }
    )
  }
}

const customValidateFn = (...args) => {
  // Identify validation errors so that customFormatErrorFn will allow them to be returned to the user.
  const validationErrors = validate(...args)

  return validationErrors.map(
    (error) =>
      new GraphQLError(
        error.message,
        error.nodes,
        error.source,
        error.positions,
        error.path,
        error.originalError,
        {
          ...error.extensions,
          isValidationError: true,
        }
      )
  )
}

const customFormatErrorFn = (error, request) => {
  if (!(error instanceof GraphQLError)) {
    return error
  }

  if (error.extensions && (error.extensions.isParseError || error.extensions.isValidationError)) {
    return new GraphQLError(
      error.message,
      error.nodes,
      error.source,
      error.positions,
      error.path,
      error.originalError,
      undefined // Remove extensions
    )
  }

  const isUserVisible = error.extensions && error.extensions.isUserVisible

  // User visible errors (such as variant not found) are expected to occur during normal use of the
  // browser and do not need to be logged.
  if (!isUserVisible) {
    logger.error({
      message: error.stack,
      context: {
        httpRequest: {
          requestMethod: request.method,
          requestUrl: `${request.protocol}://${request.hostname}${
            request.originalUrl || request.url
          }`,
          userAgent: request.headers['user-agent'],
          remoteIp: request.ip,
          referer: request.headers.referer || request.headers.referrer,
          protocol: `HTTP/${request.httpVersionMajor}.${request.httpVersionMinor}`,
        },
      },
    })
  }

  const message = isUserVisible ? error.message : 'An unknown error occurred'
  return { message }
}

const queryComplexityCreateError = (max, actual) => {
  return new GraphQLError(`Query is too expensive (${actual}). Maximum allowed cost is ${max}.`)
}

module.exports = ({ context }) =>
  graphqlHTTP(async (request, response, { variables }) => ({
    schema,
    graphiql: true,
    context,
    validationRules: [
      queryComplexity({
        maximumComplexity: config.MAX_QUERY_COST,
        variables,
        estimators: [
          directiveEstimator({ name: 'cost' }),
          simpleEstimator({ defaultComplexity: 0 }),
        ],
        createError: queryComplexityCreateError,
        onComplete: (cost) => {
          request.graphqlQueryCost = cost
        },
      }),
    ],
    customParseFn,
    customValidateFn,
    customExecuteFn: async (...args) => {
      // Apply rate limit before executing query.
      await applyRateLimits(request)

      return execute(...args)
    },
    customFormatErrorFn: (error) => customFormatErrorFn(error, request),
  }))
