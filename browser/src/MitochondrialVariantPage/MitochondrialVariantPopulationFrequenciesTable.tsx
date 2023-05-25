import React, { useCallback, useState } from 'react'
import styled from 'styled-components'

import { BaseTable, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import { MitochondrialVariant } from './MitochondrialVariantPage'

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

type SortKey = 'id' | 'an' | 'af_het' | 'af_hom' | 'ac_het' | 'ac_hom'

const useSort = (
  defaultSortKey: SortKey
): [{ key: SortKey; ascending: boolean }, (key: SortKey) => void] => {
  const [key, setKey] = useState<SortKey>(defaultSortKey)
  const [ascending, setAscending] = useState<boolean>(false)

  const setSortKey = useCallback(
    (newKey: SortKey) => {
      setKey(newKey)
      setAscending(newKey === key ? !ascending : false)
    },
    [key, ascending]
  )

  return [{ key, ascending }, setSortKey]
}

type MitochondrialVariantPopulationFrequenciesTableProps = {
  variant: MitochondrialVariant
}

const MitochondrialVariantPopulationFrequenciesTable = ({
  variant,
}: MitochondrialVariantPopulationFrequenciesTableProps) => {
  const [{ key: sortBy, ascending: sortAscending }, setSortBy] = useSort('af_hom')

  const renderColumnHeader = (key: any, label: any, tooltip: any) => {
    let ariaSortAttr: React.AriaAttributes['aria-sort'] = 'none'
    if (sortBy === key) {
      ariaSortAttr = sortAscending ? 'ascending' : 'descending'
    }

    return tooltip ? (
      <th aria-sort={ariaSortAttr} scope="col">
        {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message */}
        <TooltipAnchor tooltip={tooltip}>
          <button type="button" onClick={() => setSortBy(key)}>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <TooltipHint>{label}</TooltipHint>
          </button>
        </TooltipAnchor>
      </th>
    ) : (
      <th aria-sort={ariaSortAttr} scope="col">
        <button type="button" onClick={() => setSortBy(key)}>
          {label}
        </button>
      </th>
    )
  }

  const renderedPopulations = variant.populations
    .map((population) => ({
      ...population,
      af_hom: population.an !== 0 ? population.ac_hom / population.an : 0,
      af_het: population.an !== 0 ? population.ac_het / population.an : 0,
    }))
    .sort((a, b) => {
      const [population1, population2] = sortAscending ? [a, b] : [b, a]

      return sortBy === 'id'
        ? population1.id.localeCompare(population2.id)
        : population1[sortBy] - population2[sortBy]
    })

  const totalAlleleNumber = renderedPopulations
    .map((population) => population.an)
    .reduce((acc, n) => acc + n, 0)

  const totalHomoplasmicAlleleCount = renderedPopulations
    .map((population) => population.ac_hom)
    .reduce((acc, n) => acc + n, 0)
  const totalHomoplasmicAlleleFrequency =
    totalAlleleNumber !== 0 ? totalHomoplasmicAlleleCount / totalAlleleNumber : 0

  const totalHeteroplasmicAlleleCount = renderedPopulations
    .map((population) => population.ac_het)
    .reduce((acc, n) => acc + n, 0)
  const totalHeteroplasmicAlleleFrequency =
    totalAlleleNumber !== 0 ? totalHeteroplasmicAlleleCount / totalAlleleNumber : 0

  return (
    <Table>
      <thead>
        <tr>
          {renderColumnHeader('id', 'Population', null)}
          {renderColumnHeader(
            'an',
            'Allele Number',
            'Total number of individuals in this population with high quality sequence at this position.'
          )}
          {renderColumnHeader(
            'ac_hom',
            'Homoplasmic AC',
            'Number of individuals in this population with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).'
          )}
          {renderColumnHeader(
            'af_hom',
            'Homoplasmic AF',
            'Proportion of individuals in this population with homoplasmic or near-homoplasmic variant (heteroplasmy level ≥ 0.95).'
          )}
          {renderColumnHeader(
            'ac_het',
            'Heteroplasmic AC',
            'Number of individuals in this population with a variant at heteroplasmy level 0.10 - 0.95.'
          )}
          {renderColumnHeader(
            'af_het',
            'Heteroplasmic AF',
            'Proportion of individuals in this population with a variant at heteroplasmy level 0.10 - 0.95.'
          )}
        </tr>
      </thead>
      <tbody>
        {renderedPopulations.map((population) => (
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
