import LinkIcon from '@fortawesome/fontawesome-free/svgs/solid/link.svg'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { ExternalLink, PageHeading, SectionHeading } from '@broad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import SampleCountTable from './SampleCountTable'

const AnchorLink = styled.a.attrs({ 'aria-hidden': 'true' })`
  display: inline-block;
  width: 15px;
  margin-left: -15px;
  visibility: hidden;
`

const AnchorWrapper = styled.span`
  :hover {
    ${AnchorLink} {
      visibility: visible;
    }
  }
`

const withAnchor = Component => {
  const ComposedComponent = ({ children, id }) => (
    <AnchorWrapper>
      <Component>
        <AnchorLink href={`#${id}`} id={id}>
          <LinkIcon height={12} width={12} />
        </AnchorLink>
        {children}
      </Component>
    </AnchorWrapper>
  )
  const componentName = Component.displayName || Component.name || 'Component'
  ComposedComponent.displayName = `withAnchor(${componentName})`
  ComposedComponent.propTypes = {
    children: PropTypes.node.isRequired,
    id: PropTypes.string.isRequired,
  }
  return ComposedComponent
}

const FAQSectionHeading = withAnchor(SectionHeading)

const Question = withAnchor(
  styled.dt`
    margin-bottom: 0.5em;
    font-weight: bold;
  `
)

const Answer = styled.dd`
  margin: 0 0 1em;
`

export default () => (
  <InfoPage>
    <DocumentTitle title="FAQ" />
    <PageHeading>Frequently Asked Questions</PageHeading>

    <FAQSectionHeading id="general">General</FAQSectionHeading>
    <dl>
      <Question id="how-should-i-cite-discoveries-made-using-gnomad-data">
        How should I cite discoveries made using gnomAD data?
      </Question>
      <Answer>
        Please cite the{' '}
        <ExternalLink href="https://www.biorxiv.org/content/10.1101/531210v2">
          gnomAD flagship paper
        </ExternalLink>{' '}
        or the{' '}
        <ExternalLink href="http://www.nature.com/nature/journal/v536/n7616/full/nature19057.html">
          ExAC flagship paper
        </ExternalLink>
        .
      </Answer>

      <Question id="i-have-identified-a-rare-variant-what-phenotype-data-are-available">
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

      <Question id="can-i-get-access-to-individual-level-genotype-data-from-gnomad">
        Can I get access to individual-level genotype data from gnomAD?
      </Question>
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

      <Question id="what-are-the-restrictions-on-data-usage">
        What are the restrictions on data usage?
      </Question>
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

    <FAQSectionHeading id="constraint">Constraint</FAQSectionHeading>
    <dl>
      <Question id="how-was-the-expected-number-of-variants-determined">
        How was the expected number of variants determined?
      </Question>
      <Answer>
        We used a depth corrected probability of mutation for each gene to predict the expected
        variant counts. More details can be found in section 4.1 of the supplement in{' '}
        <ExternalLink href="http://www.nature.com/nature/journal/v536/n7616/full/nature19057.html">
          Lek et al
        </ExternalLink>
        . Note that the expected variant counts for bases with a median depth &lt;1 were removed
        from the totals.
      </Answer>

      <Question id="which-variants-are-included-in-the-observed-counts">
        Which variants are included in the observed counts?
      </Question>
      <Answer>
        We included single nucleotide changes that occurred in the canonical transcript that were
        found at a frequency of &lt;0.1%, passed all filters, and at sites with a median depth
        &ge;1. The counts represent the number of unique variants and not the allele count of said
        variants.
      </Answer>

      <Question id="why-are-there-fewer-variants-in-the-constraint-table-than-on-the-gene-page">
        Why are there fewer variants in the constraint table than depicted on the gene page?
      </Question>
      <Answer>
        We only included variants that were found in the canonical transcript of the gene. On the
        gene page, variants found in all transcripts are depicted. Additionally, both observed and
        expected variant counts were removed for sites with a median depth &lt;1.
      </Answer>

      <Question id="what-is-included-in-lof">What is included in LoF?</Question>
      <Answer>
        Nonsense, splice acceptor, and splice donor variants caused by single nucleotide changes.
      </Answer>
    </dl>

    <FAQSectionHeading id="technical-details">Technical details</FAQSectionHeading>
    <dl>
      <Question id="what-genome-build-is-the-gnomad-data-based-on">
        What genome build is the gnomAD data based on?
      </Question>
      <Answer>
        All data are based on{' '}
        <ExternalLink href="ftp://ftp.broadinstitute.org/pub/seq/references/Homo_sapiens_assembly19.fasta">
          GRCh37/hg19
        </ExternalLink>
        .
      </Answer>

      <Question id="what-version-of-gencode-was-used-to-annotate-variants">
        What version of Gencode was used to annotate variants?
      </Question>
      <Answer>Version 19 (annotated with VEP version 85).</Answer>

      <Question id="are-all-the-individuals-in-the-exome-variant-server-included">
        Are all the individuals in the{' '}
        <ExternalLink href="http://evs.gs.washington.edu/EVS/">Exome Variant Server</ExternalLink>{' '}
        included?
      </Question>
      <Answer>
        No. We were not given permission from dbGaP to include individuals from several of the
        cohorts included in the NHLBI&apos;s Exome Sequencing Project. As a result, genuine rare
        variants that are present in the EVS may not be observed in gnomAD.
      </Answer>

      <Question id="do-the-cancer-samples-in-the-database-include-tumor-exomes">
        Do the cancer samples in the database include tumor exomes, or is this from germline samples
        only?
      </Question>
      <Answer>
        All of the &quot;cancer&quot; samples in the current release of ExAC are blood
        (&quot;germline&quot;) samples from TCGA. We excluded any sample labeled as tumor. However,
        note that some sample/label swaps may have occurred in TCGA; in addition, it is possible
        that in some patients the blood samples are contaminated by circulating tumor cells.
      </Answer>

      <Question id="what-populations-are-represented-in-the-gnomad-data">
        What populations are represented in the gnomAD data?
      </Question>
      <Answer>
        <SampleCountTable />
      </Answer>

      <Question id="what-ethnicities-are-represented-in-the-other-population">
        What ethnicities are represented in the &quot;other&quot; population?
      </Question>
      <Answer>
        Individuals were classified as &quot;other&quot; if they did not unambiguously cluster with
        the major populations (i.e. afr, asj, amr, eas, fin, nfe, sas) in a principal component
        analysis (PCA).
      </Answer>
    </dl>
  </InfoPage>
)
