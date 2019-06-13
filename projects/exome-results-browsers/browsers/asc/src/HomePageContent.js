import React from 'react'

import { ExternalLink } from '@broad/ui'

export default () => (
  <React.Fragment>
    <p>
      Founded in 2010, the{' '}
      <ExternalLink href="https://genome.emory.edu/ASC/">
        Autism Sequencing Consortium (ASC)
      </ExternalLink>{' '}
      is an international group of scientists who share autism spectrum disorder (ASD) samples and
      genetic data. This portal displays variant and gene-level data from the most recent{' '}
      <ExternalLink href="https://www.biorxiv.org/content/10.1101/484113v3">
        ASC exome sequencing analysis
      </ExternalLink>
      . The analysis draws from de novo variants called in family-based data consisting of 6,430
      probands with ASD and 2,179 unaffected siblings as well as rare variants called in 5,556 ASD
      cases and 8,809 ancestry-matched controls. The family-based data includes the Simons Simplex
      Collection, while a substantial portion of the case-control data is from the Lundbeck
      Foundation Initiative for Integrative Psychiatric Research (iPSYCH) in Denmark. A Bayesian
      model called{' '}
      <ExternalLink href="https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1003671">
        TADA
      </ExternalLink>{' '}
      is used to integrate the different types of data and associate specific genes with ASD.
    </p>

    <p>
      This effort has been funded by the National Institute of Mental Health (NIMH), with additional
      contributing support from the National Human Genome Research Institute (NHGRI), the Simons
      Foundation, the Stanley Foundation, the Seaver Foundation, the Autism Science Foundation, and
      the Lundbeck Foundation, in addition to other organizations.
    </p>
  </React.Fragment>
)
