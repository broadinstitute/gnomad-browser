const { LEVEL } = require('triple-beam')
const winston = require('winston')

// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
const LEVEL_SEVERITY = {
  error: 'ERROR',
  warn: 'WARNING',
  info: 'INFO',
  debug: 'DEBUG',
}

// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
// https://cloud.google.com/error-reporting/docs/formatting-error-messages#json_representation
// eslint-disable-next-line no-unused-vars
const cloudLogging = winston.format((info, opts) => {
  const entry = {
    [LEVEL]: info[LEVEL],
  }

  entry.severity = LEVEL_SEVERITY[info.level]

  if (typeof info === 'string') {
    entry.message = info
  }

  if (info.message) {
    entry.message = info.message
  }

  if (info.stack) {
    entry.stack_trace = info.stack
  }

  return entry
})

// eslint-disable-next-line no-unused-vars
const devLogging = winston.format((info, opts) => {
  const entry = { ...info }

  if (info.stack) {
    entry.message = info.stack
  }

  return entry
})

const format =
  process.env.NODE_ENV === 'development'
    ? winston.format.combine(
        winston.format.errors({ stack: true }),
        devLogging(),
        winston.format.cli()
      )
    : winston.format.combine(cloudLogging(), winston.format.json())

const logger = winston.createLogger({
  format,
  level: 'info',
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
  transports: [new winston.transports.Console()],
})

module.exports = logger
