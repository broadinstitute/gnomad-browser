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

describe('LongReadLiteratureWorkflowPage', () => {
  test('the four stable workflow records match their literature paper identities', () => {
    expect(literatureWorkflows.map((workflow) => workflow.ref).sort()).toEqual([
      '111',
      '25',
      '40',
      '59',
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
    })
  })

  test.each(literatureWorkflows)(
    'routes $slug and preserves browser query identity',
    (workflow) => {
      renderRoute(workflow.slug)

      expect(screen.getByRole('heading', { level: 1, name: workflow.paper.title })).not.toBeNull()
      expect(
        screen.getByText((content, element) =>
          element?.tagName === 'P' ? content.includes(workflow.locus) : false
        )
      ).not.toBeNull()

      const tryLink = screen.getByRole('link', { name: 'Try in browser' })
      expect(tryLink.getAttribute('href')).toBe(literatureWorkflowBrowserPath(workflow))
      expect(tryLink.getAttribute('href')).toContain('dataset=gnomad_r4_lr')
      expect(tryLink.getAttribute('href')).toContain('lr_cohort=hgsvc_hprc')
      expect(tryLink.getAttribute('href')).toContain('show_haplotypes=true')

      expect(screen.getByRole('note', { name: 'Non-diagnostic boundary' }).textContent).toContain(
        'not diagnostic'
      )
      expect(
        screen.getByRole('heading', { name: 'Exact Given / When / Then story' })
      ).not.toBeNull()
      expect(
        screen.getByRole('heading', { name: 'Acceptance test and forbidden interpretation' })
      ).not.toBeNull()
    }
  )

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
