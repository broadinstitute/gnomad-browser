// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
const Severity = {
  DEFAULT: 'DEFAULT',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  NOTICE: 'NOTICE',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
  ALERT: 'ALERT',
  EMERGENCY: 'EMERGENCY',
}

// TODO: Configure this with environment variables

class Logger {
  // eslint-disable-next-line class-methods-use-this
  formatRecord(obj) {
    // https://cloud.google.com/error-reporting/docs/formatting-error-messages#json_representation
    const record = {}

    if (typeof obj === 'string') {
      record.message = obj
    }

    if (obj.message) {
      record.message = obj.message
    }

    if (obj.stack) {
      record.stack_trace = obj.stack
    }

    return record
  }

  info(obj) {
    const record = this.formatRecord(obj)
    record.severity = Severity.INFO
    console.log(JSON.stringify(record)) // eslint-disable-line no-console
  }

  warn(obj) {
    const record = this.formatRecord(obj)
    record.severity = Severity.WARNING
    console.log(JSON.stringify(record)) // eslint-disable-line no-console
  }

  error(obj) {
    const record = this.formatRecord(obj)
    record.severity = Severity.ERROR
    console.log(JSON.stringify(record)) // eslint-disable-line no-console
  }
}

module.exports = new Logger()
