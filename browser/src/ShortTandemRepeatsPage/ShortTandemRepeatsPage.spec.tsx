import React from 'react'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import ShortTandemRepeatsPage from './ShortTandemRepeatsPage'
import { mockQueries } from '../../../tests/__helpers__/queries'
import Query, { BaseQuery } from '../Query'
import { MemoryRouter } from 'react-router'

jest.mock('../Query', () => {
  const originalModule = jest.requireActual('../Query')

  return {
    __esModule: true,
    ...(originalModule as object),
    default: jest.fn(),
    BaseQuery: jest.fn(),
  }
})

const { resetMockApiCalls, resetMockApiResponses, simulateApiResponse, setMockApiResponses } =
  mockQueries()

beforeEach(() => {
  Query.mockImplementation(
    jest.fn(({ children, operationName, variables, query }) =>
      simulateApiResponse('Query', query, children, operationName, variables)
    )
  )
  ;(BaseQuery as any).mockImplementation(
    jest.fn(({ children, operationName, variables, query }) =>
      simulateApiResponse('BaseQuery', query, children, operationName, variables)
    )
  )
})

afterEach(() => {
  resetMockApiCalls()
  resetMockApiResponses()
})

const genotypeCountsFromLowToHigh = (
  low: number,
  mediumLow: number,
  medium: number,
  mediumHigh: number,
  high: number
) => [
  { quality_description: 'low', genotype_count: low },
  { quality_description: 'medium-low', genotype_count: mediumLow },
  { quality_description: 'medium', genotype_count: medium },
  { quality_description: 'medium-high', genotype_count: mediumHigh },
  { quality_description: 'high', genotype_count: high },
]

