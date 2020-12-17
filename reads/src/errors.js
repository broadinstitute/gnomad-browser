const logger = require('./logging')

class UserVisibleError extends Error {
  constructor(...args) {
    super(...args)
    this.name = 'UserVisibleError'
    this.extensions = {
      isUserVisible: true,
    }
  }
}

const formatError = error => {
  // graphql-js doesn't distinguish between different error types, so this is the
  // only way to determine what errors come from query validation (and thus should
  // be shown to the user)
  // See https://github.com/graphql/graphql-js/issues/1847
  const isQueryValidationError =
    (error.message.startsWith('Syntax Error') &&
      error.stack.includes('graphql/error/syntaxError')) ||
    (error.message.startsWith('Cannot query field') &&
      error.stack.includes('graphql/validation/rules'))

  if (isQueryValidationError) {
    return { message: error.message, locations: error.locations }
  }

  const isUserVisible = error.extensions && error.extensions.isUserVisible

  // User visible errors (such as variant not found) are expected to occur during
  // normal use of the browser and don't need to be logged.
  if (!isUserVisible) {
    logger.warn(error)
  }

  const message = isUserVisible ? error.message : 'An unknown error occurred'
  return { message }
}

module.exports = {
  UserVisibleError,
  formatError,
}
