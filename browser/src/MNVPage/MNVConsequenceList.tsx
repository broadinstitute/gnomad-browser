import React from 'react'
import styled from 'styled-components'

import Link from '../Link'
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

type Props = {
  variant: {
    consequences: MNVConsequencePropType[]
  }
}

const MNVConsequenceList = ({ variant }: Props) => (
  <List>
    {variant.consequences.map((consequence) => (
      <ListItem key={(consequence as any).gene_id}>
        <Link to={`/gene/${(consequence as any).gene_id}`}>{(consequence as any).gene_name}</Link> -
        <Link to={`/transcript/${(consequence as any).transcript_id}`}>
          {(consequence as any).transcript_id}
        </Link>
        <MNVConsequence consequence={consequence} />
      </ListItem>
    ))}
  </List>
)

export default MNVConsequenceList