const strApiResponse = {
  short_tandem_repeats: [
    {
      id: 'AR',
      gene: {
        ensembl_id: 'ENSG00000169083',
        symbol: 'AR',
        region: 'coding: polyglutamine',
      },
      reference_repeat_unit: 'GCA',
      associated_diseases: [
        {
          name: 'Spinal and bulbar muscular atrophy',
          symbol: 'SBMA',
          omim_id: '313200',
          inheritance_mode: 'X-linked recessive',
        },
      ],
      main_reference_region: {
        chrom: '1',
        start: 123,
        stop: 234,
      },
      average_quality_of_manually_reviewed_genotypes: 4.82,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(0, 0, 0, 5, 23),
    },
    {
      id: 'ARX_1',
      gene: {
        ensembl_id: 'ENSG00000004848',
        symbol: 'ARX',
        region: 'coding: polyalanine',
      },
      reference_repeat_unit: 'NGC',
      associated_diseases: [
        {
          name: 'X-linked mental retardation with or without seizures',
          symbol: 'MRXARX',
          omim_id: '300419',
          inheritance_mode: 'X-linked recessive',
        },
        {
          name: 'Developmental and epileptic encephalopathy-1',
          symbol: 'DEE1',
          omim_id: '308350',
          inheritance_mode: 'Z-linked recessive',
        },
      ],
      main_reference_region: {
        chrom: '2',
        start: 234,
        stop: 345,
      },
      // (25 * 1 + 10 * 2 + 20 * 3 + 5 * 4 + 10 * 5) / 70
      average_quality_of_manually_reviewed_genotypes: 175 / 70,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(25, 10, 20, 5, 10),
    },
    {
      id: 'AFF2',
      gene: {
        ensembl_id: 'ENSG00000155966',
        symbol: 'AFF2',
        region: "5'-UTR",
      },
      reference_repeat_unit: 'GCC',
      associated_diseases: [
        {
          name: 'FRAXE mental retardation',
          symbol: 'FRAXE',
          omim_id: '309548',
          inheritance_mode: 'Imaginary inheritance mode',
        },
      ],
      main_reference_region: {
        chrom: '3',
        start: 345,
        stop: 456,
      },
      // (160 * 1 + 50 * 2 + 15 * 3 + 4 * 4 + 2 * 5) / 231
      average_quality_of_manually_reviewed_genotypes: 331 / 231,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(160, 50, 15, 4, 2),
    },
    {
      id: 'ATN1',
      gene: {
        ensembl_id: 'ENSG00000111676',
        symbol: 'ATN1',
        region: 'Made-up region',
      },
      reference_repeat_unit: 'CAG',
      associated_diseases: [
        {
          name: 'Dentatorubral-pallidoluysian atrophy',
          symbol: 'DRPLA',
          omim_id: '125370',
          inheritance_mode: 'Autosomal dominant',
        },
      ],
      main_reference_region: {
        chrom: '4',
        start: 456,
        stop: 567,
      },
      average_quality_of_manually_reviewed_genotypes: 5,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(0, 0, 0, 0, 1),
    },
    {
      id: 'ATXN1',
      gene: {
        ensembl_id: 'ENSG00000124788',
        symbol: 'ATXN1',
        region: 'Ersatz region',
      },
      reference_repeat_unit: 'TGC',
      associated_diseases: [
        {
          name: 'Spinocerebellar ataxia 1',
          symbol: 'SCA1',
          omim_id: '164400',
          inheritance_mode: 'Autosomal miscellaneous',
        },
      ],
      main_reference_region: {
        chrom: '5',
        start: 567,
        stop: 678,
      },
      average_quality_of_manually_reviewed_genotypes: null,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(0, 0, 0, 0, 0),
    },
    {
      id: 'ATXN2',
      gene: {
        ensembl_id: 'ENSG00000204842',
        symbol: 'ATXN2',
        region: 'Fake region',
      },
      reference_repeat_unit: 'GCT',
      associated_diseases: [
        {
          name: 'Spinocerebellar ataxia 2',
          symbol: 'SCA2',
          omim_id: '183090',
          inheritance_mode: 'Autosomal dominant',
        },
        {
          name: 'Made-up disease 1',
          symbol: 'SCA2',
          omim_id: '183090',
          inheritance_mode: 'Autosomal recessive',
        },
      ],
      main_reference_region: {
        chrom: '6',
        start: 678,
        stop: 789,
      },
      average_quality_of_manually_reviewed_genotypes: 4.25,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(0, 0, 1, 1, 2),
    },
    {
      id: 'ATXN10',
      gene: {
        ensembl_id: 'ENSG00000130638',
        symbol: 'ATXN10',
        region: 'intron',
      },
      reference_repeat_unit: 'ATTCT',
      associated_diseases: [
        {
          name: 'Spinocerebellar ataxia 10',
          symbol: 'SCA10',
          omim_id: '603516',
          inheritance_mode: 'Autosomal recessive',
        },
      ],
      main_reference_region: {
        chrom: '7',
        start: 789,
        stop: 1012,
      },
      average_quality_of_manually_reviewed_genotypes: 3,
      manually_reviewed_genotype_counts_by_quality: genotypeCountsFromLowToHigh(10, 20, 24, 20, 10),
    },
  ],
}

