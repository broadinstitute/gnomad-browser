import React from 'react'
import styled from 'styled-components'

import { PageHeading } from '@gnomad/ui'

import policiesContent from '../about/policies.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'

const PoliciesPage = styled(InfoPage)`
  h2:not(:first-child) {
    padding-top: 1.5rem;
  }
`

export default () => (
  <PoliciesPage>
    <DocumentTitle title="Policies" />
    <PageHeading>Policies</PageHeading>

    <MarkdownContent dangerouslySetInnerHTML={{ __html: policiesContent.html }} />
  </PoliciesPage>
)
