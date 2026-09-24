import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SourceLabelledMethylation, { rawMethylationScope, validateRawMethylation } from './SourceLabelledMethylation'

const point = { chr: 'chr22', pos1: 99, pos2: 100, sample: 'HG00097', methylation: 72.5,
  coverage: 8, data_layer: 'SOURCE_PHASED', source_haplotype: 'HAP1' as const, vcf_strand: null, phase_set: null }
const originalFetch = global.fetch
const capability = { available: true, joinable_to_vcf: false, route_run_id: 'raw-source-run',
  source_sample_ids: ['HG00097', 'HG00100'], reason: 'Source labels only' }
afterEach(() => { global.fetch = originalFetch })

test('browser one-based inclusive region becomes inclusive native BED starts', () => {
  expect(rawMethylationScope('22', 100, 200, 'hgsvc_hprc')).toEqual({ chrom: 'chr22', start: 99, stop: 199 })
  expect(rawMethylationScope('chr22', 1, 1, 'hgsvc_hprc')).toEqual({ chrom: 'chr22', start: 0, stop: 0 })
})
test.each([['X', 1, 10, 'hgsvc_hprc'], ['Y', 1, 10, 'hgsvc_hprc'], ['22', 1, 10, 'aou'],
  ['22', 1, 10001, 'hgsvc_hprc'], ['22', 0, 10, 'hgsvc_hprc'], ['22', 10, 1, 'hgsvc_hprc']])(
  'unsupported scope %s %s %s %s is unavailable', (chrom, start, stop, cohort) => {
    expect(rawMethylationScope(chrom as string, start as number, stop as number, cohort as string).reason).toBeTruthy()
  }
)
test.each([{ vcf_strand: 1 }, { phase_set: '10' }, { data_layer: 'SAMPLE_TOTAL' },
  { source_haplotype: 'A' }, { sample: 'other' }, { chr: 'chr1' }, { pos1: 98 },
  { methylation: NaN }, { methylation: 101 }, { coverage: -1 }, { pos2: 102 }])(
  'rejects foreign or falsely oriented measurements %o', (change) => {
    expect(() => validateRawMethylation([{ ...point, ...change } as any], 'HG00097', 'chr22', 99, 199)).toThrow()
  }
)
test('empty observations stay empty, not methylation zero', () => {
  expect(validateRawMethylation([], 'HG00097', 'chr22', 99, 199)).toEqual([])
  expect(validateRawMethylation([point], 'HG00097', 'chr22', 99, 199)).toEqual([point])
})
test('standalone opt-in load uses native coordinates and renders source labels; scope change hides old points', async () => {
  global.fetch = jest.fn().mockImplementation(async (_url, options) => {
    const body = JSON.parse(options.body)
    return { ok: true, json: async () => ({ data: body.query.includes('RawMethylationCapability')
      ? { phased_methylation_capability: capability } : { source_phased_methylation: [point] } }) }
  })
  const view = render(<SourceLabelledMethylation chrom="22" start={100} stop={200} cohort="hgsvc_hprc" />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Load raw HAP1/HAP2' })).toBeEnabled())
  expect(global.fetch).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Load raw HAP1/HAP2' }))
  await screen.findByTestId('raw-methylation-point')
  const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)
  expect(body.variables).toEqual({ chrom: 'chr22', start: 99, stop: 199, sample: 'HG00097', cohort: 'hgsvc_hprc' })
  expect(screen.getByRole('heading')).toHaveTextContent('not VCF-joined')
  expect(screen.getByRole('img', { name: 'Source HAP1 measured CpGs' })).toBeInTheDocument()
  view.rerender(<SourceLabelledMethylation chrom="22" start={300} stop={400} cohort="hgsvc_hprc" />)
  expect(screen.queryByTestId('raw-methylation-point')).toBeNull()
  expect(global.fetch).toHaveBeenCalledTimes(2)
})
test('GraphQL errors are visible and never rendered as an empty assay', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ errors: [{ message: 'Access denied' }] }) })
  render(<SourceLabelledMethylation chrom="22" start={100} stop={200} cohort="hgsvc_hprc" />)
  await screen.findByText('Access denied')
  expect(screen.getByRole('button', { name: 'Load raw HAP1/HAP2' })).toBeDisabled()
  expect(screen.queryByText(/0 measured/)).toBeNull()
})
