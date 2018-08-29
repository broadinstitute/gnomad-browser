import styled from 'styled-components'

export const List = styled.ul`
  padding-left: 20px;
  list-style-type: disc;
  margin-bottom: 1em;
`

export const ListItem = styled.li`
  margin-bottom: 0.5em;
`

export const OrderedList = List.withComponent('ol')
