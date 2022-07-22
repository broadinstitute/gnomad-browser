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

type Props = {
  variant: {
    exome?: {
      ac: number
      ac_hom: number
      n_individuals: number
    }
    genome?: {
      ac: number
      ac_hom: number
      n_individuals: number
    }
  }
}

const MNVFrequencyTable = ({ variant }: Props) => {
  const isPresentInExome = Boolean(variant.exome)
  const isPresentInGenome = Boolean(variant.genome)

  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const exomeIndividuals = isPresentInExome ? variant.exome.n_individuals : 0
  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const genomeIndividuals = isPresentInGenome ? variant.genome.n_individuals : 0
  const totalIndividuals = exomeIndividuals + genomeIndividuals

  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const exomeAC = isPresentInExome ? variant.exome.ac : 0
  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const genomeAC = isPresentInGenome ? variant.genome.ac : 0
  const totalAC = exomeAC + genomeAC

  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  const exomeACHom = isPresentInExome ? variant.exome.ac_hom : 0
  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
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

export default MNVFrequencyTable
