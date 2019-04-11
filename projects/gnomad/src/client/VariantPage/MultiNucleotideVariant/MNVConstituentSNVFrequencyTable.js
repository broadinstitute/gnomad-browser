import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Badge } from '@broad/ui'

import Link from '../../Link'
import QCFilter from '../../QCFilter'

const Table = styled.table`
  th {
    font-weight: bold;
  }

  th[scope='col'],
  th[scope='colgroup'] {
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

const renderVariantFlag = (variant, exomeOrGenome) => {
  if (!variant[exomeOrGenome]) {
    return <Badge level="error">No variant</Badge>
  }
  const { filters } = variant[exomeOrGenome]
  if (filters.length === 0) {
    return <Badge level="success">Pass</Badge>
  }
  return filters.map(filter => <QCFilter key={filter} filter={filter} />)
}

const MNVConstituentSNVFrequencyTable = ({ snvs }) => {
  const renderedSNVFrequencies = snvs.map(snv => {
    const exomeAC = (snv.exome || {}).ac || 0
    const exomeAN = (snv.exome || {}).an || 0
    const exomeAF = exomeAN === 0 ? 0 : exomeAC / exomeAN

    const genomeAC = (snv.genome || {}).ac || 0
    const genomeAN = (snv.genome || {}).an || 0
    const genomeAF = genomeAN === 0 ? 0 : genomeAC / genomeAN

    const totalAC = exomeAC + genomeAC
    const totalAN = exomeAN + genomeAN
    const totalAF = totalAN === 0 ? 0 : totalAC / totalAN

    return {
      variant_id: snv.variant_id,
      exome: snv.exome
        ? {
            ac: exomeAC,
            an: exomeAN,
            af: exomeAF,
          }
        : null,
      genome: snv.genome
        ? {
            ac: genomeAC,
            an: genomeAN,
            af: genomeAF,
          }
        : null,
      total: {
        ac: totalAC,
        an: totalAN,
        af: totalAF,
      },
    }
  })

  return (
    <Table style={{ width: '100%' }}>
      <colgroup>
        <col />
        {snvs.map(snv => (
          <col key={snv.variant_id} span="3" />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th />
          {snvs.map(snv => (
            <th key={snv.variant_id} colSpan="3" scope="colgroup">
              <Link to={`/variant/${snv.variant_id}`}>{snv.variant_id}</Link>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td />
          {snvs.map(snv => (
            <React.Fragment key={snv.variant_id}>
              <th scope="col">Exomes</th>
              <th scope="col">Genomes</th>
              <th scope="col">Total</th>
            </React.Fragment>
          ))}
        </tr>
        <tr>
          <th scope="row">Filter</th>
          {snvs.map(snv => (
            <React.Fragment key={snv.variant_id}>
              <td>{renderVariantFlag(snv, 'exome')}</td>
              <td>{renderVariantFlag(snv, 'genome')}</td>
              <td />
            </React.Fragment>
          ))}
          <td />
        </tr>
        <tr>
          <th scope="row">Allele Count</th>
          {renderedSNVFrequencies.map(snv => (
            <React.Fragment key={snv.variant_id}>
              <td>{snv.exome && snv.exome.ac}</td>
              <td>{snv.genome && snv.genome.ac}</td>
              <td>{snv.total.ac}</td>
            </React.Fragment>
          ))}
        </tr>
        <tr>
          <th scope="row">Allele Number</th>
          {renderedSNVFrequencies.map(snv => (
            <React.Fragment key={snv.variant_id}>
              <td>{snv.exome && snv.exome.an}</td>
              <td>{snv.genome && snv.genome.an}</td>
              <td>{snv.total.an}</td>
            </React.Fragment>
          ))}
        </tr>
        <tr>
          <th scope="row">Allele Frequency</th>
          {renderedSNVFrequencies.map(snv => (
            <React.Fragment key={snv.variant_id}>
              <td>{snv.exome && snv.exome.af.toPrecision(4)}</td>
              <td>{snv.genome && snv.genome.af.toPrecision(4)}</td>
              <td>{snv.total.af.toPrecision(4)}</td>
            </React.Fragment>
          ))}
        </tr>
      </tbody>
    </Table>
  )
}

MNVConstituentSNVFrequencyTable.propTypes = {
  snvs: PropTypes.arrayOf(
    PropTypes.shape({
      variant_id: PropTypes.string.isRequired,
      exome: PropTypes.shape({
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        filters: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
      genome: PropTypes.shape({
        ac: PropTypes.number.isRequired,
        an: PropTypes.number.isRequired,
        filters: PropTypes.arrayOf(PropTypes.string).isRequired,
      }),
    })
  ).isRequired,
}

export default MNVConstituentSNVFrequencyTable
