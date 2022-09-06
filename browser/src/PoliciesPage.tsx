import React from 'react'
import styled from 'styled-components'

import { PageHeading } from '@gnomad/ui'

// @ts-expect-error
import termsContent from '../about/policies/terms.md'
// @ts-expect-error
import privacyPolicy from '../about/policies/policies_gnomAD_privacy_DRAFT.pdf'
// @ts-expect-error
import policiesContent from '../about/policies/policies.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'

const PoliciesPage = styled(InfoPage)`
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
const PrivacyPolicyWrapper = styled.div`
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
  <PoliciesPage>
    <DocumentTitle title="Policies" />
    <PageHeading>Policies</PageHeading>

    <MarkdownContent dangerouslySetInnerHTML={{ __html: termsContent.html }} />

    <br />

    <PrivacyPolicyWrapper>
      <h2>gnomAD Privacy Policy (Draft)</h2>
      <p>
        gnomAD’s draft Privacy Policy that outlines what data we store while you are using our
        website and when you communicate with us, can be found{' '}
        <a href={privacyPolicy} target="_blank" rel="noreferrer">
          here
        </a>
        . It is currently undergoing legal review and is not yet final.
      </p>
    </PrivacyPolicyWrapper>

    <br />

    <MarkdownContent dangerouslySetInnerHTML={{ __html: policiesContent.html }} />
  </PoliciesPage>
)
