import React from 'react'

import { ExternalLink, PageHeading } from '@broad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

export default () => (
  <InfoPage>
    <DocumentTitle title="Other Studies" />
    <PageHeading>Other Studies</PageHeading>
    <p>
      This website contains results from one of several case-control studies of psychiatric diseases
      done at the Broad Institute. Results of other studies are available at the following websites:
    </p>
    <h2>
      Autism - <ExternalLink href="https://asc.broadinstitute.org">ASC</ExternalLink>
    </h2>
    <p>
      Founded in 2010, the Autism Sequencing Consortium (ASC) is an international group of
      scientists who share autism spectrum disorder (ASD) samples and genetic data. This portal
      displays variant and gene-level data from the most recent ASC exome sequencing analysis.
    </p>
    <h2>
      Epilepsy - <ExternalLink href="https://epi25.broadinstitute.org">Epi25</ExternalLink>
    </h2>
    <p>
      The Epi25 collaborative is a global collaboration committed to aggregating, sequencing, and
      deep-phenotyping up to 25,000 epilepsy patients to advance epilepsy genetics research. The
      Epi25 whole-exome sequencing (WES) case-control study is one of the collaborative&apos;s
      ongoing endeavors that aims to characterize the contribution of rare genetic variation to a
      spectrum of epilepsy syndromes to identify individual risk genes.
    </p>
    <h2>
      Schizophrenia - <ExternalLink href="https://schema.broadinstitute.org">SCHEMA</ExternalLink>
    </h2>
    <p>
      The Schizophrenia Exome Sequencing Meta-analysis (SCHEMA) consortium is a large multi-site
      collaboration dedicated to aggregating, generating, and analyzing high-throughput sequencing
      data of schizophrenia patients to improve our understanding of disease architecture and
      advance gene discovery. The first results of this study have provided genome-wide significant
      results associating rare variants in individual genes to risk of schizophrenia, and later
      releases are planned with larger number of samples that will further increase power.
    </p>
  </InfoPage>
)
