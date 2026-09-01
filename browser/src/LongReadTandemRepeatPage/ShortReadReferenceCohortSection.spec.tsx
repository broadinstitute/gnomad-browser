import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import ShortReadReferenceCohortSection, {
  longReadTrShortReadDistributionsQuery,
} from './ShortReadReferenceCohortSection'

jest.mock('@gnomad/ui', () => ({
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}))

jest.mock('../Query', () => ({ children, variables, ...props }: any) => {
  ;(global as any).__SHORT_DISTRIBUTION_QUERY_PROPS__ = { ...props, variables }
  return children({
    data: {
      long_read_tandem_repeat_short_read_distributions: (global as any)
        .__SHORT_DISTRIBUTION_QUERY_DATA__,
    },
  })
})

jest.mock('../ShortTandemRepeatPage/ShortReadStrDistributionPanel', () => ({
  __esModule: true,
  default: ({ id, motif, allele, genotype, plotHeadingLevel }: any) => (
    <div
      data-testid="controlled-short-read-panel"
      data-id={id}
      data-motif={motif}
      data-allele-status={allele.status}
      data-genotype-status={genotype.status}
      data-heading-level={plotHeadingLevel}
    >
      <h4>Mock short-read plot</h4>
    </div>
  ),
}))

const locusId = '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG'

const exactContext: any = {
  status: 'EXACT_UNIQUE',
  matched_component_index: 0,
  matched_component: { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
  catalog_record: {
    id: 'HTT',
    reference_repeat_unit: 'CAG',
    main_reference_region: {
      reference_genome: 'GRCh38',
      chrom: '4',
      start: 3074876,
      stop: 3074933,
    },
    associated_diseases: [],
  },
}

const available = {
  status: 'AVAILABLE',
  reason_code: null,
  short_id: 'HTT',
  matched_component_index: 0,
  matched_component: { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
  main_reference_region: {
    reference_genome: 'GRCh38',
    chrom: '4',
    start: 3074876,
    stop: 3074933,
  },
  reference_repeat_unit: 'CAG',
  distribution_digest: 'sha256:test',
  allele: { status: 'AVAILABLE', reason_code: null, distributions: [] },
  genotype: { status: 'UNAVAILABLE', reason_code: 'GENOTYPE_EMPTY', distributions: [] },
}

const renderSection = (context: any = exactContext) =>
  render(
    <ShortReadReferenceCohortSection locusId={locusId} lrCohort="hgsvc_hprc" context={context} />
  )

describe('ShortReadReferenceCohortSection', () => {
  beforeEach(() => {
    ;(global as any).__SHORT_DISTRIBUTION_QUERY_PROPS__ = undefined
    ;(global as any).__SHORT_DISTRIBUTION_QUERY_DATA__ = available
  })

  test('loads the Phase 4 query only after explicit activation and keeps HTT at top-level CAG', () => {
    renderSection()

    expect(
      screen.getByRole('heading', { level: 3, name: 'Reference-cohort distributions' })
    ).not.toBeNull()
    expect(screen.queryByRole('heading', { name: /Short-read reference cohort/ })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'About the short-read reference cohort' })
    ).toBeNull()
    expect((global as any).__SHORT_DISTRIBUTION_QUERY_PROPS__).toBeUndefined()
    expect(screen.queryByTestId('controlled-short-read-panel')).toBeNull()

    const load = screen.getByRole('button', { name: 'Load short-read distributions' })
    load.focus()
    expect(document.activeElement).toBe(load)
    fireEvent.click(load)

    const props = (global as any).__SHORT_DISTRIBUTION_QUERY_PROPS__
    expect(props.operationName).toBe('LongReadTrShortReadDistributions')
    expect(props.query).toBe(longReadTrShortReadDistributionsQuery)
    expect(props.variables).toEqual({ id: locusId, lrCohort: 'hgsvc_hprc' })
    expect(screen.getByTestId('controlled-short-read-panel').getAttribute('data-id')).toBe('HTT')
    expect(screen.getByTestId('controlled-short-read-panel').getAttribute('data-motif')).toBe('CAG')
    expect(
      screen.getByTestId('controlled-short-read-panel').getAttribute('data-genotype-status')
    ).toBe('UNAVAILABLE')
    expect(
      screen.getByTestId('controlled-short-read-panel').getAttribute('data-heading-level')
    ).toBe('4')
    expect(screen.getByRole('heading', { level: 4, name: 'Mock short-read plot' })).not.toBeNull()
  })

  test.each([
    ['stored motif', { reference_repeat_unit: 'CCG' }],
    ['component index', { matched_component_index: 1 }],
    ['component tuple', { matched_component: { ...available.matched_component, start0: 3074877 } }],
    [
      'main region',
      { main_reference_region: { ...available.main_reference_region, stop: 3074934 } },
    ],
  ])('fails closed when the lazy response changes the exact %s', (_field, patch) => {
    ;(global as any).__SHORT_DISTRIBUTION_QUERY_DATA__ = { ...available, ...patch }
    renderSection()
    fireEvent.click(screen.getByRole('button', { name: 'Load short-read distributions' }))

    expect(screen.queryByTestId('controlled-short-read-panel')).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/unavailable for this exact context/)
  })

  test('keeps incomplete exact context local and does not issue a request', () => {
    renderSection({ ...exactContext, catalog_record: null })

    expect(screen.getByRole('heading', { name: 'Reference-cohort distributions' })).not.toBeNull()
    expect(screen.getByRole('status').getAttribute('data-reason-code')).toBe(
      'EXACT_CONTEXT_INCOMPLETE'
    )
    expect(screen.queryByRole('button', { name: 'Load short-read distributions' })).toBeNull()
    expect((global as any).__SHORT_DISTRIBUTION_QUERY_PROPS__).toBeUndefined()
  })

  test.each(['NONE', 'MULTIPLE', 'AMBIGUOUS_CATALOG', 'UNAVAILABLE'])(
    'does not admit a short-read cohort section for %s context',
    (status) => {
      renderSection({ status, catalog_record: null })
      expect(screen.queryByRole('heading', { name: 'Reference-cohort distributions' })).toBeNull()
      expect((global as any).__SHORT_DISTRIBUTION_QUERY_PROPS__).toBeUndefined()
    }
  )
})
