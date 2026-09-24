import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import MethylationToggle from './MethylationToggle'
import { JOINED_ZOOM_NEEDED, type JoinedPhasedMethylationCapability } from '../LongReadVariantPage/perCopyMethylation'

const diagnostic = 'VCF-joined methylation requires receipt /private/server/path; Access denied ' + 'details '.repeat(100)
const capability: JoinedPhasedMethylationCapability = {
  available: false, joinable_to_vcf: false, status: 'UNAVAILABLE_NOT_CONFIGURED', identity: null,
  source_sample_ids: [], max_samples: 25, max_records: 250000, reason: diagnostic,
}
beforeEach(() => { Object.defineProperty(window, 'scroll', { configurable: true, value: jest.fn() }) })

test('unavailable is concise, accessible, unchecked, and does not expose diagnostics even in help', () => {
  const onChange = jest.fn()
  const { container } = render(<MethylationToggle capability={capability} usable={false}
    unavailableReason={diagnostic} checked onChange={onChange} />)
  const checkbox = screen.getByRole('checkbox', { name: 'Methylation' })
  expect(checkbox).toBeDisabled()
  expect(checkbox).not.toBeChecked()
  expect(checkbox).toHaveAccessibleDescription('Unavailable')
  expect(screen.getByRole('status')).toHaveTextContent(/^Unavailable$/)
  expect(container.innerHTML).not.toMatch(/receipt|private\/server|Access denied|details/)
  fireEvent.click(screen.getByRole('button', { name: /Methylation/ }))
  expect(screen.getByText('Methylation measurements cannot yet be matched to the haplotype copies shown here.')).toBeInTheDocument()
  expect(screen.getByText('Unavailable does not mean zero methylation.')).toBeInTheDocument()
  expect(document.body.textContent).not.toContain(diagnostic)
  expect(onChange).not.toHaveBeenCalled()
})

test.each([
  ['UNAVAILABLE_AOU_SUMMARY_ONLY', 'cohort'],
  ['UNAVAILABLE_ORIENTATION_EXCLUDED_CONTIG', 'chromosome'],
  ['UNAVAILABLE_PRIMARY_CARRIERS', 'region'],
])('unavailable %s gives bounded relevant help', (status, scope) => {
  render(<MethylationToggle capability={{ ...capability, status: status as JoinedPhasedMethylationCapability['status'] }}
    usable={false} checked={false} onChange={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /Methylation/ }))
  expect(screen.getByText(new RegExp(`for this ${scope}\\.`))).toBeInTheDocument()
  expect(document.body.textContent).not.toContain(diagnostic)
})

test('size-only rejection says Zoom in, not generic absence or provenance', () => {
  render(<MethylationToggle capability={capability} usable={false} unavailableReason={JOINED_ZOOM_NEEDED} checked onChange={jest.fn()} />)
  const checkbox = screen.getByRole('checkbox', { name: 'Methylation' })
  expect(checkbox).toBeDisabled()
  expect(checkbox).toHaveAccessibleDescription('Zoom in')
  expect(checkbox.parentElement).toHaveAttribute('title', JOINED_ZOOM_NEEDED)
  fireEvent.click(screen.getByRole('button', { name: /Methylation/ }))
  expect(screen.getByText(JOINED_ZOOM_NEEDED)).toBeInTheDocument()
  expect(document.body.textContent).not.toContain('Unavailable')
})

test('loading is not absence; an API failure is unavailable, not still loading or zero', () => {
  const view = render(<MethylationToggle usable={false} checked={false} onChange={jest.fn()} />)
  expect(screen.getByRole('status')).toHaveTextContent('Checking…')
  view.rerender(<MethylationToggle usable={false} unavailableReason={diagnostic} checked={false} onChange={jest.fn()} />)
  expect(screen.getByRole('status')).toHaveTextContent(/^Unavailable$/)
  expect(view.container.innerHTML).not.toContain(diagnostic)
})

test('only region usability enables the control, and scope loss clears its visible checked state', () => {
  const onChange = jest.fn()
  const view = render(<MethylationToggle capability={capability} usable checked={false} onChange={onChange} />)
  const checkbox = screen.getByRole('checkbox', { name: 'Methylation' })
  expect(checkbox).toBeEnabled()
  expect(screen.queryByRole('status')).toBeNull()
  expect(checkbox).not.toHaveAttribute('aria-describedby')
  fireEvent.click(checkbox)
  expect(onChange).toHaveBeenCalledWith(true)
  view.rerender(<MethylationToggle capability={capability} usable={false} checked onChange={onChange} />)
  expect(checkbox).toBeDisabled()
  expect(checkbox).not.toBeChecked()
})
