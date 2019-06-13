import React from 'react'
import styled from 'styled-components'

import stanleyCenterLogo from './stanley-center-logo.png'

const Logo = styled.img`
  display: block;
  width: 300px;
  margin: 0 auto;
`

export default () => (
  <React.Fragment>
    <p>
      The Schizophrenia Exome Sequencing Meta-analysis (SCHEMA) consortium is a large multi-site
      collaboration dedicated to aggregating, generating, and analyzing high-throughput sequencing
      data of schizophrenia patients to improve our understanding of disease architecture and
      advance gene discovery. The consortium was formed in mid-2017 with a deep commitment of data
      sharing, diversity, and inclusivity - our hope is that the findings from this study and others
      like it will provide a foundation for further investigation of disease mechanism and
      therapeutic discovery. This browser is part of that overall effort to display and share these
      results with the wider scientific community.
    </p>

    <p>
      To date, the SCHEMA consortium members have sequenced and processed the whole exomes of over
      25,000 schizophrenia cases and 50,000 matched controls using a standardized protocol, yielding
      one of the largest sequencing data sets of a complex trait to date. Our study has actively
      recruited from diverse global populations, and includes individuals of European, Latin
      American, East Asian, Ashkenazi Jewish, and African American ancestry. Because the sequence
      data was generated with various capture technologies over a span of seven years, we adapted
      and developed methods to reduce possible confounders, and incorporated this information during
      the quality control and analysis steps. The first results have provided genome-wide
      significant results associating rare variants in individual genes to risk of schizophrenia,
      and later releases are planned with larger number of samples that will further increase power.
    </p>

    <p>
      The SCHEMA consortium is made possible by the generosity of many funders, including the
      Stanley Foundation, and NIH, and the leadership of its members. The principal investigators
      and groups who have contributed to this current release are listed here. We would also like to
      thank the many tens of thousands of patients and families who generously contributed to our
      effort.
    </p>

    <p>Analysis data last updated April 15th, 2019.</p>

    <Logo alt="Stanley Center logo" src={stanleyCenterLogo} />
  </React.Fragment>
)
