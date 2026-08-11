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

const expectedBrowserAction = (workflow: (typeof literatureWorkflows)[number]) => {
  if (workflow.browserRegionStatus === 'provisional') return 'Open provisional locus overview'
  if (workflow.browserCohort === 'aou') return 'Open AoU aggregate locus'
  return 'Try in browser'
}

const batchOneRefs = ['1', '10', '34', '72', '78', '88', '93', '140']
const batchTwoRefs = ['3', '5', '19', '32', '44', '91', '104', '129']
const batchThreeRefs = ['4', '14', '48', '98', '99', '106', '110', '141']
const batchThreeIdentities = [
  {
    ref: '99',
    slug: 'dmpk-interruptions-mosaicism',
    title:
      'Robust Detection of Somatic Mosaicism and Repeat Interruptions by Long-Read Targeted Sequencing in Myotonic Dystrophy Type 1',
    pmid: '33807660',
    doi: '10.3390/ijms22052616',
  },
  {
    ref: '48',
    slug: 'ube3a-imprinting-multimodal-state',
    title:
      'Concordance of whole-genome long-read sequencing with standard clinical testing for Prader-Willi and Angelman syndromes',
    pmid: null,
    doi: '10.1101/2024.04.02.24305233',
  },
  {
    ref: '110',
    slug: 'cyp2d6-cyp2d7-hybrid-star-allele',
    title:
      'Cas9 targeted nanopore sequencing with enhanced variant calling improves CYP2D6 - CYP2D7 hybrid allele genotyping',
    pmid: null,
    doi: '10.1101/2022.03.31.486504',
  },
  {
    ref: '141',
    slug: 'dmd-line1-exonization',
    title:
      'Exonization of a deep intronic long interspersed nuclear element in Becker muscular dystrophy',
    pmid: '36092865',
    doi: '10.3389/fgene.2022.979732',
  },
  {
    ref: '4',
    slug: 'g6pc1-trans-alu-deletion',
    title:
      'Long-read sequencing identified a causal structural variant in an exome-negative case and enabled preimplantation genetic diagnosis',
    pmid: '30279644',
    doi: '10.1186/s41065-018-0069-1',
  },
  {
    ref: '98',
    slug: 'mink1-balanced-translocation',
    title:
      'Multi-Omic Investigations of a 17–19 Translocation Links MINK1 Disruption to Autism, Epilepsy and Osteoporosis',
    pmid: '36012658',
    doi: '10.3390/ijms23169392',
  },
  {
    ref: '14',
    slug: 'rare-sv-expression-outlier-filter',
    title:
      'Integration of transcriptomics and long-read genomics prioritizes structural variants in rare disease',
    pmid: '38585781',
    doi: '10.1101/2024.03.22.24304565',
  },
  {
    ref: '106',
    slug: 'brca1-founder-breakpoint-architecture',
    title:
      'Defining the heterogeneity of unbalanced structural variation underlying breast cancer susceptibility by nanopore genome sequencing',
    pmid: '36797466',
    doi: '10.1038/s41431-023-01284-1',
  },
] as const
const authoritativePkd1Title =
  'Detecting PKD1 variants in polycystic kidney disease patients by single-molecule long-read sequencing'

