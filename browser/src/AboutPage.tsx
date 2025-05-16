import React from 'react'
import styled from 'styled-components'
import { PageHeading } from '@gnomad/ui'

// @ts-expect-error
import aboutContent from '../about/about.md'
// import contributingProjectsList from '../about/contributors/contributing-projects.md'
// import dataContributorsList from '../about/contributors/data-contributors.md'
// import gcbrContent from '../about/contributors/gcbr/gcbr.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'

const Contributors = styled.div`
  line-height: 1.5;

  ul {
    padding-left: 0;
    margin: 0;
    list-style-type: none;
  }

  ul ul {
    padding-left: 20px;
    margin: 0.5em 0;
  }
`

const _PrincipalInvestigators = styled(Contributors)`
  columns: 2;

  @media (max-width: 992px) {
    columns: 1;
  }
`

export default () => (
  <InfoPage>
    <DocumentTitle title="About OurDNA Browser" />
    <PageHeading
      // @ts-expect-error

      id="about-gnomad"
    >
      About OurDNA Browser
    </PageHeading>

    {/* Import about blurb from .md file */}
    <MarkdownContent dangerouslySetInnerHTML={{ __html: aboutContent.html }} />
    
  </InfoPage>
)
