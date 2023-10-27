import { graphqlHTTP } from 'express-graphql'
import { GraphQLError, execute, getOperationAST, parse, validate } from 'graphql'
import { getVariableValues } from 'graphql/execution/values'
import queryComplexity, { directiveEstimator, simpleEstimator } from 'graphql-query-complexity'
import { isHttpError } from 'http-errors'

import config from '../config'
import logger from '../logger'

import { applyRateLimits } from './rate-limiting'
import schema from './schema'

const customParseFn = (...args: Parameters<typeof parse>) => {
  try {
    return parse(...args)
  } catch (error) {
    const graphqlError = error as GraphQLError
    // Identify parse errors so that customFormatErrorFn will allow them to be returned to the user.
    throw new GraphQLError(
      graphqlError.message,
      graphqlError.nodes,
      graphqlError.source,
      graphqlError.positions,
      graphqlError.path,
      graphqlError.originalError,
      {
        ...graphqlError.extensions,
        isParseError: true,
      }
    )
  }
}

const customValidateFn = (...args: Parameters<typeof validate>) => {
  // Identify validation errors so that customFormatErrorFn will allow them to be returned to the user.
  const validationErrors = validate(...args)

  return validationErrors.map(
    (error: any) =>
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

const formatErrorAndSetNocache = (
  error: any,
  request: any,
  graphqlRequestParams: any,
  response: any
) => {
  // Setting the nocache header in this function that's just supposed to format
  // an error is pretty gross, but given the multitude of places that this
  // API can return or throw an error, this is the only obvious spot where we
  // can intercept all errors. We can't just wrap the entire API in a try/catch
  // either and set the header in a catch, since after the API's run we've
  // already sent the response.
  //
  // Also, as written, this will no-cache not-found errors, which is
  // undesirable, but something we can put off fixing until later.

  response.set('Cache-Control', 'no-store')

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

const queryComplexityCreateError = (max: any, actual: any) => {
  return new GraphQLError(`Query is too expensive (${actual}). Maximum allowed cost is ${max}.`)
}

const graphQLApi = ({ context }: any) =>
  graphqlHTTP(async (request, response, requestParams) => ({
    schema,
    graphiql: true,
    context,

    validationRules: [
      queryComplexity({
        maximumComplexity: config.MAX_QUERY_COST,
        variables: requestParams && requestParams.variables ? requestParams.variables : undefined,
        estimators: [
          directiveEstimator({ name: 'cost' }),
          simpleEstimator({ defaultComplexity: 0 }),
        ],
        createError: queryComplexityCreateError,
        onComplete: (cost: any) => {
          ;(request as any).graphqlQueryCost = cost
          ;(request as any).graphqlParams = requestParams
        },
      }),
    ],

    customParseFn,
    customValidateFn,

    customExecuteFn: async (args: any) => {
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
        operationAST.variableDefinitions!,
        variableValues
      )
      if (variableErrors.length > 0) {
        return {
          errors: variableErrors.map(
            (error: any) =>
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
        // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
        throw new GraphQLError(error.message, undefined, undefined, undefined, undefined, error)
      }

      return execute(args)
    },

    customFormatErrorFn: (error: any) =>
      formatErrorAndSetNocache(error, request, requestParams, response),
  }))

export default graphQLApi
