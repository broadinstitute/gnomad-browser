import React from 'react'
import styled from 'styled-components'

import { BaseTable, TextButton } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import CooccurrenceDataPropType from './CooccurrenceDataPropType'

const getCooccurrencePattern = (cooccurrenceData: any) => {
  if (cooccurrenceData.p_compound_heterozygous === null) {
    return (
      <>
        No prediction<sup>*</sup>
      </>
    )
  }
  if (cooccurrenceData.p_compound_heterozygous > 0.505) {
    return 'Different haplotypes'
  }
  if (cooccurrenceData.p_compound_heterozygous < 0.164) {
    return 'Same haplotype'
  }
  return 'Uncertain'
}

const Table = styled(BaseTable)`
  td,
  th {
    padding-left: 2em;
  }

  th:first-child,
  td:first-child {
    padding-right: 2em;
    padding-left: 1ch;
    white-space: nowrap;

    button {
      text-align: left;
    }
  }

  td:nth-child(2),
  td:nth-child(3),
  td:nth-child(4) {
    padding-right: 4em;
    text-align: right;
  }
`

type VariantCooccurrenceSummaryTableProps = {
  cooccurrenceData: CooccurrenceDataPropType
  selectedPopulation: string
  onSelectPopulation: (...args: any[]) => any
}

const VariantCooccurrenceSummaryTable = ({
  cooccurrenceData,
  selectedPopulation,
  onSelectPopulation,
}: VariantCooccurrenceSummaryTableProps) => {
  return (
    <Table>
      <thead>
        <tr>
          <th scope="col">Population</th>
          <th scope="col">
            Samples consistent with variants appearing in isolation or on different haplotypes
          </th>
          <th scope="col">Samples consistent with variants appearing on the same haplotype</th>
          <th scope="col">Samples consistent with either co-occurrence pattern</th>
          <th scope="col">Likely co&#x2011;occurrence pattern</th>
        </tr>
      </thead>
      <tbody>
        {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
        {cooccurrenceData.populations.map((pop) => (
          <tr
            key={pop.id}
            style={pop.id === selectedPopulation ? { background: '#eee' } : undefined}
          >
            <th scope="row">
              <TextButton
                onClick={() => {
                  onSelectPopulation(pop.id)
                }}
              >
                {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
                {GNOMAD_POPULATION_NAMES[pop.id]}
              </TextButton>
            </th>
            <td>
              {(
                pop.genotype_counts[1] +
                pop.genotype_counts[2] +
                pop.genotype_counts[3] +
                pop.genotype_counts[6]
              ).toLocaleString()}
            </td>
            <td>
              {(
                pop.genotype_counts[5] +
                pop.genotype_counts[7] +
                pop.genotype_counts[8]
              ).toLocaleString()}
            </td>
            <td>{pop.genotype_counts[4].toLocaleString()}</td>
            <td>{getCooccurrencePattern(pop)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={selectedPopulation === 'All' ? { background: '#eee' } : undefined}>
          <th scope="row" style={{ borderTop: '2px solid #aaa' }}>
            <TextButton
              onClick={() => {
                onSelectPopulation('All')
              }}
              style={{ fontWeight: 'bold' }}
            >
              All
            </TextButton>
          </th>
          <td style={{ borderTop: '2px solid #aaa' }}>
            {(
              cooccurrenceData.genotype_counts[1] +
              cooccurrenceData.genotype_counts[2] +
              cooccurrenceData.genotype_counts[3] +
              cooccurrenceData.genotype_counts[6]
            ).toLocaleString()}
          </td>
          <td style={{ borderTop: '2px solid #aaa' }}>
            {(
              cooccurrenceData.genotype_counts[5] +
              cooccurrenceData.genotype_counts[7] +
              cooccurrenceData.genotype_counts[8]
            ).toLocaleString()}
          </td>
          <td style={{ borderTop: '2px solid #aaa' }}>
            {cooccurrenceData.genotype_counts[4].toLocaleString()}
          </td>
          <td style={{ borderTop: '2px solid #aaa' }}>
            {getCooccurrencePattern(cooccurrenceData)}
          </td>
        </tr>
      </tfoot>
    </Table>
  )
}

export default VariantCooccurrenceSummaryTable
