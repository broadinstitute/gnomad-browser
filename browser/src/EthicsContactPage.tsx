import React from 'react'
import styled from 'styled-components'

import { PageHeading } from '@gnomad/ui'

// @ts-expect-error
import ethicsContent from '../about/policies/ethics-contact.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'

const EthicsContactPage = styled(InfoPage)`
  h2 {
    font-size: 1.5em;
    font-weight: bold;
  }

  h2:not(:first-child) {
    padding-top: 1.5rem;
  }
`
// TODO: formatting from 'MarkdownContent' breaks a-tags that link to a PDF loaded with
//   webpack, which is how the current Privacy Policy is being loaded.
//   Workaround for now to get this up for GCBR application, will review later.
const _PrivacyPolicyWrapper = styled.div`
  p {
    margin-top: 15px;
    margin-bottom: 15px;
    line-height: 1.4;
  }

  a {
    color: #428bca;
    text-decoration: none;
  }
`

export default () => (
  <EthicsContactPage>
    <DocumentTitle title="Ethics Contact" />
    <PageHeading>Ethics Contact</PageHeading>
    <MarkdownContent dangerouslySetInnerHTML={{ __html: ethicsContent.html }} />
  </EthicsContactPage>
)
