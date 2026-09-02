import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import HaplotypeVariantTable from './HaplotypeVariantTable'

jest.mock('../Link', () => ({ children, to, onClick, ...rest }: any) => (
  <a href={to} onClick={onClick} {...rest}>
    {children}
  </a>
))

const locusId = '4-39348424-39348479-AAAAG'
const sourceVariantId = 'chr4-39348424-TRV-55'
const variant = {
  variant_id: `${sourceVariantId}~7`,
  source_variant_id: sourceVariantId,
  alt_index: 1,
  alt_count: 1,
  tr_id: locusId,
  tr_locus_id: locusId,
  chrom: 'chr4',
  pos: 39348424,
  end: 39348479,
  ref: 'AAAAAA',
  alt: 'A',
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

const compoundLocus = '4-100-110-CAG+4-120-130-CAA'
const compoundVariant = {
  ...variant,
  variant_id: 'chr4-100-TRV-30~1',
  source_variant_id: 'chr4-100-TRV-30',
  tr_id: compoundLocus,
  tr_locus_id: compoundLocus,
  chrom: 'chr4',
  pos: 100,
  end: 130,
  gnomad_str: null,
}
const compoundGroups = {
  groups: [
    {
      ...haplotypeGroups.groups[0],
      start: 100,
      stop: 130,
      samples: [
        {
          ...haplotypeGroups.groups[0].samples[0],
          variant_sets: [{ readable_id: '', variants: [compoundVariant] }],
        },
      ],
      variants: { readable_id: '', variants: [compoundVariant] },
    },
  ],
}
const reviewedPresentation = {
  source_representation_kind: 'UNKNOWN',
  presentation_layout: 'REPEAT_FOCUSED',
  presentation_reason: 'REVIEWED_PRIMARY_REPEAT',
  classification_source: null,
  classification_release: null,
  classification_digest: null,
  reviewed_override_digest: 'a'.repeat(64),
}
const compoundBounds = {
  component_envelope_start0: 100,
  component_envelope_end0: 130,
  component_envelope_length_bp: 30,
  component_envelope_basis: 'EXACT_ORDERED_COMPONENTS',
  variation_cluster_status: 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION',
}
const compoundSummary = {
  ordered_component_count: 2,
  distinct_stored_motif_count: 2,
}

const summaryContractVariant = (altIndex: number, presentation: any = reviewedPresentation) => ({
  ...compoundVariant,
  variant_id: `chr4-100-TRV-30~${altIndex}`,
  alt_index: altIndex,
  alt_count: 2,
  tr_locus_presentation: presentation,
  tr_locus_bounds: compoundBounds,
  tr_locus_component_summary: compoundSummary,
  gnomad_str: 'HTT CAG',
})

describe('TR locus rows use the dedicated fixed-height experience', () => {
  test('uses the authoritative locus for an explicit, bounded Details link', () => {
    renderTable()
    const link = screen.getByRole('link', { name: /Details for AAAAG tandem repeat/ })
    expect(link.getAttribute('href')).toBe(
      `/tandem-repeat/${locusId}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
    expect(link.getAttribute('aria-label')).not.toContain(locusId)
    expect(link.textContent).toBe('Details')
  })

  test('joins an exact reviewed-primary label and fails conflicting ALT contracts closed', () => {
    const reviewed = render(
      <HaplotypeVariantTable
        mode="haplotype"
        summaryVariants={[summaryContractVariant(1), summaryContractVariant(2)]}
        haplotypeGroups={compoundGroups as any}
      />
    )
    expect(screen.getByText('HTT CAG tandem repeat · 2 source components')).not.toBeNull()
    reviewed.unmount()

    render(
      <HaplotypeVariantTable
        mode="haplotype"
        summaryVariants={[summaryContractVariant(1), summaryContractVariant(2, null)]}
        haplotypeGroups={compoundGroups as any}
      />
    )
    expect(screen.getByText(/Multi-component TR locus · 2 components \/ 2 motifs/)).not.toBeNull()
    expect(screen.queryByText(/HTT CAG tandem repeat/)).toBeNull()
  })

  test('never adds an inline expanded child row', () => {
    const { container } = renderTable()
    const rowsBefore = container.querySelectorAll('tbody tr').length
    fireEvent.click(screen.getByRole('link').closest('tr')!)
    expect(container.querySelectorAll('tbody tr')).toHaveLength(rowsBefore)
    expect(screen.queryByText('Assigned motif structures')).toBeNull()
    expect(screen.queryByText('TR Allele Size Distribution')).toBeNull()
  })

  test('blanks forbidden exact-allele columns while retaining safe carrier and group unions', () => {
    const { container } = renderTable()
    const headings = Array.from(container.querySelectorAll('thead th')).map((header) =>
      header.textContent?.replace(/[▲▼]/g, '').trim()
    )
    const cells = Array.from(container.querySelectorAll('tbody tr:first-child td'))
    const value = (heading: string) => cells[headings.indexOf(heading)]?.textContent

    expect(value('Type')).toBe('TR')
    expect(value('Length')).toBe('-5 bp')
    ;['LR AF', 'Grp AF', 'SR Match', 'CADD', 'phyloP', 'Consequence', 'rsID'].forEach((heading) =>
      expect(value(heading)).toBe('—')
    )
    expect(value('Groups')).toBe('1 / 1')
    expect(value('Carriers')).toBe('1 / 1')
  })

  test('shows exact interval semantics and allows the bounded identity cell to wrap safely', () => {
    const { container } = renderTable()
    expect(container.textContent).toContain('AAAAG tandem repeat · 4:39,348,425–39,348,479')
    expect(container.textContent).toContain(
      'GRCh38 exact component interval 4:[39,348,424, 39,348,479) · 55 bp'
    )
    expect(container.textContent).toContain('1 component / 1 distinct stored motif')
    expect(container.textContent).toContain('-5 bp')
    expect(container.textContent).not.toContain(sourceVariantId)
    expect(getComputedStyle(container.querySelector('tbody td')!).whiteSpace).toBe('normal')
    expect(getComputedStyle(container.querySelector('tbody td')!).overflowWrap).toBe('anywhere')
    const summaryScroller = screen.getByRole('region', {
      name: 'Scrollable locus label, interval, and component summary',
    })
    expect(summaryScroller.getAttribute('tabindex')).toBe('0')
    expect(getComputedStyle(summaryScroller).overflow).toBe('auto')
  })
})
