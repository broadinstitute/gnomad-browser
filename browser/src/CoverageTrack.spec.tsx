import React from 'react'
import renderer from 'react-test-renderer'
import { createRenderer } from 'react-test-renderer/shallow'

import { describe, expect, test } from '@jest/globals'

import CoverageTrack, { MetricOptions } from './CoverageTrack'

// Two buckets are enough: the AN axis ceiling is derived from the data, so the
// assertions below only need a known maximum.
const coverageBuckets = [
  { pos: 100, mean: 30, median: 30, over_1: 1, over_20: 0.97 },
  { pos: 200, mean: 32, median: 31, over_1: 1, over_20: 0.98 },
]

// Shaped exactly as the allele_number query returns: flat per-bucket values, the
// same shape as the coverage buckets above.
const anBuckets = [
  { pos: 100, an: 800, an_percent: 99.5 },
  { pos: 200, an: 900, an_percent: 99.9 },
]

// Global exome AN reaches ~1.46M (v4.1 exomes are 730,947 samples), which is what
// escalates the axis unit to M. With `anBuckets` above and `midANBuckets` below,
// the three fixtures sit in each of the formatter's bands.
const largeANBuckets = [
  { pos: 100, an: 1400000, an_percent: 95.8 },
  { pos: 200, an: 1461894, an_percent: 100 },
]

// A ceiling that straddles the 1e4 abbreviation cutoff, e.g. a ~7,350-sample
// callset. This is the only band where per-tick and per-axis unit selection
// disagree, so it is what the "not per tick" assertion needs.
const midANBuckets = [
  { pos: 100, an: 14000, an_percent: 95.2 },
  { pos: 200, an: 14700, an_percent: 100 },
]

const coverageDatasets = [{ buckets: coverageBuckets, color: 'green', name: 'genome' }]
const anDatasets = [{ buckets: anBuckets, color: 'green', name: 'genome' }]
const midANDatasets = [{ buckets: midANBuckets, color: 'green', name: 'genome' }]
const largeANDatasets = [{ buckets: largeANBuckets, color: 'green', name: 'genome' }]

const renderShallow = (props: any) => {
  const shallowRenderer = createRenderer()
  shallowRenderer.render(<CoverageTrack datasetId="gnomad_r4" {...props} />)
  return shallowRenderer.getRenderOutput() as any
}

/** Left panel content for a given metric, via the Track's render prop. */
const leftPanel = (props: any) => renderShallow(props).props.renderLeftPanel()

/** Top panel (legend + selectors) for a given metric, via the Track's render prop. */
const topPanel = (props: any) => renderShallow(props).props.renderTopPanel()

/**
 * Every text node in a full render, in document order.
 *
 * The axis ceiling and the tick formatter only run inside the Track's render
 * prop, which a shallow render never invokes -- so the assertions that cover
 * them have to read the mounted tree.
 */
const renderedText = (props: any): string[] => {
  const out: string[] = []
  const walk = (node: any) => {
    if (node === null || node === undefined) {
      return
    }
    if (Array.isArray(node)) {
      node.forEach(walk)
    } else if (typeof node === 'string' || typeof node === 'number') {
      out.push(String(node))
    } else if (node.children) {
      node.children.forEach(walk)
    }
  }
  walk(renderer.create(<CoverageTrack datasetId="gnomad_r4" {...props} />).toJSON())
  return out
}

describe('CoverageTrack', () => {
  test('has no unexpected changes', () => {
    const tree = renderer.create(
      <CoverageTrack datasetId="gnomad_r4" datasets={coverageDatasets} />
    )
    expect(tree).toMatchSnapshot()
  })

  test('has no unexpected changes with AN datasets', () => {
    const tree = renderer.create(
      <CoverageTrack
        datasetId="gnomad_r4"
        datasets={coverageDatasets}
        anDatasets={anDatasets}
        metric={MetricOptions.an_percent}
      />
    )
    expect(tree).toMatchSnapshot()
  })
})

describe('CoverageTrack metric selector', () => {
  test('omits the allele number options when no AN data is supplied', () => {
    const tree = renderer.create(topPanel({ datasets: coverageDatasets })).toJSON()
    expect(JSON.stringify(tree)).not.toContain('an_percent')
  })

  test('offers the allele number options when AN data is supplied', () => {
    const rendered = JSON.stringify(
      renderer.create(topPanel({ datasets: coverageDatasets, anDatasets })).toJSON()
    )
    expect(rendered).toContain('an_percent')
    expect(rendered).toContain('Callrate')
  })
})

