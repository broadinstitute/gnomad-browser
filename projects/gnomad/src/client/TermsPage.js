import React from 'react'

import { ExternalLink, PageHeading } from '@broad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import Link from './Link'

export default () => (
  <InfoPage>
    <DocumentTitle title="Terms and Data Information" />
    <PageHeading>Terms and Data Information</PageHeading>

    <h2>Terms of use</h2>
    <p>
      All data here are released openly and publicly for the benefit of the wider biomedical
      community. You can freely download and search the data, and we encourage the use and
      publication of results generated from these data.{' '}
      <strong>
        There are absolutely no restrictions or embargoes on the publication of results derived from
        gnomAD data.
      </strong>{' '}
      However, we encourage you to{' '}
      <ExternalLink href="mailto:exomeconsortium@gmail.com">contact the consortium</ExternalLink>{' '}
      before embarking on large-scale analyses to check if your proposed analysis overlaps with work
      currently underway by the gnomAD consortium. All users of gnomAD data agree to not attempt to
      reidentify participants.
    </p>
    <p>
      This data set has been subjected to extensive quality control, but variant calling and
      filtering from short-read sequencing data is an imperfect and probabilistic process, so many
      errors no doubt remain. If you spot any results that seem impossible, or suggest some kind of
      serious processing or variant-calling artifact, don&apos;t panic: use the &quot;report
      variant&quot; form on the corresponding variant page or{' '}
      <ExternalLink href="mailto:exomeconsortium@gmail.com">email us</ExternalLink> to let us know,
      and we&apos;ll do our best to address it.
    </p>
    <p>
      These data are available under the{' '}
      <ExternalLink href="http://opendatacommons.org/licenses/odbl/1.0/">
        ODC Open Database License (ODbL)
      </ExternalLink>{' '}
      (summary available{' '}
      <ExternalLink href="http://www.opendatacommons.org/licenses/odbl/1-0/summary/">
        here
      </ExternalLink>
      ): you are free to share and modify gnomAD data so long as you attribute any public use of the
      database, or works produced from the database; keep the resulting data-sets open; and offer
      your shared or adapted version of the dataset under the same ODbL license.
    </p>

    <h2>Citation in publications</h2>
    <p>
      We request that any use of data obtained from the gnomAD browser cite{' '}
      <ExternalLink href="https://www.biorxiv.org/content/10.1101/531210v2">
        the gnomAD flagship paper
      </ExternalLink>
      .
    </p>
    <p>
      There&apos;s no need to include us as authors on your manuscript, unless we contributed
      specific advice or analysis for your work. However, we ask that the Consortium be acknowledged
      in publications as follows:
    </p>
    <blockquote>
      <p>
        The authors would like to thank the Genome Aggregation Database (gnomAD) and the groups that
        provided exome and genome variant data to this resource. A full list of contributing groups
        can be found at{' '}
        <Link preserveSelectedDataset={false} to="/about">
          https://gnomad.broadinstitute.org/about
        </Link>
        .
      </p>
    </blockquote>

    <h2>Data Generation</h2>
    <p>
      A full description of the methods used to aggregate and call variants across the exomes and
      genomes in this project will be provided shortly. In brief: we pulled raw data together from
      as many exomes and genomes as we could get our hands on, aligned and processed each of these
      data types through unified processing pipelines based on Picard, and performed variant calling
      with the GATK HaplotypeCaller following GATK best practices. Processing and variant calling at
      this enormous scale was only possible thanks to the hard work of the Broad Institute&apos;s
      Data Sciences Platform, and the Intel GenomicsDB team. Downstream analysis relied heavily on
      the <ExternalLink href="https://hail.is/">Hail</ExternalLink> toolkit.
    </p>
  </InfoPage>
)
