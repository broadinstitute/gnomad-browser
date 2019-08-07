import React from 'react'

import { ExternalLink } from '@broad/ui'

const TermsPageContent = () => (
  <React.Fragment>
    <p>
      This website is intended to provide summary-level results from whole exome sequencing data of
      the Epi25 WES study. The WES data was generated for educational and research use only and not
      for diagnostic/clinical or commercial use. The data from this website may not be replicated on
      any other website without written consent. All users of Epi25 browser data agree not to
      attempt to re-identify participants.
    </p>
    <p>
      We encourage you to contact the Epi25 Collaborative before embarking on any analyses using
      these data to check if your proposed analyses overlap with work currently underway by members
      of Epi25.
    </p>
    <p>
      We request that any publications or reports of results obtained from using the information
      available in this browser cite the{' '}
      <ExternalLink href="https://www.cell.com/ajhg/fulltext/S0002-9297(19)30207-1">
        primary manuscript
      </ExternalLink>{' '}
      that reports on the Epi25 WES analyses. Epi25 does not need to be included as co-authors on
      your manuscript, unless we contributed specific advice or analysis for your work. However, we
      ask that you acknowledge the Epi25 Collaborative as follows:
    </p>
    <blockquote>
      <p>
        The authors would like to thank the Epi25 Collaborative and the individual study teams that
        contributed to this resource. A full list of Epi25 collaborators can be found at{' '}
        <ExternalLink href="https://epi-25.org">epi-25.org</ExternalLink>.
      </p>
    </blockquote>
  </React.Fragment>
)

export default TermsPageContent
