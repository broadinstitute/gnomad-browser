import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { BaseTable, TextButton } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import CooccurrenceDataPropType from './CooccurrenceDataPropType'

const getCooccurrencePattern = probabilityOfCompoundHet => {
  if (probabilityOfCompoundHet === null) {
    return 'Uncertain'
  }
  if (probabilityOfCompoundHet > 0.505) {
    return 'Different haplotypes'
  }
  if (probabilityOfCompoundHet < 0.164) {
    return 'Same haplotype'
  }
  return 'Uncertain'
}

const Table = styled(BaseTable)`
  th:first-child {
    padding-left: 1ch;

    button {
      text-align: left;
    }
  }

  td:nth-child(2) {
    padding-right: 6em;
    text-align: right;
  }

  td:nth-child(3) {
    padding-right: 6em;
    text-align: right;
  }
`

const VariantCooccurrenceSummaryTable = ({
  cooccurrenceData,
  selectedPopulation,
  onSelectPopulation,
}) => {
  return (
    <Table>
      <thead>
        <tr>
          <th scope="col">Population</th>
          <th scope="col">Samples suggesting variants appear on different haplotypes</th>
          <th scope="col">Samples suggesting variants appear on same haplotype</th>
          <th scope="col">Likely co&#x2011;occurrence pattern</th>
        </tr>
      </thead>
      <tbody>
        {cooccurrenceData.populations.map(pop => (
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
            <td>{(pop.genotype_counts[4] + pop.genotype_counts[8]).toLocaleString()}</td>
            <td>{getCooccurrencePattern(pop.p_compound_heterozygous)}</td>
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
              cooccurrenceData.genotype_counts[4] + cooccurrenceData.genotype_counts[8]
            ).toLocaleString()}
          </td>
          <td style={{ borderTop: '2px solid #aaa' }}>
            {getCooccurrencePattern(cooccurrenceData.p_compound_heterozygous)}
          </td>
        </tr>
      </tfoot>
    </Table>
  )
}

VariantCooccurrenceSummaryTable.propTypes = {
  cooccurrenceData: CooccurrenceDataPropType.isRequired,
  selectedPopulation: PropTypes.string.isRequired,
  onSelectPopulation: PropTypes.func.isRequired,
}

export default VariantCooccurrenceSummaryTable
