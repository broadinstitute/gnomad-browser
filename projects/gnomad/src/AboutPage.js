import React from 'react'

import { ExternalLink, PageHeading } from '@broad/ui'

import InfoPage from './InfoPage'

export default () => (
  <InfoPage>
    <PageHeading>About gnomAD</PageHeading>
    <p>
      The Genome Aggregation Database (gnomAD), is a coalition of investigators seeking to aggregate
      and harmonize exome and genome sequencing data from a variety of large-scale sequencing
      projects, and to make summary data available for the wider scientific community. In its first
      release, which contained exclusively exome data, it was known as the Exome Aggregation
      Consortium (ExAC).
    </p>

    <p>
      All of the raw data from these projects have been reprocessed through the same pipeline, and
      jointly variant-called to increase consistency across projects. The processing pipelines were
      written in the{' '}
      <ExternalLink href="https://software.broadinstitute.org/wdl/">
        WDL workflow definition language
      </ExternalLink>{' '}
      and executed using the{' '}
      <ExternalLink href="https://github.com/broadinstitute/cromwell">
        Cromwell execution engine
      </ExternalLink>
      , open-source projects for defining and executing genomic workflows at massive scale on
      multiple platforms. The gnomAD data set contains individuals sequenced using multiple exome
      capture methods and sequencing chemistries, so coverage varies between individuals and across
      sites. This variation in coverage is incorporated into the variant frequency calculations for
      each variant.
    </p>

    <p>
      gnomAD was QCed and analysed using the{' '}
      <ExternalLink href="https://hail.is/">Hail</ExternalLink> open-source framework for scalable
      genetic analysis.
    </p>

    <p>
      A list of gnomAD Principal Investigators and groups that have contributed data and analysis to
      the current release is available below.
    </p>

    <p>
      The generation of this call set was funded primarily by the Broad Institute, and the data here
      are released publicly for the benefit of the wider biomedical community. There are no
      publication restrictions or embargoes on these data. Please cite the{' '}
      <ExternalLink href="http://www.nature.com/nature/journal/v536/n7616/full/nature19057.html">
        ExAC paper
      </ExternalLink>{' '}
      for any use of these data.
    </p>

    <p>
      The data are available under the{' '}
      <ExternalLink href="http://opendatacommons.org/licenses/odbl/1.0/">
        ODC Open Database License (ODbL)
      </ExternalLink>{' '}
      (summary available{' '}
      <ExternalLink href="http://www.opendatacommons.org/licenses/odbl/1-0/summary/">
        here
      </ExternalLink>
      ): you are free to share and modify the gnomAD data so long as you attribute any public use of
      the database, or works produced from the database; keep the resulting data-sets open; and
      offer your shared or adapted version of the dataset under the same ODbL license.
    </p>

    <p>
      The aggregation and release of summary data from the exomes and genomes collected by the
      Genome Aggregation Database has been approved by the Partners IRB (protocol 2013P001339,
      &quot;Large-scale aggregation of human genomic data&quot;).
    </p>

    <p>
      For bug reports, please file an issue on{' '}
      <ExternalLink href="https://github.com/macarthur-lab/gnomadjs/issues">Github</ExternalLink>.
    </p>
  </InfoPage>
)
