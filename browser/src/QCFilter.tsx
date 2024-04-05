import React from 'react'

import { Badge } from '@gnomad/ui'

export type Filter =
  | 'AC0'
  | 'AS_VQSR'
  | 'InbreedingCoeff'
  | 'RF'
  | 'discrepant_frequencies'
  | 'not_called_in_exomes'
  | 'not_called_in_genomes'

type DisplayData = {
  name: string
  description: string
}

const FILTER_DISPLAY_MAPPING: Record<Filter, DisplayData> = {
  AC0: {
    name: 'AC0',
    description: 'Allele count is zero (i.e.e no high-confidence genotype)',
  },
  AS_VQSR: {
    name: 'AS VSQR',
    description: 'Failed allele-specific VQSR filter',
  },
  InbreedingCoeff: {
    name: 'Inbreeding Coeff',
    description: 'Has an inbreeding coefficient < -0.3',
  },
  RF: {
    name: 'RF',
    description: 'Failed random forest filters',
  },
  discrepant_frequencies: {
    name: 'Discrepant Frequencies',
    description: 'Has discrepant frequencies between genomes and exomes',
  },
  not_called_in_exomes: {
    name: 'Not in Exomes',
    description:
      'This variant was not called in the gnomAD exome callset; no samples had any exome call (no samples had reference or alternate calls).',
  },
  not_called_in_genomes: {
    name: 'Not in gemomes',
    description:
      'This variant was not called in the gnomAD genome callset; no samples had any genome call (no samples had reference or alternate calls).',
  },
}

const renderFilterDescription = (filter: Filter, data: any) => {
  let description = FILTER_DISPLAY_MAPPING[filter].description

  if (filter === 'discrepant_frequencies') {
    description = description.concat(
      `, with a ${
        data.testName === 'cochran_mantel_haenszel_test'
          ? 'Cochran Mantel Haenszel test'
          : 'Contingency Table test'
      } p-value of ${data.pValue.toExponential(2)}`
    )
  }

  return description
}

type Props = {
  filter: Filter
  data?: any
}

const QCFilter = ({ filter, data }: Props) => (
  <Badge level="warning" tooltip={renderFilterDescription(filter, data)}>
    {FILTER_DISPLAY_MAPPING[filter].name}
  </Badge>
)

export default QCFilter
