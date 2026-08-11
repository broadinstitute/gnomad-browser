import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route } from 'react-router-dom'

import examples from './data/longReadLiteratureExamples.json'
import LongReadLiteratureWorkflowPage from './LongReadLiteratureWorkflowPage'
import {
  literatureWorkflowBrowserPath,
  literatureWorkflowPath,
  literatureWorkflows,
} from './longReadLiteratureWorkflows'

const renderRoute = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[literatureWorkflowPath(slug)]}>
      <Route
        exact
        path="/long-read-literature-examples/paper/:slug"
        component={LongReadLiteratureWorkflowPage}
      />
    </MemoryRouter>
  )

const batchOneRefs = ['1', '10', '34', '72', '78', '88', '93', '140']

describe('LongReadLiteratureWorkflowPage', () => {
  test('the 12 stable workflow records match their literature paper identities and contracts', () => {
    expect(literatureWorkflows.map((workflow) => workflow.ref).sort()).toEqual(
      ['1', '10', '25', '34', '40', '59', '72', '78', '88', '93', '111', '140'].sort()
    )

    const allowedStatuses = new Set([
      'supported-and-usable',
      'supported-but-awkward',
      'underdeveloped',
      'absent',
      'data-blocked',
      'inappropriate/unsafe',
    ])

    literatureWorkflows.forEach((workflow) => {
      const paper = examples.find((item) => item.ref === workflow.ref)
      expect(paper).toBeDefined()
      expect(workflow.paper).toMatchObject({
        title: paper!.title,
        pmid: paper!.pmid,
        doi: paper!.doi,
        pdfUrl: paper!.pdfUrl,
      })
      expect(workflow.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(new Set(workflow.evidence.map((item) => item.class))).toEqual(new Set(['P', 'I', 'B']))
      expect(workflow.capabilities.every((item) => allowedStatuses.has(item.status))).toBe(true)
      expect(workflow.nonDiagnosticBoundary).toMatch(/cannot|does not/)
      expect(workflow.acceptanceTest.forbidden).not.toBe('')
      if (workflow.browserRegion) {
        expect(workflow.browserRegion.stop).toBeGreaterThan(workflow.browserRegion.start)
      } else {
        expect(workflow.browserRegionBlockedReason).toMatch(/data-blocked/)
        expect(literatureWorkflowBrowserPath(workflow)).toBeNull()
      }
    })

    expect(new Set(literatureWorkflows.map((workflow) => workflow.slug)).size).toBe(12)
    expect(new Set(literatureWorkflows.map((workflow) => workflow.ref)).size).toBe(12)
  })

  test.each(literatureWorkflows)('routes $slug and preserves its safety boundary', (workflow) => {
    renderRoute(workflow.slug)

    expect(screen.getByRole('heading', { level: 1, name: workflow.paper.title })).not.toBeNull()
    expect(
      screen.getByText((content, element) =>
        element?.tagName === 'P' ? content.includes(workflow.locus) : false
      )
    ).not.toBeNull()

    const browserPath = literatureWorkflowBrowserPath(workflow)
    if (browserPath) {
      const browserLink = screen.getByRole('link', {
        name:
          workflow.browserRegionStatus === 'provisional'
            ? 'Open provisional locus overview'
            : 'Try in browser',
      })
      expect(browserLink.getAttribute('href')).toBe(browserPath)
      expect(browserLink.getAttribute('href')).toContain('dataset=gnomad_r4_lr')
      expect(browserLink.getAttribute('href')).toContain('lr_cohort=hgsvc_hprc')
      expect(browserLink.getAttribute('href')).toContain('show_haplotypes=true')
    } else {
      expect(screen.queryByRole('link', { name: 'Try in browser' })).toBeNull()
      expect(screen.getByRole('status').textContent).toBe(workflow.browserRegionBlockedReason)
    }

    expect(screen.getByRole('note', { name: 'Non-diagnostic boundary' }).textContent).toContain(
      'not diagnostic'
    )
    expect(screen.getByRole('heading', { name: 'Exact Given / When / Then story' })).not.toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Acceptance test and forbidden interpretation' })
    ).not.toBeNull()
  })

  test('preserves the scientifically important Batch 1 blocked states', () => {
    const workflows = new Map(literatureWorkflows.map((workflow) => [workflow.ref, workflow]))
    const d4z4 = workflows.get('140')!
    const palb2 = workflows.get('93')!
    const gch1 = workflows.get('1')!
    const wrn = workflows.get('88')!
    const slc16a2 = workflows.get('10')!

    expect(d4z4.browserRegion).toBeNull()
    expect(d4z4.browserRegionBlockedReason).toMatch(/No safe linear GRCh38 region/)
    expect(palb2.startingState.stopRule).toMatch(/remap/i)
    expect(palb2.browserRegionStatus).toBe('provisional')
    expect(palb2.browserRegionNotice).toMatch(/remap remains gated/i)
    expect(gch1.capabilities.some((item) => item.status === 'data-blocked')).toBe(true)
    expect(wrn.capabilities.some((item) => item.status === 'data-blocked')).toBe(true)
    expect(slc16a2.capabilities.some((item) => item.status === 'data-blocked')).toBe(true)

    const d4z4Page = renderRoute(d4z4.slug)
    expect(screen.queryByRole('link', { name: 'Try in browser' })).toBeNull()
    d4z4Page.unmount()

    renderRoute(palb2.slug)
    expect(screen.queryByRole('link', { name: 'Try in browser' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Open provisional locus overview' })).not.toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/not a verified event destination/i)
  })

  test('preserves D4Z4 and WRN safety-critical source branch contracts', () => {
    const workflows = new Map(literatureWorkflows.map((workflow) => [workflow.ref, workflow]))
    const d4z4 = workflows.get('140')!
    const wrn = workflows.get('88')!

    expect(d4z4.branches).toHaveLength(18)
    expect(d4z4.branches).toEqual(
      expect.arrayContaining([
        {
          condition: 'Only custom-reference-relative coordinates are available',
          action:
            'Retain them as custom coordinates and continue to locus-model validation, not region navigation.',
          stopRule: false,
        },
        {
          condition:
            'Discriminating distal site is unreadable but a validated second-distal-RU rule is available',
          action: 'Apply and display that rule with reduced confidence.',
          stopRule: false,
        },
        {
          condition: 'The assay did not capture 4qB',
          action: 'Report 4qB unavailable; never impute a 4qB methylation baseline.',
          stopRule: false,
        },
        {
          condition: 'Only partial molecules cover the array',
          action: 'Show partial coverage but mark RU count unavailable.',
          stopRule: true,
        },
        {
          condition: 'Joined capability is unavailable or receipt identity is stale',
          action: 'Fail closed and do not display per-copy methylation.',
          stopRule: true,
        },
        {
          condition: 'A roster sample has no source output or is marked skip',
          action: 'Show unavailable with its reason; never plot 0%.',
          stopRule: false,
        },
        {
          condition: 'Only sample-total methylation exists',
          action: 'Keep one explicitly unphased sample-total track outside haplotype panels.',
          stopRule: true,
        },
        {
          condition: 'A stratum has sparse full-length callability',
          action:
            'Show the small denominator and refrain from absence or tail-distribution claims.',
          stopRule: false,
        },
        {
          condition: 'Required provenance or join fields are omitted',
          action: 'Mark export incomplete and do not treat it as reproducible evidence.',
          stopRule: true,
        },
      ])
    )

    expect(wrn.branches).toHaveLength(14)
    expect(wrn.branches).toEqual(
      expect.arrayContaining([
        {
          condition: 'PS is missing, discontinuous, or copy assignment is ambiguous',
          action: 'Keep the two window backgrounds separate and stop cross-window phase claims.',
          stopRule: true,
        },
        {
          condition: 'A reference participant shows an opposite-copy WRN allele',
          action: 'Do not transfer this phase to PD1010; patient phase remains external evidence.',
          stopRule: true,
        },
        {
          condition: 'Export omits event, denominator, phase, or provenance fields',
          action:
            'Treat it as a convenience table, not an evidentiary receipt; attach a manual structured addendum.',
          stopRule: true,
        },
        {
          condition: 'A user asks the browser to diagnose, classify, or prove patient trans phase',
          action: 'Refuse that inference and identify the required external evidence.',
          stopRule: true,
        },
      ])
    )
  })

  test('makes the capability matrix a labeled keyboard-focusable scroll region', () => {
    const workflow = literatureWorkflows.find((item) => item.ref === '88')!
    renderRoute(workflow.slug)

    const matrixRegion = screen.getByRole('region', { name: /scrollable capability matrix/i })
    expect(matrixRegion.getAttribute('tabindex')).toBe('0')
    expect(within(matrixRegion).getByRole('table')).not.toBeNull()
  })

  test('renders corrected FGF14 coordinates and does not invent missing PubMed links', () => {
    const workflow = literatureWorkflows.find((item) => item.ref === '78')!
    const example = examples.find((item) => item.ref === '78')!

    expect(workflow.browserRegion).toEqual({ chrom: '13', start: 102111564, stop: 102211564 })
    expect(example.region).toMatchObject({
      chrom: '13',
      start: 102111564,
      stop: 102211564,
      verified: true,
    })

    renderRoute(workflow.slug)
    expect(screen.queryByRole('link', { name: 'PubMed' })).toBeNull()
    expect(screen.getByRole('link', { name: 'DOI' })).not.toBeNull()
  })

  test('renders standardized capability statuses and distinct P/I/B evidence', () => {
    const workflow = literatureWorkflows.find((item) => item.ref === '111')!
    renderRoute(workflow.slug)

    const matrix = screen.getByRole('table')
    expect(within(matrix).getByText('Supported and usable')).not.toBeNull()
    expect(within(matrix).getAllByText('Underdeveloped')).toHaveLength(2)
    expect(within(matrix).getByText('Data blocked')).not.toBeNull()
    expect(within(matrix).getByText('Inappropriate / unsafe')).not.toBeNull()
    expect(within(matrix).getByText('Absent')).not.toBeNull()

    expect(screen.getByText(/^P — Paper explicit/)).not.toBeNull()
    expect(screen.getByText(/^I — Analyst inferred/)).not.toBeNull()
    expect(screen.getByText(/^B — Browser observed/)).not.toBeNull()
    expect(screen.getByText(/source at commit 7e1675c19 on 2026-08-11/)).not.toBeNull()
  })

  test.each(batchOneRefs)('Batch 1 ref %s has a routable detailed record', (ref) => {
    const workflow = literatureWorkflows.find((item) => item.ref === ref)!
    renderRoute(workflow.slug)
    expect(screen.getByRole('heading', { level: 1, name: workflow.paper.title })).not.toBeNull()
  })

  test('handles an unknown slug with a clear path back to the exact index route', () => {
    renderRoute('not-a-curated-paper')

    expect(screen.getByRole('heading', { name: 'Literature workflow not found' })).not.toBeNull()
    expect(screen.getByText('not-a-curated-paper')).not.toBeNull()
    expect(
      screen
        .getByRole('link', { name: 'Back to long-read literature examples' })
        .getAttribute('href')
    ).toBe('/long-read-literature-examples')
  })
})