describe('LongReadLiteratureWorkflowPage', () => {
  test('the 28 stable workflow records match their literature paper identities and contracts', () => {
    expect(literatureWorkflows.map((workflow) => workflow.ref).sort()).toEqual(
      [
        '1',
        '3',
        '4',
        '5',
        '10',
        '14',
        '19',
        '25',
        '32',
        '34',
        '40',
        '44',
        '48',
        '59',
        '72',
        '78',
        '88',
        '91',
        '93',
        '98',
        '99',
        '104',
        '106',
        '110',
        '111',
        '129',
        '140',
        '141',
      ].sort()
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
        year: paper!.year,
        venue: paper!.venue,
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
        expect(workflow.browserRegionBlockedReason).not.toBe('')
        expect(literatureWorkflowBrowserPath(workflow)).toBeNull()
      }
    })

    expect(new Set(literatureWorkflows.map((workflow) => workflow.slug)).size).toBe(28)
    expect(new Set(literatureWorkflows.map((workflow) => workflow.ref)).size).toBe(28)
  })

  test.each(batchThreeIdentities)(
    'pins Batch 3 ref $ref to its authoritative title, DOI, PMID, slug, and PDF identity',
    (identity) => {
      const example = examples.find((paper) => paper.ref === identity.ref)!
      const workflow = literatureWorkflows.find((paper) => paper.ref === identity.ref)!

      expect(example).toMatchObject({
        ref: identity.ref,
        title: identity.title,
        pmid: identity.pmid,
        doi: identity.doi,
        pdfUrl: `/papers/${identity.ref}.pdf`,
      })
      expect(workflow).toMatchObject({
        ref: identity.ref,
        slug: identity.slug,
        paper: {
          title: identity.title,
          pmid: identity.pmid,
          doi: identity.doi,
          pdfUrl: `/papers/${identity.ref}.pdf`,
        },
      })
    }
  )

  test('pins ref 32 to the authoritative DOI/PDF paper title', () => {
    expect(examples.find((paper) => paper.ref === '32')!.title).toBe(authoritativePkd1Title)
    expect(literatureWorkflows.find((workflow) => workflow.ref === '32')!.paper.title).toBe(
      authoritativePkd1Title
    )
  })

  test('keeps normalized SMARCB1 and PRKN prose free of malformed separators', () => {
    ;['129', '104'].forEach((ref) => {
      const prose = JSON.stringify(literatureWorkflows.find((workflow) => workflow.ref === ref))
      expect(prose).not.toContain('.;')
      expect(prose).not.toContain('..')
    })
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
      const browserLink = screen.getByRole('link', { name: expectedBrowserAction(workflow) })
      expect(browserLink.getAttribute('href')).toBe(browserPath)
      expect(browserLink.getAttribute('href')).toContain('dataset=gnomad_r4_lr')
      expect(browserLink.getAttribute('href')).toContain(
        `lr_cohort=${workflow.browserCohort || 'hgsvc_hprc'}`
      )
      expect(browserLink.getAttribute('href')).toContain(
        `show_haplotypes=${workflow.browserShowHaplotypes ?? true}`
      )
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

  test('preserves Batch 2 gated actions, corrected regions, and blocked no-CTA contracts', () => {
    const workflows = new Map(literatureWorkflows.map((workflow) => [workflow.ref, workflow]))

    expect(workflows.get('91')!.browserRegion).toEqual({
      chrom: '18',
      start: 55576116,
      stop: 55596201,
    })
    expect(workflows.get('5')!.browserRegion).toEqual({
      chrom: '3',
      start: 36991000,
      stop: 36995350,
    })
    ;['32', '129', '3'].forEach((ref) => {
      const workflow = workflows.get(ref)!
      expect(workflow.browserRegionStatus).toBe('provisional')
      expect(workflow.browserRegionNotice).toMatch(/locus overview/i)
      const rendered = renderRoute(workflow.slug)
      expect(screen.queryByRole('link', { name: 'Try in browser' })).toBeNull()
      expect(screen.getByRole('link', { name: 'Open provisional locus overview' })).not.toBeNull()
      rendered.unmount()
    })
    ;['19', '104', '44'].forEach((ref) => {
      const workflow = workflows.get(ref)!
      expect(workflow.browserRegion).toBeNull()
      expect(workflow.browserRegionBlockedReason).toMatch(/data-blocked|No safe CTA|No single/i)
      const rendered = renderRoute(workflow.slug)
      expect(screen.queryByRole('link', { name: /browser|locus overview/i })).toBeNull()
      expect(screen.getByRole('status').textContent).toBe(workflow.browserRegionBlockedReason)
      rendered.unmount()
    })
  })

  test('retains every normalized SMARCB1 and PRKN decision branch', () => {
    const smarcb1 = literatureWorkflows.find((workflow) => workflow.ref === '129')!
    const prkn = literatureWorkflows.find((workflow) => workflow.ref === '104')!

    expect(smarcb1.branches).toHaveLength(15)
    expect(smarcb1.branches).toEqual(
      expect.arrayContaining([
        {
          condition: 'Only low cohort AC/AF is available',
          action: 'Do not infer within-person mosaicism; report cohort rarity only.',
          stopRule: true,
        },
        {
          condition: 'Event-level detection/representation or per-copy callability is incomplete',
          action: 'Report data-blocked; do not report 0/584.',
          stopRule: true,
        },
      ])
    )
    expect(prkn.branches).toHaveLength(10)
    expect(prkn.branches).toEqual(
      expect.arrayContaining([
        {
          condition:
            'The exact inversion and deletion occur in one participant but trans phase is unproved',
          action:
            'Report co-occurrence with phase unresolved; do not call full paper-like compound heterozygosity.',
          stopRule: true,
        },
        {
          condition:
            'Any required event, representation, callability, or phase denominator is missing',
          action: 'Report that result data-blocked rather than zero.',
          stopRule: true,
        },
      ])
    )
  })

  test('retains Batch 2 population, linkage, mosaicism, and X-ploidy safety language', () => {
    const source = (ref: string) =>
      JSON.stringify(literatureWorkflows.find((workflow) => workflow.ref === ref))

    expect(source('91')).toMatch(/representation\/callability blocked, never absent or zero/i)
    expect(source('5')).toMatch(/same-molecule linkage is not demonstrated/i)
    expect(source('5')).toMatch(/A\/B maternal\/paternal/i)
    expect(source('129')).toMatch(/mosaicism unsupported/i)
    expect(source('129')).toMatch(/low cohort AC\/AF/i)
    expect(source('19')).toMatch(/XX participant contributes at most two callable copies/i)
    expect(source('19')).toMatch(/XY participant at most one/i)
    expect(source('104')).toMatch(/data-blocked rather than zero/i)
    expect(source('44')).toMatch(/Population occurrence.*must (?:never |not )reclassify/i)
  })

  test('preserves Batch 3 route semantics, branch triples, denominators, and safety boundaries', () => {
    const workflows = new Map(literatureWorkflows.map((workflow) => [workflow.ref, workflow]))
    const branchCounts: Record<string, number> = {
      '99': 8,
      '48': 11,
      '110': 13,
      '141': 8,
      '4': 9,
      '98': 8,
      '14': 9,
      '106': 11,
    }
    Object.entries(branchCounts).forEach(([ref, count]) => {
      expect(workflows.get(ref)!.branches).toHaveLength(count)
    })

    const dmpk = workflows.get('99')!
    expect(dmpk.browserCohort).toBe('aou')
    expect(dmpk.browserShowHaplotypes).toBe(false)
    expect(literatureWorkflowBrowserPath(dmpk)).toContain('lr_cohort=aou&show_haplotypes=false')
    expect(JSON.stringify(dmpk)).toMatch(/event as unavailable in HGSVC\/HPRC/i)
    expect(JSON.stringify(dmpk)).toMatch(/tissue somatic distribution unavailable/i)

    const ube3a = workflows.get('48')!
    expect(ube3a.browserRegion).toBeNull()
    expect(ube3a.browserRegionBlockedReason).toMatch(/No single honest CTA/i)
    expect(JSON.stringify(ube3a)).toMatch(/parent.of.origin.*not demonstrated/i)
    expect(JSON.stringify(ube3a)).toMatch(/A\/B-neutral wording/i)

    const cyp2d6 = workflows.get('110')!
    expect(cyp2d6.browserRegionStatus).toBe('provisional')
    expect(cyp2d6.browserRegion).toEqual({ chrom: '22', start: 42118682, stop: 42150000 })
    expect(JSON.stringify(cyp2d6)).toMatch(/star equivalence data-blocked/i)
    expect(JSON.stringify(cyp2d6)).toMatch(/pharmacogenomic interpretation remains external/i)

    const dmd = workflows.get('141')!
    expect(dmd.browserRegionStatus).toBe('provisional')
    expect(dmd.browserRegion).toEqual({ chrom: 'X', start: 33204343, stop: 33214343 })
    expect(JSON.stringify(dmd)).toMatch(/do not report exonization/i)

    const g6pc1 = workflows.get('4')!
    expect(g6pc1.browserRegionStatus).toBe('provisional')
    expect(JSON.stringify(g6pc1)).toMatch(/named reference participant only/i)
    expect(JSON.stringify(g6pc1)).toMatch(/do not transfer it to the paper patient/i)
    ;['98', '14'].forEach((ref) => {
      expect(workflows.get(ref)!.browserRegion).toBeNull()
      expect(literatureWorkflowBrowserPath(workflows.get(ref)!)).toBeNull()
    })
    expect(JSON.stringify(workflows.get('98'))).toMatch(/multi-chromosome|paired-region/i)
    expect(JSON.stringify(workflows.get('14'))).toMatch(
      /genome-wide\/unmapped with no browser CTA/i
    )

    const brca1 = workflows.get('106')!
    expect(brca1.browserRegionStatus).toBe('provisional')
    expect(brca1.browserRegion).toEqual({ chrom: '17', start: 43073282, stop: 43163674 })
    expect(brca1.browserRegionNotice).toMatch(/does not prove an exact linked event/i)
    expect(brca1.browserRegionNotice).toMatch(/founder comparison remains data-blocked/i)
    expect(brca1.branches).toEqual(
      expect.arrayContaining([
        {
          condition: 'The marker template/boundaries are unavailable',
          action: 'Report exact architecture only; marker/founder comparison is data-blocked.',
          stopRule: true,
        },
        {
          condition: 'AC=0 with representation-complete event AN',
          action:
            'Report not observed in AN callable copies with a declared confidence method; do not infer pathogenicity.',
          stopRule: false,
        },
      ])
    )

    batchThreeRefs.forEach((ref) => {
      const workflow = workflows.get(ref)!
      const source = JSON.stringify(workflow)
      expect(source).toMatch(/data-blocked|data blocked/i)
      expect(workflow.nonDiagnosticBoundary).toMatch(/cannot|does not/i)
      expect(source).toMatch(/callable/i)
      expect(source).toMatch(/candidate|exact/i)
    })
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

  test.each(batchTwoRefs)('Batch 2 ref %s has a routable detailed record', (ref) => {
    const workflow = literatureWorkflows.find((item) => item.ref === ref)!
    renderRoute(workflow.slug)
    expect(screen.getByRole('heading', { level: 1, name: workflow.paper.title })).not.toBeNull()
  })

  test.each(batchThreeRefs)('Batch 3 ref %s has a routable detailed record', (ref) => {
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
