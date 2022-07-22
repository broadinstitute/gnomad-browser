import React, { useCallback, useState } from 'react'
import styled from 'styled-components'

import { BaseTable, TooltipAnchor, TooltipHint } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import MitochondrialVariantDetailPropType from './MitochondrialVariantDetailPropType'

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

const useSort = (defaultSortKey: any) => {
  const [key, setKey] = useState(defaultSortKey)
  const [ascending, setAscending] = useState(false)

  const setSortKey = useCallback(
    // @ts-expect-error TS(7006) FIXME: Parameter 'newKey' implicitly has an 'any' type.
    (newKey) => {
      setKey(newKey)
      setAscending(newKey === key ? !ascending : false)
    },
    [key, ascending]
  )

  return [{ key, ascending }, setSortKey]
}

type MitochondrialVariantPopulationFrequenciesTableProps = {
  variant: MitochondrialVariantDetailPropType
}

const MitochondrialVariantPopulationFrequenciesTable = ({
  variant,
}: MitochondrialVariantPopulationFrequenciesTableProps) => {
  // @ts-expect-error TS(2339) FIXME: Property 'key' does not exist on type '((newKey: a... Remove this comment to see the full error message
  const [{ key: sortBy, ascending: sortAscending }, setSortBy] = useSort('af_hom')

  const renderColumnHeader = (key: any, label: any, tooltip: any) => {
    let ariaSortAttr = 'none'
    if (sortBy === key) {
      ariaSortAttr = sortAscending ? 'ascending' : 'descending'
    }

    return tooltip ? (
      // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; "aria-sort": string; sc... Remove this comment to see the full error message
      <th aria-sort={ariaSortAttr} scope="col">
        {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message */}
        <TooltipAnchor tooltip={tooltip}>
          {/* @ts-expect-error TS(2349) FIXME: This expression is not callable. */}
          <button type="button" onClick={() => setSortBy(key)}>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <TooltipHint>{label}</TooltipHint>
          </button>
        </TooltipAnchor>
      </th>
    ) : (
      // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; "aria-sort": string; sc... Remove this comment to see the full error message
      <th aria-sort={ariaSortAttr} scope="col">
        {/* @ts-expect-error TS(2349) FIXME: This expression is not callable. */}
        <button type="button" onClick={() => setSortBy(key)}>
          {label}
        </button>
      </th>
    )
  }

  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
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
        : // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          population1[sortBy] - population2[sortBy]
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
            {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
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
