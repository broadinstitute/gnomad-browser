import React from 'react'
import styled from 'styled-components'

import { ExternalLink, PageHeading, SectionHeading } from '@broad/ui'

import InfoPage from './InfoPage'

const Question = styled.dt`
  margin-bottom: 0.5em;
  font-weight: bold;
`

const Answer = styled.dd`
  margin: 0 0 1em;
`

export default () => (
  <InfoPage>
    <PageHeading>Frequently Asked Questions</PageHeading>

    <SectionHeading>General</SectionHeading>
    <dl>
      <Question>How should I cite discoveries made using gnomAD data?</Question>
      <Answer>
        Please cite the ExAC flagship paper available{' '}
        <ExternalLink href="http://www.nature.com/nature/journal/v536/n7616/full/nature19057.html">
          here
        </ExternalLink>
        .
      </Answer>

      <Question>
        I have identified a rare variant in gnomAD that I believe is associated with a specific
        clinical phenotype. What phenotype data are available for these individuals?
      </Question>
      <Answer>
        Most of the individuals who have contributed data to gnomAD were not fully consented for
        phenotype data sharing, and unfortunately at this time we are typically unable to provide
        any information about the clinical status of variant carriers. We have made every effort to
        exclude individuals with severe pediatric diseases from the gnomAD data set, and certainly
        do not expect our data set to be <i>enriched</i> for such individuals, but we typically
        cannot rule out the possibility that some of our participants do actually suffer from your
        disease of interest.
      </Answer>

      <Question>Can I get access to individual-level genotype data from gnomAD?</Question>
      <Answer>
        Many of the samples in gnomAD have individual-level sequencing data deposited in{' '}
        <ExternalLink href="http://www.ncbi.nlm.nih.gov/gap">dbGaP</ExternalLink>, and these can be
        accessed by{' '}
        <ExternalLink href="https://dbgap.ncbi.nlm.nih.gov/aa/wga.cgi?page=login">
          applying through that repository
        </ExternalLink>
        . However, many other samples come from unpublished cohorts or from samples not in dbGaP.
        There is not currently any mechanism to systematically obtain individual-level genotype data
        from the database as a whole. Making this possible would require a truly staggering amount
        of paperwork, and we&apos;d rather spend that time generating larger data sets for the
        community to use.
      </Answer>

      <Question>What are the restrictions on data usage?</Question>
      <Answer>
        There are no restrictions or embargoes on the publication of results derived from the gnomAD
        database. However, we encourage people to{' '}
        <ExternalLink href="mailto:exomeconsortium@gmail.com">
          check with the consortium
        </ExternalLink>{' '}
        before embarking on large-scale analyses, to see if we already have something currently
        underway that overlaps with your plans; generally, we prefer to collaborate with users
        rather than compete with them. The data are available under the{' '}
        <ExternalLink href="http://opendatacommons.org/licenses/odbl/1.0/">
          ODC Open Database License (ODbL)
        </ExternalLink>{' '}
        (summary available{' '}
        <ExternalLink href="http://www.opendatacommons.org/licenses/odbl/1-0/summary/">
          here
        </ExternalLink>
        ): you are free to share and modify the gnomAD data so long as you attribute any public use
        of the database, or works produced from the database; keep the resulting data-sets open; and
        offer your shared or adapted version of the dataset under the same ODbL license.
      </Answer>
    </dl>

    <SectionHeading>Technical details</SectionHeading>
    <dl>
      <Question>What genome build is the gnomAD data based on?</Question>
      <Answer>
        All data are based on{' '}
        <ExternalLink href="ftp://ftp.broadinstitute.org/pub/seq/references/Homo_sapiens_assembly19.fasta">
          GRCh37/hg19
        </ExternalLink>
        .
      </Answer>

      <Question>What version of Gencode was used to annotate variants?</Question>
      <Answer>Version 19 (annotated with VEP version 85).</Answer>

      <Question>
        Why does the browser seem to disagree with the gnomAD VCF at this multiallelic site?
      </Question>
      <Answer>
        Due to the limitations of the VCF format, multi-allelic variants are put together on one VCF
        line. This inevitably adds complexity to otherwise simple variants, and thus when parsing
        onto the browser, we apply a{' '}
        <ExternalLink href="http://www.cureffi.org/2014/04/24/converting-genetic-variants-to-their-minimal-representation/">
          minimal representation
        </ExternalLink>{' '}
        script. For instance, a variant whose REF is GC and ALT alleles are TC,G - the first ALT
        allele is actually a SNP and will be represented in the browser as G&emdash;&gt;T.
      </Answer>

      <Question>
        Are all the individuals in the{' '}
        <ExternalLink href="http://evs.gs.washington.edu/EVS/">Exome Variant Server</ExternalLink>{' '}
        included?
      </Question>
      <Answer>
        No. We were not given permission from dbGaP to include individuals from several of the
        cohorts included in the NHLBI&apos;s Exome Sequencing Project. As a result, genuine rare
        variants that are present in the EVS may not be observed in gnomAD.
      </Answer>

      <Question>
        Do the cancer samples in the database include tumor exomes, or is this from germline samples
        only?
      </Question>
      <Answer>
        All of the &quot;cancer&quot; samples in the current release of ExAC are blood
        (&quot;germline&quot;) samples from TCGA. We excluded any sample labeled as tumor. However,
        note that some sample/label swaps may have occurred in TCGA; in addition, it is possible
        that in some patients the blood samples are contaminated by circulating tumor cells.
      </Answer>

      <Question>What ethnicities are represented in the &quot;other&quot; population?</Question>
      <Answer>
        Individuals were classified as &quot;other&quot; if they did not unambiguously cluster with
        the major populations (i.e. NFE, FIN, AFR, SAS, EAS, ASJ or AMR) in a principal component
        analysis (PCA).
      </Answer>
    </dl>
  </InfoPage>
)
