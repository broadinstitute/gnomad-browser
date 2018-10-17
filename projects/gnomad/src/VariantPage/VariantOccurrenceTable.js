import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { QuestionMark } from '@broad/help'
import { Badge } from '@broad/ui'

import QCFilter from '../QCFilter'

const Table = styled.table`
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

const renderGnomadVariantFlag = (variant, exomeOrGenome) => {
  if (!variant[exomeOrGenome]) {
    return <Badge level="error">No variant</Badge>
  }
  const filters = variant[exomeOrGenome].filters
  if (filters.length === 0) {
    return <Badge level="success">Pass</Badge>
  }
  return filters.map(filter => <QCFilter key={filter} filter={filter} />)
}

export const GnomadVariantOccurrenceTable = ({ variant }) => {
  const isPresentInExome = Boolean(variant.exome)
  const isPresentInGenome = Boolean(variant.genome)

  const exomeAlleleCount = isPresentInExome ? variant.exome.ac : 0
  const exomeAlleleNumber = isPresentInExome ? variant.exome.an : 0
  const genomeAlleleCount = isPresentInGenome ? variant.genome.ac : 0
  const genomeAlleleNumber = isPresentInGenome ? variant.genome.an : 0

  const exomeAlleleFrequency = exomeAlleleCount / exomeAlleleNumber
  const genomeAlleleFrequency = genomeAlleleCount / genomeAlleleNumber

  const totalAlleleCount = exomeAlleleCount + genomeAlleleCount
  const totalAlleleNumber = exomeAlleleNumber + genomeAlleleNumber
  const totalAlleleFrequency = totalAlleleCount / totalAlleleNumber

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
            Filtering AF <QuestionMark display="inline" topic="faf" />
            <br />
            (95% confidence)
          </th>
          <td>{isPresentInExome && variant.exome.faf95 && variant.exome.faf95.toPrecision(4)}</td>
          <td>{isPresentInGenome && variant.genome.faf95 && variant.exome.faf95.toPrecision(4)}</td>
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
      faf95: PropTypes.number,
    }),
    genome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      an: PropTypes.number.isRequired,
      faf95: PropTypes.number,
    }),
  }).isRequired,
}
