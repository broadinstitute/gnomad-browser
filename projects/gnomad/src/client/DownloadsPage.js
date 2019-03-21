import React from 'react'
import styled from 'styled-components'

import { PageHeading, ExternalLink } from '@broad/ui'
import { HUMAN_CHROMOSOMES } from '@broad/utilities'

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

const MNVList = styled.ul`
  list-style: circle !important;
  padding-left: 20px !important;
`

const RELEASE = '2.1.1'

const EXOMES_VCF_SIZES = [
  '5.77 GiB',
  '4.2 GiB',
  '3.29 GiB',
  '2.17 GiB',
  '2.51 GiB',
  '2.83 GiB',
  '2.88 GiB',
  '2.13 GiB',
  '2.4 GiB',
  '2.23 GiB',
  '3.61 GiB',
  '3.07 GiB',
  '976.73 MiB',
  '2.02 GiB',
  '2.08 GiB',
  '3.04 GiB',
  '3.62 GiB',
  '882.14 MiB',
  '4.3 GiB',
  '1.44 GiB',
  '652.73 MiB',
  '1.43 GiB',
  '1.33 GiB',
  '15.66 MiB',
]

const GENOMES_VCF_SIZES = [
  '35.83 GiB',
  '38.21 GiB',
  '31.35 GiB',
  '30.33 GiB',
  '28.27 GiB',
  '26.5 GiB',
  '26.05 GiB',
  '24.47 GiB',
  '20.03 GiB',
  '21.22 GiB',
  '21.83 GiB',
  '21.26 GiB',
  '14.92 GiB',
  '14.63 GiB',
  '13.77 GiB',
  '15.43 GiB',
  '13.52 GiB',
  '12.07 GiB',
  '11.22 GiB',
  '9.62 GiB',
  '6.12 GiB',
  '6.49 GiB',
  '17.8 GiB',
]

const exomeChroms = HUMAN_CHROMOSOMES
const genomeChroms = HUMAN_CHROMOSOMES.slice(0, -1)

const createVcfLink = (dataset, chrom, size) => {
  const vcfUrl = `https://storage.googleapis.com/gnomad-public/release/${RELEASE}/vcf/${dataset}/gnomad.${dataset}.r${RELEASE}.sites.${chrom}.vcf.bgz`
  const tabixUrl = `${vcfUrl}.tbi`

  return (
    <li key={`${dataset}-${chrom}`}>
      <ExternalLink href={vcfUrl}>{`chr${chrom} sites VCF (${size}) `}</ExternalLink>
      <ExternalLink href={tabixUrl}>(.tbi)</ExternalLink>
    </li>
  )
}

const exomesVcfLinks = exomeChroms.map((chrom, i) =>
  createVcfLink('exomes', chrom, EXOMES_VCF_SIZES[i])
)
const genomesVcfLinks = genomeChroms.map((chrom, i) =>
  createVcfLink('genomes', chrom, GENOMES_VCF_SIZES[i])
)