describe('CoverageTrack track title', () => {
  test.each([
    [MetricOptions.mean, 'Per-base mean depth of coverage'],
    [MetricOptions.over_20, 'Fraction of individuals with coverage over 20'],
    [MetricOptions.an_percent, 'Callrate (Allele Number %)'],
    [MetricOptions.an, 'Allele number (AN)'],
  ])('names the metric for %s', (metric, expected) => {
    const rendered = JSON.stringify(
      renderer.create(leftPanel({ datasets: coverageDatasets, anDatasets, metric })).toJSON()
    )
    expect(rendered).toContain(expected)
  })
})

describe('CoverageTrack allele number axis', () => {
  const axisTicks = (datasets: any) =>
    renderedText({
      datasets: coverageDatasets,
      anDatasets: datasets,
      metric: MetricOptions.an,
    }).filter((text) => /^[\d,.]+[kM]?$/.test(text))

  test('scales the ceiling to the AN actually on screen', () => {
    // Raw AN scales with sample count, so a constant ceiling would clip one
    // series or flatten the other; the axis has to follow the data.
    const small = axisTicks(anDatasets)
    const large = axisTicks(largeANDatasets)

    expect(small.length).toBeGreaterThan(0)
    expect(large.length).toBeGreaterThan(0)

    const asNumber = (tick: string) => {
      let scale = 1
      if (tick.endsWith('M')) {
        scale = 1e6
      } else if (tick.endsWith('k')) {
        scale = 1e3
      }
      return parseFloat(tick.replace(/,/g, '')) * scale
    }
    const highest = (ticks: string[]) => Math.max(...ticks.map(asNumber))

    // 900 -> ceiling 945; 1,461,894 -> ceiling ~1.53M. Three orders of magnitude
    // apart, which a constant domain could not produce.
    expect(highest(small)).toBeLessThanOrEqual(945)
    expect(highest(large)).toBeGreaterThan(1e6)
  })

  test('picks the tick unit from the ceiling, not per tick', () => {
    // Per-tick formatting printed small ticks as "0k" and mixed "5,000" with
    // "10k" on a single axis. A ceiling of ~15.4k puts ticks on both sides of the
    // 1e4 cutoff, so a per-tick unit shows up as a mixed axis here.
    const mid = axisTicks(midANDatasets)
    expect(mid.length).toBeGreaterThan(0)
    expect(mid.filter((tick) => /[kM]$/.test(tick))).toEqual(mid)

    // Below the cutoff nothing is abbreviated; above 1e6 the unit escalates to M.
    expect(axisTicks(anDatasets).every((tick) => !/[kM]$/.test(tick))).toBe(true)
    expect(axisTicks(largeANDatasets).some((tick) => tick.endsWith('M'))).toBe(true)
  })

  test('suffixes the percent axis and leaves depth axes alone', () => {
    const percentTicks = renderedText({
      datasets: coverageDatasets,
      anDatasets,
      metric: MetricOptions.an_percent,
    }).filter((text) => /^\d+%$/.test(text))
    expect(percentTicks.length).toBeGreaterThan(0)
    expect(percentTicks).toContain('100%')

    const meanTicks = renderedText({
      datasets: coverageDatasets,
      anDatasets,
      metric: MetricOptions.mean,
    })
    expect(meanTicks.some((text) => /[kM]$/.test(text) || /%$/.test(text))).toBe(false)
  })
})

describe('CoverageTrack help topic', () => {
  // Regression guard: both AN metrics once pointed at the `callrate` topic, so
  // selecting raw AN opened a modal describing a rate with a denominator.
  const topicFor = (metric: MetricOptions) => {
    const panel = leftPanel({ datasets: coverageDatasets, anDatasets, metric })
    const infoButton = React.Children.toArray(panel.props.children).find(
      (child: any) => child && child.props && typeof child.props.topic === 'string'
    ) as any
    return infoButton ? infoButton.props.topic : null
  }

  test('uses the callrate topic for AN percent', () => {
    expect(topicFor(MetricOptions.an_percent)).toBe('callrate')
  })

  test('uses the allele-number topic for raw AN', () => {
    expect(topicFor(MetricOptions.an)).toBe('allele-number')
  })

  test('has no help button for depth metrics', () => {
    expect(topicFor(MetricOptions.mean)).toBeNull()
    expect(topicFor(MetricOptions.over_20)).toBeNull()
  })
})
