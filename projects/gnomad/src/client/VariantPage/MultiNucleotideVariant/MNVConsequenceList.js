import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import Link from '../../Link'
import MNVConsequence, { MNVConsequencePropType } from './MNVConsequence'

const List = styled.ul`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  padding-left: 0;
  list-style-type: none;
`

const ListItem = styled.li`
  margin-bottom: 2em;
`

const MNVConsequenceList = ({ variant }) => (
  <List>
    {variant.consequences.map(consequence => (
      <ListItem key={consequence.gene_id}>
        <Link to={`/gene/${consequence.gene_id}`}>{consequence.gene_name}</Link> -{' '}
        <Link to={`/gene/${consequence.gene_id}/transcript/${consequence.transcript_id}`}>
          {consequence.transcript_id}
        </Link>
        <MNVConsequence consequence={consequence} />
      </ListItem>
    ))}
  </List>
)

MNVConsequenceList.propTypes = {
  variant: PropTypes.shape({
    consequences: PropTypes.arrayOf(MNVConsequencePropType).isRequired,
  }).isRequired,
}

export default MNVConsequenceList
