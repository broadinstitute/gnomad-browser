// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
const Severity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
}

const formatLogEntry = (obj: any) => {
  // https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
  // https://cloud.google.com/error-reporting/docs/formatting-error-messages#json_representation
  const record = {}

  if (typeof obj === 'string') {
    // @ts-expect-error TS(2339) FIXME: Property 'message' does not exist on type '{}'.
    record.message = obj
  } else {
    if (obj.message) {
      // @ts-expect-error TS(2339) FIXME: Property 'message' does not exist on type '{}'.
      record.message = obj.message
    }

    if (obj.stack) {
      // @ts-expect-error TS(2339) FIXME: Property 'message' does not exist on type '{}'.
      record.message = obj.stack
    }

    if (!(obj instanceof Error)) {
      Object.assign(record, obj)
    }
  }

  return record
}

const logger = {
  info: (obj: any) => {
    const record = formatLogEntry(obj)
    // @ts-expect-error TS(2339) FIXME: Property 'severity' does not exist on type '{}'.
    record.severity = Severity.INFO
    console.log(JSON.stringify(record)) // eslint-disable-line no-console
  },
  warn: (obj: any) => {
    const record = formatLogEntry(obj)
    // @ts-expect-error TS(2339) FIXME: Property 'severity' does not exist on type '{}'.
    record.severity = Severity.WARNING
    console.log(JSON.stringify(record)) // eslint-disable-line no-console
  },
  error: (obj: any) => {
    const record = formatLogEntry(obj)
    // @ts-expect-error TS(2339) FIXME: Property 'severity' does not exist on type '{}'.
    record.severity = Severity.ERROR
    console.error(JSON.stringify(record)) // eslint-disable-line no-console
  },
}

export default logger
