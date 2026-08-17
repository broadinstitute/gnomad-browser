import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import renderer from 'react-test-renderer'
import { describe, expect, jest, test } from '@jest/globals'

import HaplotypeHelpButton from './HelpButton'
import MethylationHelp, {
  PerCopyMethylationHelp,
  type MethylationSampleAvailability,
} from './MethylationHelp'

const availability: MethylationSampleAvailability[] = [
  {
    sample_id: 'available-sample',
    available: true,
    status: 'AVAILABLE_COMPLETE',
    reason: null,
  },
  {
    sample_id: 'missing-assay',
    available: false,
    status: 'UNAVAILABLE_NO_ASSAY_SOURCE',
    reason: 'No methylation assay source',
  },
  {
    sample_id: 'incomplete-sample',
    available: false,
    status: 'UNAVAILABLE_INCOMPLETE',
    reason: null,
  },
]

const renderedText = (node: any): string => {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(renderedText).join('')
  return node?.children ? renderedText(node.children) : ''
}

describe('MethylationHelp', () => {
  test('shows concise availability and unavailable-sample reasons', () => {
    const tree = renderer.create(<MethylationHelp availability={availability} />)
    const text = renderedText(tree.toJSON())

    expect(text).toContain('1 of 3 canonical roster samples have sample-total methylation data')
    expect(text).toContain('remaining 2 samples are excluded from methylation requests')
    expect(text).toContain('Unavailable samples (2) and reasons')
    expect(text).toContain('missing-assay')
    expect(text).toContain('No methylation assay source')
    expect(text).toContain('incomplete-sample')
    expect(text).toContain('No reason supplied')
  })

  test('states non-equivalence, estimators, grouping configuration, and view behavior', () => {
    const text = renderedText(renderer.create(<MethylationHelp />).toJSON())

    expect(text).toContain('How to read this display')
    expect(text).toContain('informed by METAFORA, but it does not run or reproduce METAFORA')
    expect(text).toContain('not stable segments')
    expect(text).toContain('differentially methylated regions (DMRs)')
    expect(text).toContain('arithmetic mean of the observed sample-total methylation percentages')
    expect(text).toContain('Every observed sample row has equal weight')
    expect(text).toContain('no depth weighting')
    expect(text).toContain('within-group squared errors (SSE) plus 400')
    expect(text).toContain('more than 2,000 valid sites')
    expect(text).toContain('at most 200 CpGs')
    expect(text).toContain('no groups are returned')
    expect(text).toContain('visual-groups-v3')
    expect(text).toContain('CpG sites')
    expect(text).toContain('CpG groups')
    expect(text).toContain('Changing these modes does not issue a new data request')
    expect(text).toContain('Coverage-weighted across the currently loaded')
    expect(text).toContain('Equal weight for every measured haplotype copy')
    expect(text).toContain('Median of constituent site-level equal-copy means')
  })

  test('documents exact support cautions and regional ranking semantics', () => {
    const text = renderedText(renderer.create(<MethylationHelp />).toJSON())

    expect(text).toContain('Mean read depth at least 10× and at least 20 observed sample totals')
    expect(text).toContain('Median per-CpG depth at least 10× and at least 50%')
    expect(text).toContain('median per-CpG depth at least 5×')
    expect(text).toContain('no greater than 4:1')
    expect(text).toContain('There is no absolute minimum number of contributing copy samples')
    expect(text).toContain('not significance, confidence, power, p-values')
    expect(text).toContain('|sample total − site mean| > 2 × site cohort SD')
    expect(text).toContain('sorts samples by descending count, not fraction')
    expect(text).toContain('focal sample is included in the site mean and cohort SD')
    expect(text).toContain('denominators can vary with sample missingness')
    expect(text).toContain('This legacy ranking is not METAFORA')
  })

  test('explains operator-approved mapping, readiness, and non-clinical limits', () => {
    const sampleTotalText = renderedText(renderer.create(<MethylationHelp />).toJSON())
    const perCopyText = renderedText(
      renderer
        .create(
          <PerCopyMethylationHelp
            capability={{
              available: true,
              joinable_to_vcf: true,
              status: 'AVAILABLE_CONFIRMED',
              identity: null,
              source_sample_ids: [],
              max_samples: 25,
              max_records: 250000,
              reason: 'Confirmed for the pinned browser bundle',
            }}
          />
        )
        .toJSON()
    )

    expect(sampleTotalText).toContain('hash-bound, operator-approved orientation')
    expect(sampleTotalText).toContain('HAP1 → phased VCF GT strand 1')
    expect(sampleTotalText).toContain('do not mean maternal/paternal')
    expect(sampleTotalText).toContain('not scientific validation')
    expect(sampleTotalText).toContain('missing values are never filled with 0%')
    expect(sampleTotalText).toContain('no returned CpGs means')
    expect(sampleTotalText).toContain('descriptive, research-facing context')
    expect(sampleTotalText).toContain('Do not use this display as a validated statistical')

    expect(perCopyText).toContain('Copy A is not necessarily GT strand 1')
    expect(perCopyText).toContain('original UPGMA cluster membership')
    expect(perCopyText).toContain('(sample_id, vcf_strand)')
    expect(perCopyText).toContain('Missing, unavailable, and complete requests with no CpGs')
    expect(perCopyText).toContain('not independent scientific lineage validation')
    expect(perCopyText).toContain('AVAILABLE_CONFIRMED')
  })

  test('uses cohort terminology while retaining the cited publication title', () => {
    const text = renderedText(renderer.create(<MethylationHelp />).toJSON())

    expect(text).toContain('Cohort estimator and composition')
    expect(text).toContain('cohort sample-total summaries')
    expect(text).not.toContain('Population estimator')
    expect(text).not.toContain('Population site')
  })

  test('warns that methylation is influenced by environmental factors', () => {
    const text = renderedText(renderer.create(<MethylationHelp />).toJSON())

    expect(text).toContain('Methylation is influenced by environmental factors')
  })

  test('cites the METAFORA medRxiv preprint and its review status', () => {
    const tree = renderer.create(<MethylationHelp />)
    const text = renderedText(tree.toJSON())
    const citationTitle =
      'Population-scale detection of methylation outliers from long-read genome sequencing'
    const citationLink = tree.root
      .findAllByType('a')
      .find((link) => link.props.href === 'https://doi.org/10.64898/2026.06.09.26355279')

    expect(text).toContain(citationTitle)
    expect(text).toContain('medRxiv preprint, posted June 11, 2026. Not peer reviewed')
    expect(citationLink?.props.href).toBe('https://doi.org/10.64898/2026.06.09.26355279')
  })

  test('shows source context in help when provided', () => {
    const text = renderedText(
      renderer.create(<MethylationHelp sourceLabel="Optional Y1 CpG ancillary data" />).toJSON()
    )

    expect(text).toContain('Source: Optional Y1 CpG ancillary data')
  })

  test('distinguishes loading metadata from releases without availability metadata', () => {
    const loading = renderedText(renderer.create(<MethylationHelp availability={null} />).toJSON())
    const generic = renderedText(renderer.create(<MethylationHelp />).toJSON())

    expect(loading).toContain('Availability details are loading')
    expect(generic).not.toContain('Sample availability')
  })

  test('opens the established accessible modal and closes it from the close control', () => {
    Object.defineProperty(window, 'scroll', { configurable: true, value: jest.fn() })
    render(
      <HaplotypeHelpButton title="Methylation context">
        <MethylationHelp />
      </HaplotypeHelpButton>
    )

    expect(screen.queryByRole('dialog', { name: 'Methylation context' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Methylation context' }))

    expect(screen.getByRole('dialog', { name: 'Methylation context' })).not.toBeNull()
    expect(screen.getByText('How to read this display')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Methylation context' })).toBeNull()
  })
})
