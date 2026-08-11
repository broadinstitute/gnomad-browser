import React from 'react'
import renderer from 'react-test-renderer'
import { createRenderer } from 'react-test-renderer/shallow'
import { describe, expect, test } from '@jest/globals'

import CoverageTrack from '../CoverageTrack'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import RegionCoverageTrack from './RegionCoverageTrack'
import {
  isShortReadCoverageContextEligible,
  shouldShowShortReadCoverageContext,
  updateShortReadCoverageSearch,
} from './shortReadCoverageContext'
import ShortReadCoverageContextTrack from './ShortReadCoverageContextTrack'

const autosomalRegion = {
  reference_genome: 'GRCh38',
  chrom: '22',
  start: 100,
  stop: 200,
  genes: [],
  non_coding_constraints: [],
} as const

const shallowRender = (element: React.ReactElement) => {
  const shallowRenderer = createRenderer()
  shallowRenderer.render(element)
  return shallowRenderer.getRenderOutput()
}

describe('short-read coverage context URL and eligibility', () => {
  test('is off unless explicitly enabled and preserves unrelated LR state', () => {
    const initial =
      '?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&show_haplotypes=true&variant_id=22-100-A%3ET&other=kept'

    expect(shouldShowShortReadCoverageContext(initial, 'gnomad_r4_lr', autosomalRegion)).toBe(false)

    const enabled = updateShortReadCoverageSearch(initial, true)
    const enabledParams = new URLSearchParams(enabled)
    expect(enabledParams.get('show_short_read_coverage')).toBe('true')
    expect(enabledParams.get('dataset')).toBe('gnomad_r4_lr')
    expect(enabledParams.get('lr_cohort')).toBe('hgsvc_hprc')
    expect(enabledParams.get('show_haplotypes')).toBe('true')
    expect(enabledParams.get('variant_id')).toBe('22-100-A>T')
    expect(enabledParams.get('other')).toBe('kept')
    expect(shouldShowShortReadCoverageContext(enabled, 'gnomad_r4_lr', autosomalRegion)).toBe(true)

    const disabledParams = new URLSearchParams(updateShortReadCoverageSearch(enabled, false))
    expect(disabledParams.has('show_short_read_coverage')).toBe(false)
    expect(disabledParams.get('show_haplotypes')).toBe('true')
    expect(disabledParams.get('other')).toBe('kept')
  })

  test.each(['X', 'Y', 'M', 'chr22', '0', '23'])('guards unsupported chromosome %s', (chrom) => {
    expect(isShortReadCoverageContextEligible('gnomad_r4_lr', { ...autosomalRegion, chrom })).toBe(
      false
    )
  })

  test('guards unsupported builds and non-LR datasets while allowing AoU LR query state', () => {
    expect(isShortReadCoverageContextEligible('gnomad_r4_lr', autosomalRegion)).toBe(true)
    expect(
      isShortReadCoverageContextEligible('gnomad_r4_lr', {
        ...autosomalRegion,
        reference_genome: 'GRCh37' as const,
      })
    ).toBe(false)
    expect(isShortReadCoverageContextEligible('gnomad_r4', autosomalRegion)).toBe(false)
    expect(
      shouldShowShortReadCoverageContext(
        '?dataset=gnomad_r4_lr&lr_cohort=aou&show_short_read_coverage=true',
        'gnomad_r4_lr',
        autosomalRegion
      )
    ).toBe(true)
  })
})

