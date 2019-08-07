import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { Badge, TooltipAnchor } from '@broad/ui'

import QCFilter from '../QCFilter'

const Table = styled.table`
  /* To vertically align with the right column's heading */
  margin-top: 1.25em;

  th {
    font-weight: bold;
  }

  th[scope='col'] {
    padding-left: 30px;
    text-align: left;
  }

  th[scope='row'] {
    text-align: right;
  }

  td {
    padding-left: 30px;
    line-height: 1.5;
  }
`

const NoWrap = styled.span`
  white-space: nowrap;
`

const renderGnomadVariantFlag = (variant, exomeOrGenome) => {
  if (!variant[exomeOrGenome]) {
    return <Badge level="error">No variant</Badge>
  }
  const { filters } = variant[exomeOrGenome]
  if (filters.length === 0) {
    return <Badge level="success">Pass</Badge>
  }
  return filters.map(filter => <QCFilter key={filter} filter={filter} />)
}

const POPULATION_NAMES = {
  AFR: 'African',
  AMR: 'Latino',
  ASJ: 'Ashkenazi Jewish',
  EAS: 'East Asian',
  FIN: 'European (Finnish)',
  NFE: 'European (non-Finnish)',
  OTH: 'Other',
  SAS: 'South Asian',
}

const FilteringAlleleFrequencyValue = styled.span`
  border-bottom: 1px dashed #000;

  @media print {
    border-bottom: none;
  }
`

const FilteringAlleleFrequencyPopulation = styled.div`
  display: none;
  white-space: nowrap;

  @media print {
    display: block;
  }
`

const FilteringAlleleFrequency = ({ popmax, popmax_population: popmaxPopulation }) => {
  if (popmax === null) {
    return <span>—</span>
  }

  if (popmax === 0) {
    return <span>0</span>
  }

  return (
    <span>
      <TooltipAnchor tooltip={POPULATION_NAMES[popmaxPopulation]}>
        <FilteringAlleleFrequencyValue>{popmax.toPrecision(4)}</FilteringAlleleFrequencyValue>
      </TooltipAnchor>
      <FilteringAlleleFrequencyPopulation>
        {POPULATION_NAMES[popmaxPopulation]}
      </FilteringAlleleFrequencyPopulation>
    </span>
  )
}

FilteringAlleleFrequency.propTypes = {
  popmax: PropTypes.number,
  popmax_population: PropTypes.string,
}

FilteringAlleleFrequency.defaultProps = {
  popmax: null,
  popmax_population: null,
}

export const GnomadVariantOccurrenceTable = ({ variant }) => {
  const isPresentInExome = Boolean(variant.exome)
  const isPresentInGenome = Boolean(variant.genome)

  const exomeAlleleCount = isPresentInExome ? variant.exome.ac : 0
  const exomeAlleleNumber = isPresentInExome ? variant.exome.an : 0
  const genomeAlleleCount = isPresentInGenome ? variant.genome.ac : 0
  const genomeAlleleNumber = isPresentInGenome ? variant.genome.an : 0

  const exomeAlleleFrequency = exomeAlleleNumber === 0 ? 0 : exomeAlleleCount / exomeAlleleNumber
  const genomeAlleleFrequency =
    genomeAlleleNumber === 0 ? 0 : genomeAlleleCount / genomeAlleleNumber

  const totalAlleleCount = exomeAlleleCount + genomeAlleleCount
  const totalAlleleNumber = exomeAlleleNumber + genomeAlleleNumber
  const totalAlleleFrequency = totalAlleleNumber === 0 ? 0 : totalAlleleCount / totalAlleleNumber

  return (
    <Table>
      <tbody>
        <tr>
          <td />
          <th scope="col">Exomes</th>
          <th scope="col">Genomes</th>
          <th scope="col">Total</th>
        </tr>
        <tr>
          <th scope="row">Filter</th>
          <td>{renderGnomadVariantFlag(variant, 'exome')}</td>
          <td>{renderGnomadVariantFlag(variant, 'genome')}</td>
          <td />
        </tr>
        <tr>
          <th scope="row">Allele Count</th>
          <td>{isPresentInExome && exomeAlleleCount}</td>
          <td>{isPresentInGenome && genomeAlleleCount}</td>
          <td>{totalAlleleCount}</td>
        </tr>
        <tr>
          <th scope="row">Allele Number</th>
          <td>{isPresentInExome && exomeAlleleNumber}</td>
          <td>{isPresentInGenome && genomeAlleleNumber}</td>
          <td>{totalAlleleNumber}</td>
        </tr>
        <tr>
          <th scope="row">Allele Frequency</th>
          <td>{isPresentInExome && exomeAlleleFrequency.toPrecision(4)}</td>
          <td>{isPresentInGenome && genomeAlleleFrequency.toPrecision(4)}</td>
          <td>{totalAlleleFrequency.toPrecision(4)}</td>
        </tr>
        <tr>
          <th scope="row">
            <NoWrap>
              Popmax Filtering AF <QuestionMark topic="faf" />
            </NoWrap>
            <br />
            (95% confidence)
          </th>
          <td>{isPresentInExome && <FilteringAlleleFrequency {...variant.exome.faf95} />}</td>
          <td>{isPresentInGenome && <FilteringAlleleFrequency {...variant.genome.faf95} />}</td>
          <td />
        </tr>
      </tbody>
    </Table>
  )
}

GnomadVariantOccurrenceTable.propTypes = {
  variant: PropTypes.shape({
    exome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      faf95: PropTypes.shape({
        popmax: PropTypes.number,
        popmax_population: PropTypes.string,
      }).isRequired,
    }),
    genome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      faf95: PropTypes.shape({
        popmax: PropTypes.number,
        popmax_population: PropTypes.string,
      }).isRequired,
    }),
  }).isRequired,
}
