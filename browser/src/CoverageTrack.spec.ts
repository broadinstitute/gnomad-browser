import { coverageMetricDomain, MetricOptions } from './CoverageTrack'

describe('CoverageTrack metric domains', () => {
  test.each([MetricOptions.mean, MetricOptions.median])(
    'uses maxCoverage for the %s depth metric',
    (metric) => {
      expect(coverageMetricDomain(metric, 20)).toEqual([0, 20])
      expect(coverageMetricDomain(metric, 100)).toEqual([0, 100])
    }
  )

  test.each([MetricOptions.over_1, MetricOptions.over_20, MetricOptions.over_100])(
    'keeps the %s threshold fraction at 0–100% regardless of maxCoverage',
    (metric) => {
      expect(coverageMetricDomain(metric, 20)).toEqual([0, 1])
      expect(coverageMetricDomain(metric, 100)).toEqual([0, 1])
    }
  )
})
