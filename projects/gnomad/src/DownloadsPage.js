import React from 'react'
import styled from 'styled-components'

import { PageHeading, ExternalLink } from '@broad/ui'

import InfoPage from './InfoPage'

const Downloads = styled.div`
  display: flex;
  flex-direction: row;
`

const SequencingMethodSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-right: 100px;
`

const DownloadSection = styled.div`
  display: flex;
  flex-direction: column;

  h3 {
    margin-bottom: 5px;
    font-size: 16px;
  }

  ul {
    list-style: none;
    margin-top: 5px;
    padding-left: 0;

    li {
      margin-bottom: 5px;
    }
  }
`

const exomesVcfs = [
  [
    '5.81 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr1.vcf.bgz',
  ],
  [
    '4.23 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr2.vcf.bgz',
  ],
  [
    '3.31 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr3.vcf.bgz',
  ],
  [
    '2.19 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr4.vcf.bgz',
  ],
  [
    '2.53 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr5.vcf.bgz',
  ],
  [
    '2.85 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr6.vcf.bgz',
  ],
  [
    '2.9 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr7.vcf.bgz',
  ],
  [
    '2.14 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr8.vcf.bgz',
  ],
  [
    '2.42 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr9.vcf.bgz',
  ],
  [
    '2.25 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr10.vcf.bgz',
  ],
  [
    '3.64 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr11.vcf.bgz',
  ],
  [
    '3.09 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr12.vcf.bgz',
  ],
  [
    '984.13 MiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr13.vcf.bgz',
  ],
  [
    '2.03 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr14.vcf.bgz',
  ],
  [
    '2.1 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr15.vcf.bgz',
  ],
  [
    '3.06 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr16.vcf.bgz',
  ],
  [
    '3.64 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr17.vcf.bgz',
  ],
  [
    '888.66 MiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr18.vcf.bgz',
  ],
  [
    '4.33 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr19.vcf.bgz',
  ],
  [
    '1.46 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr20.vcf.bgz',
  ],
  [
    '657.55 MiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr21.vcf.bgz',
  ],
  [
    '1.44 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chr22.vcf.bgz',
  ],
  [
    '1.33 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chrX.vcf.bgz',
  ],
  [
    '15.79 MiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/exomes/gnomad.exomes.r2.1.sites.chrY.vcf.bgz',
  ],
]

const genomesVcfs = [
  [
    '36.09 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr1.vcf.bgz',
  ],
  [
    '38.5 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr2.vcf.bgz',
  ],
  [
    '31.58 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr3.vcf.bgz',
  ],
  [
    '30.56 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr4.vcf.bgz',
  ],
  [
    '28.49 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr5.vcf.bgz',
  ],
  [
    '26.7 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr6.vcf.bgz',
  ],
  [
    '26.24 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr7.vcf.bgz',
  ],
  [
    '24.66 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr8.vcf.bgz',
  ],
  [
    '20.18 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr9.vcf.bgz',
  ],
  [
    '21.38 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr10.vcf.bgz',
  ],
  [
    '21.99 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr11.vcf.bgz',
  ],
  [
    '21.42 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr12.vcf.bgz',
  ],
  [
    '15.04 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr13.vcf.bgz',
  ],
  [
    '14.74 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr14.vcf.bgz',
  ],
  [
    '13.87 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr15.vcf.bgz',
  ],
  [
    '15.54 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr16.vcf.bgz',
  ],
  [
    '13.62 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr17.vcf.bgz',
  ],
  [
    '12.16 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr18.vcf.bgz',
  ],
  [
    '11.3 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr19.vcf.bgz',
  ],
  [
    '9.69 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr20.vcf.bgz',
  ],
  [
    '6.17 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr21.vcf.bgz',
  ],
  [
    '6.54 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chr22.vcf.bgz',
  ],
  [
    '17.92 GiB',
    'https://storage.googleapis.com/gnomad-public/release/2.1/vcf/genomes/gnomad.genomes.r2.1.sites.chrX.vcf.bgz',
  ],
]

const createVcfLink = file => {
  const fileSize = file[0]
  const url = file[1]
  const chrom = /chr(\w+)/.exec(url)[0]
  const dataset = /vcf\/(\w+)\/gnomad/.exec(url)[0]
  const tabixUrl = `${url}.tbi`
  return (
    <li key={`${dataset}-${chrom}`}>
      <ExternalLink href={url}>{`${chrom} sites VCF (${fileSize}) `}</ExternalLink>
      <ExternalLink href={tabixUrl}>{`(.tbi)`}</ExternalLink>
    </li>
  )
}

export default () => (
  <InfoPage>
    <PageHeading>Downloads</PageHeading>
    <p>
      The variant dataset files below contain all subsets and are large in size. We recommend using{' '}
      <ExternalLink href={'https://Hail.is/'}>Hail 0.2</ExternalLink> to work with gnomAD data. It
      is easiest to download these files in parallel on the commandline using{' '}
      <ExternalLink href={'https://cloud.google.com/storage/docs/gsutil'}>gsutil</ExternalLink>.
      After installing gsutil, start navigating with this command:
    </p>

    <code>gsutil ls gs://gnomad-public/release/2.1</code>

    <Downloads>
      <SequencingMethodSection>
        <h2>Exomes</h2>
        <DownloadSection>
          <h3>Sites Hail Table</h3>
          <ul>
            <li>
              <ExternalLink
                href={
                  'https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1/ht/exomes'
                }
              >
                gs://gnomad-public/release/2.1/ht/exomes/gnomad.exomes.r2.1.sites.ht
              </ExternalLink>
            </li>
          </ul>
        </DownloadSection>
        <DownloadSection>
          <h3>Coverage Hail Table</h3>
          <ul>
            <li>
              <ExternalLink
                href={
                  'https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1/coverage/exomes'
                }
              >
                gs://gnomad-public/release/2.1/coverage/exomes/gnomad.exomes.r2.1.coverage.ht
              </ExternalLink>
            </li>
          </ul>
        </DownloadSection>
        <DownloadSection>
          <h3>VCFs</h3>
          <ul>{exomesVcfs.map(createVcfLink)}</ul>
        </DownloadSection>
      </SequencingMethodSection>
      <SequencingMethodSection>
        <h2>Genomes</h2>
        <DownloadSection>
          <h3>Sites Hail Table</h3>
          <ul>
            <li>
              <ExternalLink
                href={
                  'https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1/ht/genomes'
                }
              >
                gs://gnomad-public/release/2.1/ht/genomes/gnomad.genomes.r2.1.sites.ht
              </ExternalLink>
            </li>
          </ul>
        </DownloadSection>
        <DownloadSection>
          <h3>Coverage Hail Table</h3>
          <ul>
            <li>
              <ExternalLink
                href={
                  'https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1/coverage'
                }
              >
                gs://gnomad-public/release/2.1/coverage/genomes/gnomad.genomes.r2.1.coverage.ht
              </ExternalLink>
            </li>
          </ul>
        </DownloadSection>
        <DownloadSection>
          <h3>VCFs</h3>
          <ul>{genomesVcfs.map(createVcfLink)}</ul>
        </DownloadSection>
      </SequencingMethodSection>
    </Downloads>

    <SequencingMethodSection>
      <h2>Other</h2>
      <DownloadSection>
        <h3>Gene constraint</h3>
        <ul>
          <li>
            <ExternalLink href="https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1/ht/constraint">
              Hail Table (gs://gnomad-public/release/2.1/ht/constraint/constraint.ht)
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1/ht/constraint/constraint.txt.bgz">
              TSV
            </ExternalLink>
          </li>
        </ul>
      </DownloadSection>
    </SequencingMethodSection>
  </InfoPage>
)
