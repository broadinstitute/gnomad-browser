import React from 'react'
import styled from 'styled-components'

import { BaseTable, TextButton } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import {
  CooccurrenceData,
  cisThreshold,
  transThreshold,
  CooccurrenceForPopulation,
  noPredictionPossible,
} from './VariantCooccurrencePage'

const getCooccurrencePattern = (cooccurrenceData: CooccurrenceForPopulation) => {
  if (noPredictionPossible(cooccurrenceData)) {
    return (
      <>
        No prediction<sup>*</sup>
      </>
    )
  }
  if (cooccurrenceData.p_compound_heterozygous! > transThreshold) {
    return 'Different haplotypes'
  }
  if (cooccurrenceData.p_compound_heterozygous! < cisThreshold) {
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
  cooccurrenceData: CooccurrenceData
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
          <th scope="col">Genetic ancestry group</th>
          <th scope="col">
            Samples consistent with variants appearing in isolation or on different haplotypes
          </th>
          <th scope="col">Samples consistent with variants appearing on the same haplotype</th>
          <th scope="col">Samples consistent with either co-occurrence pattern</th>
          <th scope="col">Likely co&#x2011;occurrence pattern</th>
        </tr>
      </thead>
      <tbody>
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
                pop.genotype_counts.ref_het +
                pop.genotype_counts.ref_hom +
                pop.genotype_counts.het_ref +
                pop.genotype_counts.hom_ref
              ).toLocaleString()}
            </td>
            <td>
              {(
                pop.genotype_counts.het_hom +
                pop.genotype_counts.hom_het +
                pop.genotype_counts.hom_hom
              ).toLocaleString()}
            </td>
            <td>{pop.genotype_counts.het_het.toLocaleString()}</td>
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
              cooccurrenceData.genotype_counts.ref_het +
              cooccurrenceData.genotype_counts.ref_hom +
              cooccurrenceData.genotype_counts.het_ref +
              cooccurrenceData.genotype_counts.hom_ref
            ).toLocaleString()}
          </td>
          <td style={{ borderTop: '2px solid #aaa' }}>
            {(
              cooccurrenceData.genotype_counts.het_hom +
              cooccurrenceData.genotype_counts.hom_het +
              cooccurrenceData.genotype_counts.hom_hom
            ).toLocaleString()}
          </td>
          <td style={{ borderTop: '2px solid #aaa' }}>
            {cooccurrenceData.genotype_counts.het_het.toLocaleString()}
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
