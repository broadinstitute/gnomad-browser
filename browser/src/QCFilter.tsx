import React from 'react'

import { Badge } from '@gnomad/ui'
import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

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
    description:
      'Allele count is zero due to removal of low quality genotypes (GQ < 20; DP < 10; and AB < 0.2 for het calls) at this site',
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
    name: 'Discrepant frequencies',
    description: 'Has discrepant frequencies between genomes and exomes',
  },
  not_called_in_exomes: {
    name: 'Not in exomes',
    description:
      'This variant was not called in the gnomAD exome callset; no exome samples had any genotype call (no reference or alternate calls)',
  },
  not_called_in_genomes: {
    name: 'Not in genomes',
    description:
      'This variant was not called in the gnomAD genome callset; no genome samples had any genotype call (no reference or alternate calls)',
  },
}

const renderFilterDescription = (filter: Filter, data: any) => {
  let description = FILTER_DISPLAY_MAPPING[filter].description

  if (filter === 'discrepant_frequencies') {
    description = description.concat(
      `, with a ${
        data.testName === 'cochran_mantel_haenszel_test'
          ? 'Cochran Mantel Haenszel test'
          : // @ts-ignore
            `Contingency Table test on ${GNOMAD_POPULATION_NAMES[data.geneticAncestry]}`
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
