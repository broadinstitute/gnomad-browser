import React from 'react'
import styled from 'styled-components'

import { BaseTable } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import { MitochondrialVariant, MitochondrialVariantPopulation } from './MitochondrialVariantPage'

import useTableSort, { ColumnSpecifier, numericCompareFunction } from '../useTableSort'

const CountCell = styled.span`
  display: inline-block;
  width: 7ch;
  margin: auto;
  text-align: right;
`

const Table = styled(BaseTable)`
  width: 100%;
  margin-bottom: 1em;

  tr.border {
    td,
    th {
      border-top: 2px solid #aaa;
    }
  }

  tfoot ${CountCell} {
    /* Adjust alignment to make up for bold text in footer */
    padding-right: 0.5ch;
  }
`

type MitochondrialVariantPopulationFrequenciesTableProps = {
  variant: MitochondrialVariant
}

type MitochondrialVariantPopulationWithFrequency = MitochondrialVariantPopulation & {
  af_hom: number
  af_het: number
}

const comparePopulationNames = (
  a: MitochondrialVariantPopulationWithFrequency,
  b: MitochondrialVariantPopulationWithFrequency
) => GNOMAD_POPULATION_NAMES[a.id].localeCompare(GNOMAD_POPULATION_NAMES[b.id])

const columnSpecifiers: ColumnSpecifier<MitochondrialVariantPopulationWithFrequency>[] = [
  {
    key: 'id',
    label: 'Genetic Ancestry Group',
    tooltip: null,
    compareValueFunction: comparePopulationNames,
  },
  {
    key: 'an',
    label: 'Allele Number',
    tooltip:
      'Total number of individuals in this population with high quality sequence at this position.',
    compareValueFunction: numericCompareFunction('an'),
  },
  {
    key: 'ac_hom',
    label: 'Homoplasmic AC',
    tooltip:
      'Number of individuals in this population with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).',
    compareValueFunction: numericCompareFunction('ac_hom'),
  },
  {
    key: 'af_hom',
    label: 'Homoplasmic AF',
    tooltip:
      'Proportion of individuals in this population with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).',
    compareValueFunction: numericCompareFunction('af_hom'),
  },
  {
    key: 'ac_het',
    label: 'Heteroplasmic AC',
    tooltip:
      'Number of individuals in this population with a variant at heteroplasmy level 0.10 - 0.95.',
    compareValueFunction: numericCompareFunction('ac_het'),
  },
  {
    key: 'af_het',
    label: 'Heteroplasmic AF',
    tooltip:
      'Proportion of individuals in this population with a variant at heteroplasmy level 0.10 - 0.95.',
    compareValueFunction: numericCompareFunction('af_het'),
  },
]

const MitochondrialVariantPopulationFrequenciesTable = ({
  variant,
}: MitochondrialVariantPopulationFrequenciesTableProps) => {
  const populationsWithFrequencies = variant.populations.map((population) => ({
    ...population,
    af_hom: population.an !== 0 ? population.ac_hom / population.an : 0,
    af_het: population.an !== 0 ? population.ac_het / population.an : 0,
  }))

  const { headers, sortedRowData } = useTableSort<MitochondrialVariantPopulationWithFrequency>(
    columnSpecifiers,
    'af_hom',
    populationsWithFrequencies
  )

  const totalAlleleNumber = sortedRowData
    .map((population) => population.an)
    .reduce((acc, n) => acc + n, 0)

  const totalHomoplasmicAlleleCount = sortedRowData
    .map((population) => population.ac_hom)
    .reduce((acc, n) => acc + n, 0)
  const totalHomoplasmicAlleleFrequency =
    totalAlleleNumber !== 0 ? totalHomoplasmicAlleleCount / totalAlleleNumber : 0

  const totalHeteroplasmicAlleleCount = sortedRowData
    .map((population) => population.ac_het)
    .reduce((acc, n) => acc + n, 0)
  const totalHeteroplasmicAlleleFrequency =
    totalAlleleNumber !== 0 ? totalHeteroplasmicAlleleCount / totalAlleleNumber : 0

  return (
    <Table>
      <thead>
        <tr>{headers}</tr>
      </thead>
      <tbody>
        {sortedRowData.map((population) => (
          <tr key={population.id}>
            <th scope="row">{GNOMAD_POPULATION_NAMES[population.id]}</th>
            <td>
              <CountCell>{population.an}</CountCell>
            </td>
            <td>
              <CountCell>{population.ac_hom}</CountCell>
            </td>
            <td>{population.af_hom.toPrecision(4)}</td>
            <td>
              <CountCell>{population.ac_het}</CountCell>
            </td>
            <td>{population.af_het.toPrecision(4)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border">
          <th scope="row">Total</th>
          <td>
            <CountCell>{totalAlleleNumber}</CountCell>
          </td>
          <td>
            <CountCell>{totalHomoplasmicAlleleCount}</CountCell>
          </td>
          <td>{totalHomoplasmicAlleleFrequency.toPrecision(4)}</td>
          <td>
            <CountCell>{totalHeteroplasmicAlleleCount}</CountCell>
          </td>
          <td>{totalHeteroplasmicAlleleFrequency.toPrecision(4)}</td>
        </tr>
      </tfoot>
    </Table>
  )
}

export default MitochondrialVariantPopulationFrequenciesTable
