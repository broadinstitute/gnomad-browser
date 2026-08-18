import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryHistory } from 'history'
import { Router } from 'react-router-dom'

import geneFactory from '../__factories__/Gene'

const lrCoverageProps: any[] = []
const shortReadCoverageProps: any[] = []
const longReadVariantProps: any[] = []
const regularVariantProps: any[] = []

jest.mock('../Query', () => () => null)
jest.mock('../HaplotypeRegionPage/LRCoverageTrack', () => (props: any) => {
  lrCoverageProps.push(props)
  return <div data-testid="lr-coverage" />
})
jest.mock('../RegionPage/ShortReadCoverageContextTrack', () => (props: any) => {
  shortReadCoverageProps.push(props)
  return <div data-testid="sr-coverage" />
})
jest.mock('./LongReadVariantsInGene', () => (props: any) => {
  longReadVariantProps.push(props)
  return (
    <button type="button" onClick={() => props.onChangeLrCohort('aou')}>
      Select All of Us
    </button>
  )
})
jest.mock('./VariantsInGene', () => (props: any) => {
  regularVariantProps.push(props)
  return <div data-testid="regular-variants" />
})

// Jest mocks must be registered before importing the component under test.
// eslint-disable-next-line import/first
import GenePage from './GenePage'

const renderGenePage = ({
  datasetId = 'gnomad_r4_lr',
  chrom = '22',
  referenceGenome = 'GRCh38',
  search = '?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&show_short_read_coverage=true&other=kept',
}: {
  datasetId?: any
  chrom?: string
  referenceGenome?: 'GRCh37' | 'GRCh38'
  search?: string
} = {}) => {
  const history = createMemoryHistory({ initialEntries: [`/gene/ENSG1${search}`] })
  const gene = {
    ...geneFactory.build({
      gene_id: 'ENSG1',
      chrom,
      start: 100,
      stop: 200,
      reference_genome: referenceGenome,
    }),
    exons: [{ feature_type: 'CDS' as const, start: 120, stop: 180 }],
  }

  render(
    <Router history={history}>
      <GenePage
        datasetId={datasetId}
        gene={gene}
        geneId={gene.gene_id}
        availableLrCohorts={['hgsvc_hprc', 'aou']}
      />
    </Router>
  )

  return { gene, history }
}

describe('long-read gene page parity', () => {
  beforeEach(() => {
    lrCoverageProps.length = 0
    shortReadCoverageProps.length = 0
    longReadVariantProps.length = 0
    regularVariantProps.length = 0
  })

  test('renders opted-in short-read context for the gene and current viewport', () => {
    renderGenePage()

    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Show short-read coverage context',
        }) as HTMLInputElement
      ).checked
    ).toBe(true)
    expect(screen.getByTestId('sr-coverage')).not.toBeNull()
    expect(shortReadCoverageProps.at(-1)).toMatchObject({
      chrom: '22',
      start: 100,
      stop: 200,
      viewStart: 100,
      viewStop: 200,
    })
    expect(lrCoverageProps.at(-1)).toMatchObject({
      chrom: '22',
      start: 100,
      stop: 200,
      lrCohort: 'hgsvc_hprc',
      viewStart: 100,
      viewStop: 200,
    })
    expect(longReadVariantProps.at(-1).lrCohort).toBe('hgsvc_hprc')
  })

  test('toggles context and cohort without dropping gene URL state', async () => {
    const { history } = renderGenePage()

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Show short-read coverage context' })
    )
    let params = new URLSearchParams(history.location.search)
    expect(params.has('show_short_read_coverage')).toBe(false)
    expect(params.get('dataset')).toBe('gnomad_r4_lr')
    expect(params.get('lr_cohort')).toBe('hgsvc_hprc')
    expect(params.get('other')).toBe('kept')
    expect(screen.queryByTestId('sr-coverage')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Select All of Us' }))
    params = new URLSearchParams(history.location.search)
    expect(params.get('dataset')).toBe('gnomad_r4_lr')
    expect(params.get('lr_cohort')).toBe('aou')
    expect(params.get('other')).toBe('kept')
    expect(lrCoverageProps.at(-1).lrCohort).toBe('aou')
  })

  test.each(['X', 'Y', 'M'])('guards chromosome %s on LR gene pages', (chrom) => {
    renderGenePage({ chrom })

    expect(screen.queryByRole('checkbox', { name: 'Show short-read coverage context' })).toBeNull()
    expect(screen.queryByTestId('sr-coverage')).toBeNull()
  })

  test('keeps the established coding-only defaults on a short-read gene page', () => {
    renderGenePage({
      datasetId: 'gnomad_r4',
      search: '?dataset=gnomad_r4&show_short_read_coverage=true',
    })

    expect(screen.queryByRole('checkbox', { name: 'Show short-read coverage context' })).toBeNull()
    expect(screen.queryByTestId('sr-coverage')).toBeNull()
    expect(longReadVariantProps).toHaveLength(0)
    expect(regularVariantProps).toHaveLength(1)
    expect(regularVariantProps[0]).toMatchObject({
      datasetId: 'gnomad_r4',
      includeNonCodingTranscripts: false,
      includeUTRs: false,
    })
  })
})
