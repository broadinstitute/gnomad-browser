import React from 'react'
import mitochondrialVariantFactory, {
  populationFactory,
} from '../__factories__/MitochondrialVariant'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

import MitochondrialVariantPopulationFrequenciesTable from './MitochondrialVariantPopulationFrequenciesTable'

describe('MitochondrialVariantPopulationFrequenciesTable', () => {
  test('has no unexpected regressions', () => {
    const variant = mitochondrialVariantFactory.build()
    const tree = render(<MitochondrialVariantPopulationFrequenciesTable variant={variant} />)
    expect(tree).toMatchSnapshot()
  })

  // Odd ordering is intentional, to help ensure sort is actually sorting
  const ids: PopulationId[] = ['fin', 'amr', 'sas', 'afr', 'asj']
  const numericValues = [2, 5, 1, 3, 4]

  describe('sorting', () => {
    test('sorts by ID', async () => {
      const populations = ids.map((id) => populationFactory.build({ id }))
      const variant = mitochondrialVariantFactory.build({ populations })

      const user = userEvent.setup()
      const tree = render(<MitochondrialVariantPopulationFrequenciesTable variant={variant} />)
      expect(tree).toMatchSnapshot()

      const idButton = screen.getByText('Genetic Ancestry Group')

      await user.click(idButton)
      const descendingIdCells = screen.queryAllByRole('rowheader')
      const descendingIds = descendingIdCells.map((cell) => cell.innerHTML)
      expect(descendingIds).toEqual([
        'South Asian',
        'European (Finnish)',
        'Ashkenazi Jewish',
        'African/African American',
        'Admixed American',
        'Total',
      ])

      await user.click(idButton)
      const ascendingIdCells = screen.queryAllByRole('rowheader')
      const ascendingIds = ascendingIdCells.map((cell) => cell.innerHTML)
      expect(ascendingIds).toEqual([
        'Admixed American',
        'African/African American',
        'Ashkenazi Jewish',
        'European (Finnish)',
        'South Asian',
        'Total',
      ])
    })

    test('sorts by an', async () => {
      const populations = ids.map((id, i) => populationFactory.build({ id, an: numericValues[i] }))
      const variant = mitochondrialVariantFactory.build({ populations })

      const user = userEvent.setup()
      const tree = render(<MitochondrialVariantPopulationFrequenciesTable variant={variant} />)
      expect(tree).toMatchSnapshot()

      const anButton = screen.getByText('Allele Number')

      await user.click(anButton)
      const descendingIdCells = screen.queryAllByRole('rowheader')
      const descendingIds = descendingIdCells.map((cell) => cell.innerHTML)
      expect(descendingIds).toEqual([
        'Admixed American',
        'Ashkenazi Jewish',
        'African/African American',
        'European (Finnish)',
        'South Asian',
        'Total',
      ])

      await user.click(anButton)
      const ascendingIdCells = screen.queryAllByRole('rowheader')
      const ascendingIds = ascendingIdCells.map((cell) => cell.innerHTML)
      expect(ascendingIds).toEqual([
        'South Asian',
        'European (Finnish)',
        'African/African American',
        'Ashkenazi Jewish',
        'Admixed American',
        'Total',
      ])
    })

    test('sorts by ac_het', async () => {
      const populations = ids.map((id, i) =>
        populationFactory.build({ id, ac_het: numericValues[i] })
      )
      const variant = mitochondrialVariantFactory.build({ populations })

      const user = userEvent.setup()
      const tree = render(<MitochondrialVariantPopulationFrequenciesTable variant={variant} />)
      expect(tree).toMatchSnapshot()

      const acHetButton = screen.getByText('Heteroplasmic AC')

      await user.click(acHetButton)
      const descendingIdCells = screen.queryAllByRole('rowheader')
      const descendingIds = descendingIdCells.map((cell) => cell.innerHTML)
      expect(descendingIds).toEqual([
        'Admixed American',
        'Ashkenazi Jewish',
        'African/African American',
        'European (Finnish)',
        'South Asian',
        'Total',
      ])

      await user.click(acHetButton)
      const ascendingIdCells = screen.queryAllByRole('rowheader')
      const ascendingIds = ascendingIdCells.map((cell) => cell.innerHTML)
      expect(ascendingIds).toEqual([
        'South Asian',
        'European (Finnish)',
        'African/African American',
        'Ashkenazi Jewish',
        'Admixed American',
        'Total',
      ])
    })

    test('sorts by ac_hom', async () => {
      const populations = ids.map((id, i) =>
        populationFactory.build({ id, ac_hom: numericValues[i] })
      )
      const variant = mitochondrialVariantFactory.build({ populations })

      const user = userEvent.setup()
      const tree = render(<MitochondrialVariantPopulationFrequenciesTable variant={variant} />)
      expect(tree).toMatchSnapshot()

      const acHomButton = screen.getByText('Homoplasmic AC')

      await user.click(acHomButton)
      const descendingIdCells = screen.queryAllByRole('rowheader')
      const descendingIds = descendingIdCells.map((cell) => cell.innerHTML)
      expect(descendingIds).toEqual([
        'Admixed American',
        'Ashkenazi Jewish',
        'African/African American',
        'European (Finnish)',
        'South Asian',
        'Total',
      ])

      await user.click(acHomButton)
      const ascendingIdCells = screen.queryAllByRole('rowheader')
      const ascendingIds = ascendingIdCells.map((cell) => cell.innerHTML)
      expect(ascendingIds).toEqual([
        'South Asian',
        'European (Finnish)',
        'African/African American',
        'Ashkenazi Jewish',
        'Admixed American',
        'Total',
      ])
    })

    test('sorts by af_het', async () => {
      const populations = ids.map((id, i) =>
        populationFactory.build({ id, ac_het: numericValues[i], an: 100 })
      )
      const variant = mitochondrialVariantFactory.build({ populations })

      const user = userEvent.setup()
      const tree = render(<MitochondrialVariantPopulationFrequenciesTable variant={variant} />)
      expect(tree).toMatchSnapshot()

      const afHetButton = screen.getByText('Heteroplasmic AF')

      await user.click(afHetButton)
      const descendingIdCells = screen.queryAllByRole('rowheader')
      const descendingIds = descendingIdCells.map((cell) => cell.innerHTML)
      expect(descendingIds).toEqual([
        'Admixed American',
        'Ashkenazi Jewish',
        'African/African American',
        'European (Finnish)',
        'South Asian',
        'Total',
      ])

      await user.click(afHetButton)
      const ascendingIdCells = screen.queryAllByRole('rowheader')
      const ascendingIds = ascendingIdCells.map((cell) => cell.innerHTML)
      expect(ascendingIds).toEqual([
        'South Asian',
        'European (Finnish)',
        'African/African American',
        'Ashkenazi Jewish',
        'Admixed American',
        'Total',
      ])
    })

    test('sorts by af_hom', async () => {
      const populations = ids.map((id, i) =>
        populationFactory.build({ id, ac_hom: numericValues[i], an: 100 })
      )
      const variant = mitochondrialVariantFactory.build({ populations })

      const user = userEvent.setup()
      const tree = render(<MitochondrialVariantPopulationFrequenciesTable variant={variant} />)
      expect(tree).toMatchSnapshot()

      const afHomButton = screen.getByText('Homoplasmic AF')

      // af_hom is our default sort, so first click will give us ascending order,
      // rather than descending like the other columns
      await user.click(afHomButton)
      const ascendingIdCells = screen.queryAllByRole('rowheader')
      const ascendingIds = ascendingIdCells.map((cell) => cell.innerHTML)
      expect(ascendingIds).toEqual([
        'South Asian',
        'European (Finnish)',
        'African/African American',
        'Ashkenazi Jewish',
        'Admixed American',
        'Total',
      ])

      await user.click(afHomButton)
      const descendingIdCells = screen.queryAllByRole('rowheader')
      const descendingIds = descendingIdCells.map((cell) => cell.innerHTML)
      expect(descendingIds).toEqual([
        'Admixed American',
        'Ashkenazi Jewish',
        'African/African American',
        'European (Finnish)',
        'South Asian',
        'Total',
      ])
    })
  })
})
