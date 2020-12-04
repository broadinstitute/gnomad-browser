// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
const Severity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
}

const formatLogEntry = (obj) => {
  // https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
  // https://cloud.google.com/error-reporting/docs/formatting-error-messages#json_representation
  const record = {}

  if (typeof obj === 'string') {
    record.message = obj
  } else {
    if (obj.message) {
      record.message = obj.message
    }

    if (obj.stack) {
      record.message = obj.stack
    }

    if (!(obj instanceof Error)) {
      Object.assign(record, obj)
    }
  }

  return record
}

module.exports = {
  info(obj) {
    const record = formatLogEntry(obj)
    record.severity = Severity.INFO
    console.log(JSON.stringify(record)) // eslint-disable-line no-console
  },
  warn(obj) {
    const record = formatLogEntry(obj)
    record.severity = Severity.WARNING
    console.log(JSON.stringify(record)) // eslint-disable-line no-console
  },
  error(obj) {
    const record = formatLogEntry(obj)
    record.severity = Severity.ERROR
    console.error(JSON.stringify(record)) // eslint-disable-line no-console
  },
}
