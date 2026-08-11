import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

import LongReadLiteratureExamplesPage from './LongReadLiteratureExamplesPage'
import examples from './data/longReadLiteratureExamples.json'
import { literatureWorkflowPath, literatureWorkflows } from './longReadLiteratureWorkflows'

describe('LongReadLiteratureExamplesPage', () => {
  test('renders literature links with LR browser context', () => {
    render(<LongReadLiteratureExamplesPage />)

    expect(
      screen.getByRole('heading', { name: 'Long Read Diagnostic Literature Examples' })
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: `All (${examples.length})` })).not.toBeNull()

    const example = examples.find((item) => item.region?.verified && item.pdfUrl)
    expect(example).toBeDefined()

    const card = screen.getByText(example!.title).parentElement!
    const links = within(card).getAllByRole('link')
    const browserLink = links.find((link) => link.textContent === 'View in browser')
    const pdfLink = links.find((link) => link.textContent === 'PDF')

    expect(browserLink?.getAttribute('href')).toBe(
      `/region/${example!.region!.chrom}-${example!.region!.start}-${
        example!.region!.stop
      }?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&show_haplotypes=true`
    )
    expect(pdfLink?.getAttribute('href')).toBe(example!.pdfUrl)
  })

  test('links all 28 curated papers, including all three eight-paper batches', () => {
    render(<LongReadLiteratureExamplesPage />)

    const detailLinks = screen.getAllByRole('link', { name: 'Detailed workflow' })
    expect(detailLinks).toHaveLength(28)
    expect(detailLinks.map((link) => link.getAttribute('href')).sort()).toEqual(
      literatureWorkflows.map((workflow) => literatureWorkflowPath(workflow.slug)).sort()
    )

    const batchOneRefs = new Set(['1', '10', '34', '72', '78', '88', '93', '140'])
    const batchOnePaths = literatureWorkflows
      .filter((workflow) => batchOneRefs.has(workflow.ref))
      .map((workflow) => literatureWorkflowPath(workflow.slug))
    expect(
      detailLinks.filter((link) => batchOnePaths.includes(link.getAttribute('href')!))
    ).toHaveLength(8)

    const batchTwoRefs = new Set(['3', '5', '19', '32', '44', '91', '104', '129'])
    const batchTwoPaths = literatureWorkflows
      .filter((workflow) => batchTwoRefs.has(workflow.ref))
      .map((workflow) => literatureWorkflowPath(workflow.slug))
    expect(
      detailLinks.filter((link) => batchTwoPaths.includes(link.getAttribute('href')!))
    ).toHaveLength(8)

    const batchThreeRefs = new Set(['4', '14', '48', '98', '99', '106', '110', '141'])
    const batchThreePaths = literatureWorkflows
      .filter((workflow) => batchThreeRefs.has(workflow.ref))
      .map((workflow) => literatureWorkflowPath(workflow.slug))
    expect(
      detailLinks.filter((link) => batchThreePaths.includes(link.getAttribute('href')!))
    ).toHaveLength(8)
  })

  test('marks the PALB2 locus provisional rather than verified', () => {
    render(<LongReadLiteratureExamplesPage />)

    const palb2 = examples.find((item) => item.ref === '93')!
    expect(palb2.region?.verified).toBe(false)
    const card = screen.getByText(palb2.title).parentElement!
    expect(within(card).getByText('approximate region')).not.toBeNull()
    expect(within(card).queryByText('verified region')).toBeNull()
  })

  test('labels approximate index actions as locus overviews', () => {
    render(<LongReadLiteratureExamplesPage />)

    const pkd1 = examples.find((item) => item.ref === '3')!
    const card = screen.getByText(pkd1.title).parentElement!
    expect(
      within(card).getByRole('link', { name: 'Open provisional locus overview' })
    ).not.toBeNull()
    expect(within(card).queryByRole('link', { name: 'View in browser' })).toBeNull()
  })

  test('corrects exact Batch 2 index windows and suppresses unsafe generic links', () => {
    render(<LongReadLiteratureExamplesPage />)

    const tcf4 = examples.find((item) => item.ref === '91')!
    const mlh1 = examples.find((item) => item.ref === '5')!
    expect(tcf4.region).toEqual({
      chrom: '18',
      start: 55576116,
      stop: 55596201,
      truncated: false,
      verified: true,
    })
    expect(mlh1.region).toEqual({
      chrom: '3',
      start: 36991000,
      stop: 36995350,
      truncated: false,
      verified: true,
    })
    ;['19', '104', '44'].forEach((ref) => {
      const example = examples.find((item) => item.ref === ref)!
      const card = screen.getByText(example.title).parentElement!
      expect(example.region).toBeNull()
      expect(within(card).queryByRole('link', { name: /browser|locus overview/i })).toBeNull()
      expect(within(card).getByRole('link', { name: 'Detailed workflow' })).not.toBeNull()
    })
  })

  test('uses safe Batch 3 index actions and the AoU-only DMPK route', () => {
    render(<LongReadLiteratureExamplesPage />)

    const dmpk = examples.find((item) => item.ref === '99')!
    const dmpkCard = screen.getByText(dmpk.title).parentElement!
    const dmpkLink = within(dmpkCard).getByRole('link', { name: 'Open AoU aggregate locus' })
    expect(dmpkLink.getAttribute('href')).toContain('lr_cohort=aou')
    expect(dmpkLink.getAttribute('href')).toContain('show_haplotypes=false')
    ;['48', '98', '14'].forEach((ref) => {
      const example = examples.find((item) => item.ref === ref)!
      const card = screen.getByText(example.title).parentElement!
      expect(example.region).toBeNull()
      expect(within(card).queryByRole('link', { name: /browser|locus|AoU/i })).toBeNull()
      expect(within(card).getByRole('link', { name: 'Detailed workflow' })).not.toBeNull()
    })

    const provisionalRegions: Record<string, { chrom: string; start: number; stop: number }> = {
      '110': { chrom: '22', start: 42118682, stop: 42150000 },
      '141': { chrom: 'X', start: 33204343, stop: 33214343 },
      '4': { chrom: '17', start: 42897618, stop: 42917618 },
      '106': { chrom: '17', start: 43073282, stop: 43163674 },
    }
    Object.entries(provisionalRegions).forEach(([ref, region]) => {
      const example = examples.find((item) => item.ref === ref)!
      const card = screen.getByText(example.title).parentElement!
      expect(example.region).toMatchObject({ ...region, verified: false })
      expect(
        within(card).getByRole('link', { name: 'Open provisional locus overview' })
      ).not.toBeNull()
    })
  })

  test('does not offer a region link for the unmapped D4Z4 workflow', () => {
    render(<LongReadLiteratureExamplesPage />)

    const d4z4 = examples.find((item) => item.ref === '140')!
    const card = screen.getByText(d4z4.title).parentElement!
    expect(within(card).queryByRole('link', { name: 'View in browser' })).toBeNull()
    expect(within(card).getByRole('link', { name: 'Detailed workflow' })).not.toBeNull()
  })

  test('filters cards by their primary archetype', () => {
    render(<LongReadLiteratureExamplesPage />)

    const a1Example = examples.find((item) => item.archetype?.split('+')[0].trim() === 'A1')!
    const a6Example = examples.find((item) => item.archetype?.split('+')[0].trim() === 'A6')!

    fireEvent.click(screen.getByRole('button', { name: /^A1 — Repeat expansions/ }))

    expect(screen.getByText(a1Example.title)).not.toBeNull()
    expect(screen.queryByText(a6Example.title)).toBeNull()
  })
})
