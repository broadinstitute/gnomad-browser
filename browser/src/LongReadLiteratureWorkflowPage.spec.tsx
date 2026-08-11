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
      const tryLink = screen.getByRole('link', { name: 'Try in browser' })
      expect(tryLink.getAttribute('href')).toBe(browserPath)
      expect(tryLink.getAttribute('href')).toContain('dataset=gnomad_r4_lr')
      expect(tryLink.getAttribute('href')).toContain('lr_cohort=hgsvc_hprc')
      expect(tryLink.getAttribute('href')).toContain('show_haplotypes=true')
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
    expect(gch1.capabilities.some((item) => item.status === 'data-blocked')).toBe(true)
    expect(wrn.capabilities.some((item) => item.status === 'data-blocked')).toBe(true)
    expect(slc16a2.capabilities.some((item) => item.status === 'data-blocked')).toBe(true)

    renderRoute(d4z4.slug)
    expect(screen.queryByRole('link', { name: 'Try in browser' })).toBeNull()
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