describe('ShortReadCoverageContextTrack', () => {
  test('uses the explicit gnomAD short-read source and approved labels', () => {
    const output = shallowRender(
      <ShortReadCoverageContextTrack
        chrom="22"
        start={100}
        stop={200}
        viewStart={120}
        viewStop={180}
      />
    )

    expect(output.type).toBe(RegionCoverageTrack)
    expect(output.props).toMatchObject({
      datasetId: 'gnomad_r4',
      includeExomeCoverage: true,
      includeGenomeCoverage: true,
      height: 100,
      metricControlId: 'sr-coverage-metric',
      exomeLabel: 'Short-read exomes (gnomAD v4.0)',
      genomeLabel: 'Short-read genomes (gnomAD v3.0.1)',
      filenameForExport: '22-100-200_gnomad_short_read_coverage',
      viewStart: 120,
      viewStop: 180,
    })
  })

  test('queries GRCh38 once for both products and filters loaded bins to the viewport', () => {
    const query = shallowRender(
      <RegionCoverageTrack
        datasetId="gnomad_r4"
        chrom="22"
        start={100}
        stop={200}
        viewStart={120}
        viewStop={180}
        exomeLabel="Short-read exomes (gnomAD v4.0)"
        genomeLabel="Short-read genomes (gnomAD v3.0.1)"
      />
    )

    expect(query.type).toBe(Query)
    expect(query.props.variables).toMatchObject({
      datasetId: 'gnomad_r4',
      referenceGenome: 'GRCh38',
      includeExomeCoverage: true,
      includeGenomeCoverage: true,
      start: 100,
      stop: 200,
    })

    const track = query.props.children({
      data: {
        region: {
          coverage: {
            exome: [{ pos: 110 }, { pos: 130 }, { pos: 190 }],
            genome: [{ pos: 120 }, { pos: 180 }, { pos: 181 }],
          },
        },
      },
    })

    expect(track.type).toBe(CoverageTrack)
    expect(track.props.datasets[0].buckets.map((bucket: any) => bucket.pos)).toEqual([130])
    expect(track.props.datasets[1].buckets.map((bucket: any) => bucket.pos)).toEqual([120, 180])
  })

  test('does not zero-fill an unavailable source', () => {
    const query = shallowRender(
      <RegionCoverageTrack
        datasetId="gnomad_r4"
        chrom="22"
        start={100}
        stop={200}
        exomeLabel="Short-read exomes (gnomAD v4.0)"
        genomeLabel="Short-read genomes (gnomAD v3.0.1)"
      />
    )
    const track = query.props.children({
      data: { region: { coverage: { exome: [], genome: [{ pos: 150 }] } } },
    })

    expect(track.props.datasets).toHaveLength(1)
    expect(track.props.datasets[0].name).toBe('Short-read genomes (gnomAD v3.0.1)')
  })

  test('reports total unavailability and request failure inside the SR slot', () => {
    const query = shallowRender(
      <RegionCoverageTrack
        datasetId="gnomad_r4"
        chrom="22"
        start={100}
        stop={200}
        errorMessage="Unable to load short-read coverage context. Long-read data are unaffected."
        unavailableMessage="Short-read coverage unavailable. Long-read data are unaffected."
      />
    )
    expect(query.props.errorMessage).toContain('Long-read data are unaffected')

    const unavailable = query.props.children({
      data: { region: { coverage: { exome: [], genome: [] } } },
    })
    expect(unavailable.type).toBe(StatusMessage)
    expect(unavailable.props.children).toContain('Long-read data are unaffected')
  })

  test('uses unique accessible metric IDs when LR and SR tracks coexist', () => {
    const dataset = [{ color: 'purple', name: 'coverage', buckets: [{ pos: 150, over_20: 1 }] }]
    const lrOutput = shallowRender(
      <CoverageTrack
        datasetId="gnomad_r4"
        datasets={dataset}
        metricControlId="lr-coverage-metric"
      />
    )
    const srOutput = shallowRender(
      <CoverageTrack
        datasetId="gnomad_r4"
        datasets={dataset}
        metricControlId="sr-coverage-metric"
      />
    )
    const panels = renderer.create(
      <>
        {lrOutput.props.renderTopPanel()}
        {srOutput.props.renderTopPanel()}
      </>
    )

    expect(panels.root.findByProps({ htmlFor: 'lr-coverage-metric' })).toBeTruthy()
    expect(panels.root.findByProps({ id: 'lr-coverage-metric' })).toBeTruthy()
    expect(panels.root.findByProps({ htmlFor: 'sr-coverage-metric' })).toBeTruthy()
    expect(panels.root.findByProps({ id: 'sr-coverage-metric' })).toBeTruthy()
  })
})
