import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import HaplotypeVariantTable from './HaplotypeVariantTable'

jest.mock('../Link', () => ({ children, to, onClick, title }: any) => (
  <a href={to} onClick={onClick} title={title}>
    {children}
  </a>
))

const locusId = '4-39348424-39348479-AAAAG'
const sourceVariantId = 'chr4-39348424-TRV-55'
const variant = {
  variant_id: `${sourceVariantId}~7`,
  source_variant_id: sourceVariantId,
  tr_id: locusId,
  chrom: 'chr4',
  pos: 39348424,
  end: 39348479,
  ref: 'A',
  alt: 'AAAAAG',
  allele_type: 'trv',
  allele_length: -5,
  freq: { af: 0.231959, ac: 135, an: 582 },
  populations: [],
  rsid: '',
}

const haplotypeGroups = {
  groups: [
    {
      hash: 1,
      start: 39348424,
      stop: 39348479,
      samples: [
        {
          sample_id: 'sample-1',
          vcf_strand: 1,
          phase_set: null,
          variant_sets: [{ readable_id: '', variants: [variant] }],
        },
      ],
      variants: { readable_id: '', variants: [variant] },
      below_threshold: { readable_id: '', variants: [] },
    },
  ],
}

const renderTable = () =>
  render(
    <HaplotypeVariantTable
      mode="haplotype"
      lrCohort="hgsvc_hprc"
      haplotypeGroups={haplotypeGroups as any}
      totalGroups={1}
    />
  )

describe('TR locus rows use the dedicated fixed-height experience', () => {
  test('uses the authoritative locus as the primary link', () => {
    renderTable()
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      `/tandem-repeat/${locusId}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
  })

  test('never adds an inline expanded child row', () => {
    const { container } = renderTable()
    const rowsBefore = container.querySelectorAll('tbody tr').length
    fireEvent.click(screen.getByRole('link').closest('tr')!)
    expect(container.querySelectorAll('tbody tr')).toHaveLength(rowsBefore)
    expect(screen.queryByText('Assigned motif structures')).toBeNull()
    expect(screen.queryByText('TR Allele Size Distribution')).toBeNull()
  })

  test('keeps all rendered cells nowrap for one-line rows', () => {
    const { container } = renderTable()
    expect(container.textContent).toContain('4-39348424-TRV-55')
    expect(getComputedStyle(container.querySelector('tbody td')!).whiteSpace).toBe('nowrap')
  })
})