describe('ShortTandemRepeatsPage', () => {
  beforeEach(() =>
    setMockApiResponses({
      ShortTandemRepeats: () => strApiResponse,
    })
  )

  test('has no unexpected changes', () => {
    const tree = render(
      <MemoryRouter>
        <ShortTandemRepeatsPage datasetId="gnomad_r4" />
      </MemoryRouter>
    )
    expect(tree).toMatchSnapshot()
  })

  test('shows a genotype quality square only for loci with manually reviewed genotypes', () => {
    render(
      <MemoryRouter>
        <ShortTandemRepeatsPage datasetId="gnomad_r4" />
      </MemoryRouter>
    )

    const squareLabelsById = Object.fromEntries(
      screen.queryAllByRole('row').flatMap((row) => {
        const id = row.querySelector('th[scope="row"]')?.textContent
        const square = row.querySelector('[role="img"]')
        return id ? [[id, square?.getAttribute('aria-label') ?? null]] : []
      })
    )
    const hoverText = (averageQuality: string, counts: string, reviewedGenotypes: string) =>
      `Average genotype quality is ${averageQuality} at this locus (${counts}). This is based on manual review of read visualizations from ${reviewedGenotypes} relative to the overall allele size distribution at this locus. On the locus page, select 'Color by: "GQ: manual review"' to see this in more detail.`
    const atxn2HoverText = hoverText(
      '4.25',
      '2 = High, 1 = Medium-high, 1 = Medium',
      '4 genotypes that are the largest outliers'
    )
    expect(squareLabelsById).toEqual({
      AFF2: hoverText(
        '1.43',
        '2 = High, 4 = Medium-high, 15 = Medium, 50 = Medium-low, 160 = Low',
        '231 genotypes that are the largest outliers'
      ),
      AR: hoverText(
        '4.82',
        '23 = High, 5 = Medium-high',
        '28 genotypes that are the largest outliers'
      ),
      ARX_1: hoverText(
        '2.50',
        '10 = High, 5 = Medium-high, 20 = Medium, 10 = Medium-low, 25 = Low',
        '70 genotypes that are the largest outliers'
      ),
      ATN1: hoverText('5.00', '1 = High', '1 genotype that is the largest outlier'),
      ATXN1: null,
      ATXN10: hoverText(
        '3.00',
        '10 = High, 20 = Medium-high, 24 = Medium, 20 = Medium-low, 10 = Low',
        '84 genotypes that are the largest outliers'
      ),
      ATXN2: atxn2HoverText,
    })
    expect(screen.getByRole('img', { name: atxn2HoverText }).style.backgroundColor).toEqual(
      'rgb(169, 217, 124)'
    )
  })

  describe('sorting', () => {
    test('sorts by ID', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <ShortTandemRepeatsPage datasetId="gnomad_r4" />
        </MemoryRouter>
      )

      const ascendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(ascendingIds).toEqual(['AFF2', 'AR', 'ARX_1', 'ATN1', 'ATXN1', 'ATXN10', 'ATXN2'])

      const idButton = screen.getByText('ID')
      await user.click(idButton)
      const descendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(descendingIds).toEqual(['ATXN2', 'ATXN10', 'ATXN1', 'ATN1', 'ARX_1', 'AR', 'AFF2'])
    })

    test('sorts by reference repeat unit', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <ShortTandemRepeatsPage datasetId="gnomad_r4" />
        </MemoryRouter>
      )

      const referenceRepeatUnitButton = screen.getByText('Repeat unit')

      await user.click(referenceRepeatUnitButton)
      const ascendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(ascendingIds).toEqual([
        'ATN1', // CAG
        'AR', // GCA
        'AFF2', // GCC
        'ATXN2', // GCT
        'ARX_1', // NGC
        'ATXN1', // TGC
        'ATXN10', // ATTCT
      ])

      await user.click(referenceRepeatUnitButton)
      const descendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(descendingIds).toEqual([
        'ATXN10', // ATTCT
        'ATXN1', // TGC
        'ARX_1', // NGC
        'ATXN2', // GCT
        'AFF2', // GCC
        'AR', // GCA
        'ATN1', // CAG
      ])
    })

    test('sorts by region', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <ShortTandemRepeatsPage datasetId="gnomad_r4" />
        </MemoryRouter>
      )

      const regionButton = screen.getByText('Gene region')

      await user.click(regionButton)
      const ascendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(ascendingIds).toEqual([
        'AFF2', // 5'-UTR
        'ARX_1', // coding: polyanine
        'AR', // coding: polyglutamine
        'ATXN1', // Ersatz region
        'ATXN2', // Fake region
        'ATXN10', // intron
        'ATN1', // Made-up region
      ])

      await user.click(regionButton)
      const descendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(descendingIds).toEqual([
        'ATN1', // Made-up region
        'ATXN10', // intron
        'ATXN2', // Fake region
        'ATXN1', // Ersatz region
        'AR', // coding: polyglutamine
        'ARX_1', // coding: polyanine
        'AFF2', // 5'-UTR
      ])
    })

    test('sorts by disease inheritance mode', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <ShortTandemRepeatsPage datasetId="gnomad_r4" />
        </MemoryRouter>
      )

      const inheritanceModeButton = screen.getByText('Inheritance')

      await user.click(inheritanceModeButton)
      const ascendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(ascendingIds).toEqual([
        'ATN1', // Autosomal dominant
        'ATXN2', // Autosomal dominant, Autosomal recessive
        'ATXN10', // Autosomal recessive
        'ATXN1', // Autosomal miscellaneous
        'AFF2', // Imaginary inheritance mode
        'AR', // X-linked recessive
        'ARX_1', // X-linked recessive, Z-linked recessive
      ])

      await user.click(inheritanceModeButton)
      const descendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(descendingIds).toEqual([
        'ARX_1', // X-linked recessive, Z-linked recessive
        'AR', // X-linked recessive
        'AFF2', // Imaginary inheritance mode
        'ATXN1', // Autosomal miscellaneous
        'ATXN10', // Autosomal recessive
        'ATXN2', // Autosomal dominant, Autosomal recessive
        'ATN1', // Autosomal dominant
      ])
    })

    test('sorts by associated disease name', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <ShortTandemRepeatsPage datasetId="gnomad_r4" />
        </MemoryRouter>
      )

      const diseaseNameButton = screen.getByText('Associated disease(s)')

      await user.click(diseaseNameButton)
      const ascendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(ascendingIds).toEqual([
        'ARX_1', // Developmental and epileptic encephalopathy-1, X-linked mental retardation with or without seizures
        'ATN1', // Dentatorubral-pallidoluysian atrophy
        'AFF2', // FRAXE mental retardation
        'AR', // Spinal and bulbar muscular atrophy
        'ATXN1', // Spinocerebellar ataxia 1
        'ATXN10', // Spinocerebellar ataxia 10
        'ATXN2', // Made-up disease 1, Spinocerebellar ataxia 2
      ])

      await user.click(diseaseNameButton)
      const descendingIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(descendingIds).toEqual([
        'ATXN2', // Made-up disease 1, Spinocerebellar ataxia 2
        'ATXN10', // Spinocerebellar ataxia 10
        'ATXN1', // Spinocerebellar ataxia 1
        'AR', // Spinal and bulbar muscular atrophy
        'AFF2', // FRAXE mental retardation
        'ATN1', // Dentatorubral-pallidoluysian atrophy
        'ARX_1', // Developmental and epileptic encephalopathy-1, X-linked mental retardation with or without seizures
      ])
    })

    test('sorts by average genotype quality, treating unreviewed loci as the lowest', async () => {
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <ShortTandemRepeatsPage datasetId="gnomad_r4" />
        </MemoryRouter>
      )

      const genotypeQualityButton = screen.getByText('GQ')

      await user.click(genotypeQualityButton)
      const highestFirstIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(highestFirstIds).toEqual([
        'ATN1', // 5
        'AR', // 4.82
        'ATXN2', // 4.25
        'ATXN10', // 3
        'ARX_1', // 2.50
        'AFF2', // 1.43
        'ATXN1', // not reviewed
      ])

      await user.click(genotypeQualityButton)
      const lowestFirstIds = screen.queryAllByRole('rowheader').map((cell) => cell.textContent)
      expect(lowestFirstIds).toEqual([
        'ATXN1', // not reviewed
        'AFF2', // 1.43
        'ARX_1', // 2.50
        'ATXN10', // 3
        'ATXN2', // 4.25
        'AR', // 4.82
        'ATN1', // 5
      ])
    })
  })
})
