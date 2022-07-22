import React from 'react'
import styled from 'styled-components'

import { Button } from '@gnomad/ui'

// @ts-expect-error TS(2307) FIXME: Cannot find module '../about/mou.md' or its corres... Remove this comment to see the full error message
import mou from '../about/mou.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'

const MOUHeading = styled.h1`
  text-align: center;

  @media print {
    font-size: 16pt; /* stylelint-disable-line */
  }
`

const PrintButton = styled(Button)`
  margin-top: 2em;

  @media print {
    display: none;
  }
`

export default () => (
  <InfoPage>
    <DocumentTitle title="Memorandum of Understanding" />
    <MOUHeading>
      <span style={{ textTransform: 'uppercase' }}>Memorandum of Understanding</span>
      <br />
      Participation in the Genome Aggregation Database (gnomAD)
    </MOUHeading>

    <MarkdownContent dangerouslySetInnerHTML={{ __html: mou.html }} />

    <p>You indicate your agreement with this MOU by signing below:</p>

    <dl>
      <dt style={{ textTransform: 'uppercase' }}>Participant:</dt>
      <dd style={{ marginLeft: 0 }}>
        <br />
        <span aria-hidden="true">____________________________</span>
      </dd>
      <dt>Consortium:</dt>
      <dd />
      <dt>Name:</dt>
      <dd />
      <dt>Title:</dt>
      <dd />
      <dt>Date:</dt>
      <dd />
    </dl>

    <PrintButton
      onClick={() => {
        window.print()
      }}
    >
      Print this page
    </PrintButton>
  </InfoPage>
)
