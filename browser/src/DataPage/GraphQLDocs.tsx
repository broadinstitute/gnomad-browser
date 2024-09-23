import React from 'react'

import { CodeBlock, SectionTitle, StyledParagraph } from './downloadsPageStyles'

import styled from 'styled-components'

import { ExternalLink, Tabs } from '@gnomad/ui'
import exampleCommandLineQuery from './exampleCommandLineGraphQLQuery'
import examplePythonQuery from './examplePythonGraphQLQuery'
import exampleJSQuery from './exampleJSGraphQLQuery'

const GraphQLCodeBlock = styled(CodeBlock)`
  white-space: pre-wrap;

  &::before {
    content: none;
  }
`

const GraphQLDocs = () => (
  <>
    <SectionTitle id="api">gnomAD API</SectionTitle>
    <StyledParagraph>
      The gnomAD browser gets its data through a{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://graphql.org">GraphQL</ExternalLink> API which is open to the
      public. Access to the API is rate-limited to 10 requests per IP address per 60-second period.
    </StyledParagraph>
    <StyledParagraph>
      The API can be queried programatically by making an HTTP request to{' '}
      <a href="/api">https://gnomad.broadinstitute.org/api</a>. Please see the GraphQL documentation
      for details on how to{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://graphql.org/learn/queries/">
        construct a query
      </ExternalLink> and{' '}
      {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
      <ExternalLink href="https://graphql.org/learn/serving-over-http/#http-methods-headers-and-body">
        format it to send it over HTTP
      </ExternalLink>
      .
    </StyledParagraph>
    <StyledParagraph>
      You can also use the API interactively by visiting <a href="/api">the same address</a> in your
      browser, which is useful for experimenting with queries. That interface also allows you to
      explore the API schema interactively.
    </StyledParagraph>
    <StyledParagraph>
      The following is an annotated GraphQL query that can be run from the command line, with some
      small example programs for a subset of that query in Python and JavaScript. This query gets
      similar data to the CSV export of all variants for gene{' '}
      <a href="/gene/ENSG00000012048?dataset=gnomad_r4">BRCA1</a>.
    </StyledParagraph>
    {/* @ts-expect-error TS(2741) FIXME: Property 'onChange' is missing in type '{ tabs: { ... Remove this comment to see the full error message */}
    <Tabs
      tabs={[
        {
          id: 'commandLineQuery',
          label: 'Command Line',
          render: () => <GraphQLCodeBlock>{exampleCommandLineQuery}</GraphQLCodeBlock>,
        },
        {
          id: 'pythonQuery',
          label: 'Python',
          render: () => <GraphQLCodeBlock>{examplePythonQuery}</GraphQLCodeBlock>,
        },
        {
          id: 'jsQuery',
          label: 'JavaScript',
          render: () => <GraphQLCodeBlock>{exampleJSQuery}</GraphQLCodeBlock>,
        },
      ]}
    />
  </>
)

export default GraphQLDocs
