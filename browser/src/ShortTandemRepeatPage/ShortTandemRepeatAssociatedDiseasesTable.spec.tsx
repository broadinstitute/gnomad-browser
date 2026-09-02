import React from 'react'
import { render, screen } from '@testing-library/react'

import ShortTandemRepeatAssociatedDiseasesTable from './ShortTandemRepeatAssociatedDiseasesTable'

jest.mock('@gnomad/ui', () => ({
  BaseTable: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  ExternalLink: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

const diseases: any = [
  {
    name: 'Example disease',
    symbol: 'EX',
    omim_id: '123456',
    inheritance_mode: 'Autosomal dominant',
    repeat_size_classifications: [{ classification: 'Pathogenic', min: 40, max: null }],
    notes: 'Catalog note',
  },
]

describe('ShortTandemRepeatAssociatedDiseasesTable', () => {
  test('preserves notes and the classic range heading by default', () => {
    render(<ShortTandemRepeatAssociatedDiseasesTable associatedDiseases={diseases} />)

    expect(screen.getByRole('columnheader', { name: 'Ranges of repeats' })).not.toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Notes' })).not.toBeNull()
    expect(screen.getByText('Catalog note')).not.toBeNull()
  })

  test('allows the LR context to omit notes and name catalog ranges precisely', () => {
    render(
      <ShortTandemRepeatAssociatedDiseasesTable
        associatedDiseases={diseases}
        showNotes={false}
        repeatRangesHeading="Catalog repeat-count ranges"
      />
    )

    expect(screen.getByRole('columnheader', { name: 'Catalog repeat-count ranges' })).not.toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Notes' })).toBeNull()
    expect(screen.queryByText('Catalog note')).toBeNull()
  })
})
