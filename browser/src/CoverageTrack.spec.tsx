import React from 'react'
import { createRenderer } from 'react-test-renderer/shallow'

import { describe, expect, test } from '@jest/globals'

import CoverageTrack, {
  MetricOptions,
  defaultCoverageMetric,
  domainForMetric,
  isAlleleNumberMetric,
  tickFormatForMetric,
  trackTitleForMetric,
} from './CoverageTrack'
import InfoButton from './help/InfoButton'

const coverageDatasets = [
  {
    buckets: [
      { pos: 100, mean: 30, median: 30, over_20: 0.97 },
      { pos: 200, mean: 32, median: 31, over_20: 0.98 },
    ],
    color: 'green',
    name: 'genome',
  },
]

const alleleNumberDatasets = [
  {
    buckets: [
      { pos: 100, an_percent: 99.5 },
      { pos: 200, an_percent: 99.9 },
    ],
    color: 'green',
    name: 'genome',
  },
]

const renderShallow = (props: any) => {
  const shallowRenderer = createRenderer()
  shallowRenderer.render(<CoverageTrack datasetId="gnomad_r4" {...props} />)
  return shallowRenderer
}

/** Every element in a React element tree, depth first. */
const elementsIn = (node: any): any[] => {
  if (!node || typeof node !== 'object') {
    return []
  }
  if (Array.isArray(node)) {
    return node.flatMap(elementsIn)
  }
  return [node, ...elementsIn(node.props?.children)]
}

/** The track's own panels, which are rendered by Track rather than inline. */
const leftPanel = (props: any) => renderShallow(props).getRenderOutput().props.renderLeftPanel()
const topPanel = (props: any) => renderShallow(props).getRenderOutput().props.renderTopPanel()

describe('metric presentation', () => {
  test.each([
    [MetricOptions.mean, 'Per-base mean depth of coverage'],
    [MetricOptions.median, 'Per-base median depth of coverage'],
    [MetricOptions.over_20, 'Fraction of individuals with coverage over 20'],
    [MetricOptions.an_percent, 'Call rate (AN%)'],
  ])('%s is titled "%s"', (metric, expected) => {
    expect(trackTitleForMetric(metric)).toBe(expected)
  })

  test('call rate is drawn on a percentage axis, not a fraction or a depth', () => {
    expect(domainForMetric(MetricOptions.an_percent, 100)).toEqual([0, 100])
    expect(domainForMetric(MetricOptions.over_20, 100)).toEqual([0, 1])
    expect(domainForMetric(MetricOptions.mean, 250)).toEqual([0, 250])
  })

  test('only the call rate axis gets a percent suffix', () => {
    const formatTick = tickFormatForMetric(MetricOptions.an_percent)!
    expect(formatTick(100)).toBe('100%')
    expect(tickFormatForMetric(MetricOptions.mean)).toBeUndefined()
    expect(tickFormatForMetric(MetricOptions.over_20)).toBeUndefined()
  })

  test('identifies which metrics read from the allele number series', () => {
    expect(isAlleleNumberMetric(MetricOptions.an_percent)).toBe(true)
    expect(isAlleleNumberMetric(MetricOptions.over_20)).toBe(false)
  })

  test('defaults to a v4 metric only for v4 datasets', () => {
    expect(defaultCoverageMetric('gnomad_r4')).toBe(MetricOptions.over_20)
    expect(defaultCoverageMetric('exac')).toBe(MetricOptions.mean)
  })
})

describe('the metric selector', () => {
  const offersCallRate = (props: any) =>
    elementsIn(topPanel(props)).some((element) => element.props?.value === MetricOptions.an_percent)

  test('offers call rate once the allele number series has arrived', () => {
    expect(offersCallRate({ datasets: coverageDatasets, alleleNumberDatasets })).toBe(true)
  })

  test('offers call rate while the allele number request is in flight', () => {
    expect(offersCallRate({ datasets: coverageDatasets, isAlleleNumberLoading: true })).toBe(true)
  })

  test('does not offer call rate when there is no allele number for this dataset', () => {
    expect(offersCallRate({ datasets: coverageDatasets })).toBe(false)
  })
})

describe('the help button', () => {
  const helpTopic = (props: any) =>
    elementsIn(leftPanel(props)).find((element) => element.type === InfoButton)?.props?.topic

  test('explains call rate', () => {
    const props = { datasets: coverageDatasets, alleleNumberDatasets }
    expect(helpTopic({ ...props, metric: MetricOptions.an_percent })).toBe('call-rate')
  })

  test('is absent for the depth metrics, which have no help topic', () => {
    const props = { datasets: coverageDatasets, alleleNumberDatasets }
    expect(helpTopic({ ...props, metric: MetricOptions.mean })).toBeUndefined()
    expect(helpTopic({ ...props, metric: MetricOptions.over_20 })).toBeUndefined()
  })
})

describe('choosing the metric to show', () => {
  const selectedMetric = (props: any) =>
    (renderShallow(props).getMountedInstance() as any).state.selectedMetric

  test('shows call rate from the first render when it is on its way', () => {
    // Chosen at mount rather than when the response lands, so the reader does
    // not see the track change metric under them a moment later.
    expect(selectedMetric({ datasets: coverageDatasets, isAlleleNumberLoading: true })).toBe(
      MetricOptions.an_percent
    )
  })

  test('shows a coverage metric when there is no allele number', () => {
    expect(selectedMetric({ datasets: coverageDatasets })).toBe(MetricOptions.over_20)
  })

  test('respects a metric the caller asked for', () => {
    const props = { datasets: coverageDatasets, isAlleleNumberLoading: true }
    expect(selectedMetric({ ...props, metric: MetricOptions.mean })).toBe(MetricOptions.mean)
  })

  test('falls back to a coverage metric if the allele number never arrives', () => {
    const shallowRenderer = renderShallow({
      datasets: coverageDatasets,
      isAlleleNumberLoading: true,
    })
    const track = shallowRenderer.getMountedInstance() as any
    const loadingProps = track.props

    // Shallow rendering does not run componentDidUpdate, so render the settled
    // props and then drive the update by hand.
    shallowRenderer.render(<CoverageTrack datasetId="gnomad_r4" datasets={coverageDatasets} />)
    track.componentDidUpdate(loadingProps)

    expect(track.state.selectedMetric).toBe(MetricOptions.over_20)
  })

  test('leaves a coverage metric alone if the allele number never arrives', () => {
    const shallowRenderer = renderShallow({
      datasets: coverageDatasets,
      isAlleleNumberLoading: true,
      metric: MetricOptions.median,
    })
    const track = shallowRenderer.getMountedInstance() as any
    const loadingProps = track.props

    shallowRenderer.render(
      <CoverageTrack
        datasetId="gnomad_r4"
        datasets={coverageDatasets}
        metric={MetricOptions.median}
      />
    )
    track.componentDidUpdate(loadingProps)

    expect(track.state.selectedMetric).toBe(MetricOptions.median)
  })
})