export default () => (
  <InfoPage>
    <PageHeading>Downloads</PageHeading>
    <p>
      gnomAD is available for download in VCF and Hail Table (.ht) formats. The variant dataset
      files below contain all subsets (non-neuro, non-cancer, controls-only, and non-TOPMed). The
      files can be downloaded in parallel on the command line with{' '}
      <ExternalLink href="https://cloud.google.com/storage/docs/gsutil">gsutil</ExternalLink>.
    </p>

    <p>
      For example, after installing gsutil, start navigating with this command:{' '}
      <code>gsutil ls gs://gnomad-public/release/2.1.1</code>
    </p>

    <p>
      To work efficiently with gnomAD, we recommend using{' '}
      <ExternalLink href="https://Hail.is/">Hail 0.2</ExternalLink> and our{' '}
      <ExternalLink href="https://github.com/macarthur-lab/gnomad_hail">
        Hail utilities for gnomAD
      </ExternalLink>
      .
    </p>
    <p>
      <strong>Update (March 6, 2019): gnomAD 2.1.1 released.</strong> The links below have been
      updated. Note that the coverage files have not changed for this release.{' '}
    </p>

    <Downloads>
      <SequencingMethodSection>
        <h2>Exomes</h2>
        <DownloadSection>
          <h3>Sites Hail Table</h3>
          <ul>
            <li>
              <ExternalLink href="https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1.1/ht/exomes">
                gs://gnomad-public/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht
              </ExternalLink>
            </li>
          </ul>
        </DownloadSection>
        <DownloadSection>
          <h3>Coverage Hail Table</h3>
          <ul>
            <li>
              <ExternalLink href="https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1/coverage/exomes">
                gs://gnomad-public/release/2.1/coverage/exomes/gnomad.exomes.r2.1.coverage.ht
              </ExternalLink>
            </li>
          </ul>
        </DownloadSection>
        <DownloadSection>
          <h3>VCFs</h3>
          <ul>
            <li>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.vcf.bgz">
                All chromosomes (58.81 GiB){' '}
              </ExternalLink>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.vcf.bgz.tbi">
                (.tbi)
              </ExternalLink>
            </li>
            {exomesVcfLinks}
          </ul>
        </DownloadSection>
      </SequencingMethodSection>
      <SequencingMethodSection>
        <h2>Genomes</h2>
        <DownloadSection>
          <h3>Sites Hail Table</h3>
          <ul>
            <li>
              <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1.1/ht/genomes">
                gs://gnomad-public/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht
              </ExternalLink>
            </li>
          </ul>
        </DownloadSection>
        <DownloadSection>
          <h3>Coverage Hail Table</h3>
          <ul>
            <li>
              <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1/coverage">
                gs://gnomad-public/release/2.1/coverage/genomes/gnomad.genomes.r2.1.coverage.ht
              </ExternalLink>
            </li>
          </ul>
        </DownloadSection>
        <DownloadSection>
          <h3>VCFs</h3>
          <ul>
            <li>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.sites.vcf.bgz">
                All chromosomes (460.93 GiB){' '}
              </ExternalLink>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.sites.vcf.bgz.tbi">
                (.tbi)
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.exome_calling_intervals.sites.vcf.bgz">
                Exome calling intervals (9.7 GiB){' '}
              </ExternalLink>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.exome_calling_intervals.sites.vcf.bgz.tbi">
                (.tbi)
              </ExternalLink>
            </li>
            {genomesVcfLinks}
          </ul>
        </DownloadSection>
      </SequencingMethodSection>
    </Downloads>

    <SequencingMethodSection>
      <h2>Other</h2>
      <DownloadSection>
        <h3>Gene constraint</h3>
        <ul>
          <li>
            <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1.1/constraint/">
              LoF Metrics by Transcript (Hail Table)
              (gs://gnomad-public/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_transcript.ht)
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_transcript.txt.bgz">
              LoF Metrics by Transcript (TSV)
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_gene.txt.bgz">
              LoF Metrics by Gene (TSV)
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.downsamplings.txt.bgz">
              LoF Metrics Downsamplings (TSV)
            </ExternalLink>
          </li>
        </ul>
      </DownloadSection>
      <DownloadSection>
        <h3>Multi-nucleotide variants (MNVs)</h3>
        <ul>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1/mnv/readme.md">
              README
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1/mnv/gnomad_mnv_coding.tsv">
              Coding MNVs (TSV)
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1/mnv/gnomad_mnv_coding_3bp.tsv">
              Coding MNVs consisting of 3 SNVs (TSV)
            </ExternalLink>
          </li>
          <li>
            MNVs genome wide
            <MNVList>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <React.Fragment key={n}>
                  <li>
                    <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1/mnv/genome">
                      Distance = {n} Hail Table
                      (gs://gnomad-public/release/2.1/mnv/genome/gnomad_mnv_genome_d
                      {n}
                      .ht)
                    </ExternalLink>
                  </li>
                  <li>
                    <ExternalLink
                      href={`https://storage.googleapis.com/gnomad-public/release/2.1/mnv/genome/gnomad_mnv_genome_d${n}.tsv.bgz`}
                    >
                      Distance = {n} TSV
                    </ExternalLink>
                  </li>
                </React.Fragment>
              ))}
            </MNVList>
          </li>
        </ul>
      </DownloadSection>
      <DownloadSection>
        <h3>Structural variants</h3>
        <ul>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.vcf.gz">
              SV sites VCF
            </ExternalLink>{' '}
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.vcf.gz.tbi">
              (.tbi)
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.bed.gz">
              SV sites BED
            </ExternalLink>{' '}
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.bed.gz.tbi">
              (.tbi)
            </ExternalLink>
          </li>
        </ul>
      </DownloadSection>
    </SequencingMethodSection>
  </InfoPage>
)
