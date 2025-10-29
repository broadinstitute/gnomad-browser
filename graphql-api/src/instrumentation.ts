import * as opentelemetry from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'

import config from './config'

if (config.OPENTELEMETRY_COLLECTOR_URL !== undefined) {
  const sdk = new opentelemetry.NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: `${config.OPENTELEMETRY_COLLECTOR_URL}/v1/traces`,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${config.OPENTELEMETRY_COLLECTOR_URL}/v1/metrics`,
      }),
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: config.OPENTELEMETRY_SERVICE_NAME,
  })
  sdk.start()
}
