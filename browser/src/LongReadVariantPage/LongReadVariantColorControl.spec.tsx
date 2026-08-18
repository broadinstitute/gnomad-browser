import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

import LongReadVariantColorControl from './LongReadVariantColorControl'

describe('LongReadVariantColorControl', () => {
  test('places an accessible help button immediately beside the color select', () => {
    const { container } = render(
      <LongReadVariantColorControl value="sv_type" onChange={jest.fn()} />
    )

    const control = screen.getByTestId('lr-variant-color-control')
    const select = within(control).getByRole('combobox', { name: 'Color:' })
    const helpButton = within(control).getByRole('button', { name: 'About variant colors' })

    expect((select as HTMLSelectElement).value).toBe('sv_type')
    expect(select.nextElementSibling).toBe(helpButton)
    expect(container.querySelectorAll('[data-testid="lr-variant-color-control"]')).toHaveLength(1)
  })

  test('opens the established modal and documents the selectable color semantics', () => {
    Object.defineProperty(window, 'scroll', { configurable: true, value: jest.fn() })
    render(<LongReadVariantColorControl value="sv_type" onChange={jest.fn()} />)

    expect(screen.queryByRole('dialog', { name: 'About variant colors' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'About variant colors' }))

    const dialog = screen.getByRole('dialog', { name: 'About variant colors' })
    expect(dialog).not.toBeNull()
    expect(dialog.textContent).toContain('Variant Type')
    expect(dialog.textContent).toContain('SNVs are blue')
    expect(dialog.textContent).toContain('does not filter variants')
    expect(dialog.textContent).toContain('does not indicate pathogenicity, quality')
    expect(dialog.textContent).toContain('deterministic color is generated from each variant ID')
    expect(dialog.textContent).toContain('continuous blue-to-red scale')
    expect(dialog.textContent).toContain('logarithmic grayscale')
    expect(dialog.textContent).toContain('how many displayed haplotype rows contain the variant')
    expect(dialog.textContent).toContain('Summary track has no haplotype-row context')
  })

  test('preserves color selection behavior', () => {
    const onChange = jest.fn()
    render(<LongReadVariantColorControl value="sv_type" onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Color:' }), {
      target: { value: 'position' },
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('position')
  })
})
