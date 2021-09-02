const { graphqlHTTP } = require('express-graphql')
const { GraphQLError, execute, getOperationAST, parse, validate } = require('graphql')
const { getVariableValues } = require('graphql/execution/values')
const {
  default: queryComplexity,
  directiveEstimator,
  simpleEstimator,
} = require('graphql-query-complexity')
const { isHttpError } = require('http-errors')

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

const customFormatErrorFn = (error, request, graphqlRequestParams) => {
  if (isHttpError(error.originalError)) {
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
        graphql: graphqlRequestParams,
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
  graphqlHTTP(async (request, response, requestParams) => ({
    schema,
    graphiql: true,
    context,
    validationRules: [
      queryComplexity({
        maximumComplexity: config.MAX_QUERY_COST,
        variables: requestParams.variables,
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
    customExecuteFn: async (args) => {
      const { document, operationName, variableValues } = args

      const operationAST = getOperationAST(document, operationName)
      if (!operationAST) {
        return {
          errors: [
            new GraphQLError(
              `Unknown operation "${operationName}"`,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              {
                isUserVisible: true,
              }
            ),
          ],
        }
      }

      // Catch problems with variable values (missing required values, invalid enum values, etc) and return them to the user.
      const { errors: variableErrors = [] } = getVariableValues(
        schema,
        operationAST.variableDefinitions,
        variableValues
      )
      if (variableErrors.length > 0) {
        return {
          errors: variableErrors.map(
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
                  isUserVisible: true,
                }
              )
          ),
        }
      }

      // Apply rate limit before executing query.
      try {
        await applyRateLimits(request)
      } catch (error) {
        // Throw GraphQLErrors from GraphQL execution.
        // Errors must be wrapped in GraphQLError for customFormatErrorFn to handle them correctly.
        throw new GraphQLError(error.message, undefined, undefined, undefined, undefined, error)
      }

      return execute(args)
    },
    customFormatErrorFn: (error) => customFormatErrorFn(error, request, requestParams),
  }))
