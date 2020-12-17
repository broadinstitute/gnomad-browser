import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

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

const MNVFrequencyTable = ({ variant }) => {
  const isPresentInExome = Boolean(variant.exome)
  const isPresentInGenome = Boolean(variant.genome)

  const exomeIndividuals = isPresentInExome ? variant.exome.n_individuals : 0
  const genomeIndividuals = isPresentInGenome ? variant.genome.n_individuals : 0
  const totalIndividuals = exomeIndividuals + genomeIndividuals

  const exomeAC = isPresentInExome ? variant.exome.ac : 0
  const genomeAC = isPresentInGenome ? variant.genome.ac : 0
  const totalAC = exomeAC + genomeAC

  const exomeACHom = isPresentInExome ? variant.exome.ac_hom : 0
  const genomeACHom = isPresentInGenome ? variant.genome.ac_hom : 0
  const totalACHom = exomeACHom + genomeACHom

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
          <th scope="row">Number of Individuals</th>
          <td>{isPresentInExome && exomeIndividuals}</td>
          <td>{isPresentInGenome && genomeIndividuals}</td>
          <td>{totalIndividuals}</td>
        </tr>
        <tr>
          <th scope="row">Allele Count</th>
          <td>{isPresentInExome && exomeAC}</td>
          <td>{isPresentInGenome && genomeAC}</td>
          <td>{totalAC}</td>
        </tr>
        <tr>
          <th scope="row">Number of Homozygotes</th>
          <td>{isPresentInExome && exomeACHom}</td>
          <td>{isPresentInGenome && genomeACHom}</td>
          <td>{totalACHom}</td>
        </tr>
      </tbody>
    </Table>
  )
}

MNVFrequencyTable.propTypes = {
  variant: PropTypes.shape({
    exome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      ac_hom: PropTypes.number.isRequired,
      n_individuals: PropTypes.number.isRequired,
    }),
    genome: PropTypes.shape({
      ac: PropTypes.number.isRequired,
      ac_hom: PropTypes.number.isRequired,
      n_individuals: PropTypes.number.isRequired,
    }),
  }).isRequired,
}

export default MNVFrequencyTable
