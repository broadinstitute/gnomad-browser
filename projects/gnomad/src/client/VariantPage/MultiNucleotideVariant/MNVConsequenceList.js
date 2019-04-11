import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import Link from '../../Link'
import MNVConsequence, { MNVConsequencePropType } from './MNVConsequence'

const List = styled.ul`
  padding-left: 0;
  list-style-type: none;

  li {
    margin-bottom: 2em;
  }
`

const MNVConsequenceList = ({ variant }) => (
  <List>
    {variant.consequences.map(consequence => (
      <li key={consequence.gene_id}>
        <Link to={`/gene/${consequence.gene_id}`}>{consequence.gene_name}</Link>
        <MNVConsequence consequence={consequence} />
      </li>
    ))}
  </List>
)

MNVConsequenceList.propTypes = {
  variant: PropTypes.shape({
    consequences: PropTypes.arrayOf(MNVConsequencePropType).isRequired,
  }).isRequired,
}

export default MNVConsequenceList
