import React, { PureComponent } from 'react'
import styled from 'styled-components'
import fetch from 'isomorphic-fetch'
import GraphiQL from 'graphiql'

const Wrapper = styled.div`

`

function graphQLFetcher(graphQLParams) {
  return fetch(window.location.origin + '/graphql', {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graphQLParams),
  }).then(response => response.json())
}

export default () => (
  <Wrapper>
    <GraphiQL fetcher={graphQLFetcher} />
  </Wrapper>
)
