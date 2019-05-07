import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { PageHeading, ExternalLink } from '@broad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

const Wrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`

const DownloadSection = styled.div`
  flex-basis: calc(50% - 25px);
  line-height: 1.5;

  @media (max-width: 900px) {
    flex-basis: 100%;
  }

  &:last-child {
    flex-basis: 100%;
  }

  ${ExternalLink} {
    word-break: break-word;
  }

  h3 {
    margin: 1.25em 0 0.5em;
  }

  ul {
    list-style: none;
    padding-left: 0;

    li {
      margin-bottom: 0.5em;

      ul {
        list-style: circle;
        padding-left: 20px;
        margin-top: 0.25em;
      }
    }
  }
`

const exomeChromosomeVcfs = [
  { chrom: '1', size: '5.77 GiB', md5: '9817acdf1d9600efb3355e4cb4b7ee1f' },
  { chrom: '2', size: '4.2 GiB', md5: 'c2822d7a914d06ede28d1078970336ac' },
  { chrom: '3', size: '3.29 GiB', md5: 'd03d8a6741d109f95ab1d8771c76eb2c' },
  { chrom: '4', size: '2.17 GiB', md5: '579f67cf5b58e70d933e386ffa57bdea' },
  { chrom: '5', size: '2.51 GiB', md5: 'e517127575fc9652469cf9306b3fedb3' },
  { chrom: '6', size: '2.83 GiB', md5: 'b895ac937bcb4b317f66a9da7fcc12f2' },
  { chrom: '7', size: '2.88 GiB', md5: '791980836c644ba6a2d41ef615a75554' },
  { chrom: '8', size: '2.13 GiB', md5: 'ed8e5417fec3fc49b5553a4cfb2fe2c9' },
  { chrom: '9', size: '2.4 GiB', md5: 'e60b08f23b57d7c42840a4bef218dcb2' },
  { chrom: '10', size: '2.23 GiB', md5: '9fd88f3e846e522ecd0361caef2c260c' },
  { chrom: '11', size: '3.61 GiB', md5: '33bc258f61fe541f25720ae71b724f2c' },
  { chrom: '12', size: '3.07 GiB', md5: 'c569364a4610fbb89de87409395cfd69' },
  { chrom: '13', size: '976.73 MiB', md5: '1de4e8967e7718e2b26ab96b3996634c' },
  { chrom: '14', size: '2.02 GiB', md5: '0f645d977acae762b3535b8018d489aa' },
  { chrom: '15', size: '2.08 GiB', md5: '6ffb2113d851c6eebeec601f37937b34' },
  { chrom: '16', size: '3.04 GiB', md5: 'e4740b2798df34aa396d0364c9a8368f' },
  { chrom: '17', size: '3.62 GiB', md5: '8c93bad11b73a94b0f1b41141f50d536' },
  { chrom: '18', size: '882.14 MiB', md5: 'f77f723fece7a690ec34a3f65d59e445' },
  { chrom: '19', size: '4.3 GiB', md5: 'c8ed6f651aeb051090c88f29e3874ff4' },
  { chrom: '20', size: '1.44 GiB', md5: '49a46fab6ff9b68143831caa5bc12483' },
  { chrom: '21', size: '652.73 MiB', md5: '7eea9c7ceb4ac1a86a634c1b3ec808c4' },
  { chrom: '22', size: '1.43 GiB', md5: '766303a757547e413b3daccc1290213f' },
  { chrom: 'X', size: '1.33 GiB', md5: '57082d2021cdd1b93a23b4203dcbbb7d' },
  { chrom: 'Y', size: '15.66 MiB', md5: 'fa412becb3aba27b9acf2529bb76b895' },
]

const genomeChromosomeVcfs = [
  { chrom: '1', size: '35.83 GiB', md5: 'b81951f2b7cb2dbef63932677b58f57e' },
  { chrom: '2', size: '38.21 GiB', md5: 'f7db44e30f5be3378486c07494aa035f' },
  { chrom: '3', size: '31.35 GiB', md5: '69bd6a52695d5eedb6e66847fff512b9' },
  { chrom: '4', size: '30.33 GiB', md5: '2dbf7408b56daca57b5a33274c8d46a4' },
  { chrom: '5', size: '28.27 GiB', md5: 'b4439ed58fa62e3c9d1b67c472e521ee' },
  { chrom: '6', size: '26.5 GiB', md5: 'c66d92dc5b677df537f19f3d7d6b1815' },
  { chrom: '7', size: '26.05 GiB', md5: 'bb70cc16431d746c5a516d21019a6be5' },
  { chrom: '8', size: '24.47 GiB', md5: '9ed8ba30f63e2ccf2e0d91fb6b944e3c' },
  { chrom: '9', size: '20.03 GiB', md5: 'df50f25ed54b6fbca76fa302451eb139' },
  { chrom: '10', size: '21.22 GiB', md5: 'd886702d52e91632ffbfe508c7eeeec0' },
  { chrom: '11', size: '21.83 GiB', md5: '6f0721fe85c9fa4c4166d68b3033e9eb' },
  { chrom: '12', size: '21.26 GiB', md5: 'ae0eb6ec036f751d05375d5d38b5e54c' },
  { chrom: '13', size: '14.92 GiB', md5: '7d599634271e6478d64df5c193ce1d97' },
  { chrom: '14', size: '14.63 GiB', md5: 'a25f665eb214f334251b8798e893cd8f' },
  { chrom: '15', size: '13.77 GiB', md5: '094be1d4b82d7022f79556b469c324b3' },
  { chrom: '16', size: '15.43 GiB', md5: '082bedc2d5eed158c50d638529ab86da' },
  { chrom: '17', size: '13.52 GiB', md5: 'addd19da8057da3b392d5af04b8b60ba' },
  { chrom: '18', size: '12.07 GiB', md5: '2e72f12ffe39a6b9cc7377bd2e7f3ef1' },
  { chrom: '19', size: '11.22 GiB', md5: '116b0c4b52effdbccf6cd15a6c07c74e' },
  { chrom: '20', size: '9.62 GiB', md5: 'b06ce8dcedfa761ba781e4416ede6ad8' },
  { chrom: '21', size: '6.12 GiB', md5: 'afd34a5ec39d8efb1d374534637895e7' },
  { chrom: '22', size: '6.49 GiB', md5: '113cded38a70f8f4abbef10f5c63e81d' },
  { chrom: 'X', size: '17.8 GiB', md5: '77d25e87e94d360eb2acedaaedaf3df1' },
]

const RELEASE = '2.1.1'

const ChromosomeVcfLinks = ({ chrom, exomesOrGenomes, md5, size }) => {
  const vcfUrl = `https://storage.googleapis.com/gnomad-public/release/${RELEASE}/vcf/${exomesOrGenomes}/gnomad.${exomesOrGenomes}.r${RELEASE}.sites.${chrom}.vcf.bgz`
  const tabixUrl = `${vcfUrl}.tbi`

  return (
    <React.Fragment>
      <ExternalLink href={vcfUrl}>{`chr${chrom} sites VCF`}</ExternalLink>{' '}
      <ExternalLink href={tabixUrl}>(.tbi)</ExternalLink>
      <br />
      <span>
        {size}, MD5 = {md5}
      </span>
    </React.Fragment>
  )
}

ChromosomeVcfLinks.propTypes = {
  chrom: PropTypes.string.isRequired,
  exomesOrGenomes: PropTypes.oneOf(['exomes', 'genomes']).isRequired,
  md5: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
}

export default () => (
  <InfoPage>
    <DocumentTitle title="Downloads" />
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
      <strong>Update, March 6, 2019: gnomAD 2.1.1 released</strong>{' '}
      <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/README.txt">
        (README.txt)
      </ExternalLink>
    </p>

    <Wrapper>
      <DownloadSection>
        <h2>Exomes</h2>
        <h3>Sites Hail Table</h3>
        <ul>
          <li>
            <ExternalLink href="https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1.1/ht/exomes">
              gs://gnomad-public/release/2.1.1/ht/
              <wbr />
              exomes/gnomad.exomes.r2.1.1.sites.ht
            </ExternalLink>
          </li>
        </ul>
        <h3>Coverage Hail Table</h3>
        <ul>
          <li>
            <ExternalLink href="https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1/coverage/exomes">
              gs://gnomad-public/release/2.1/coverage/
              <wbr />
              exomes/gnomad.exomes.r2.1.coverage.ht
            </ExternalLink>
          </li>
        </ul>
        <h3>VCFs</h3>
        <ul>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.vcf.bgz">
              All chromosomes
            </ExternalLink>{' '}
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.vcf.bgz.tbi">
              (.tbi)
            </ExternalLink>
            <br />
            <span>58.81 GiB, MD5 = f034173bf6e57fbb5e8ce680e95134f2</span>
          </li>
          {exomeChromosomeVcfs.map(vcf => (
            <li key={vcf.chrom}>
              <ChromosomeVcfLinks exomesOrGenomes="exomes" {...vcf} />
            </li>
          ))}
        </ul>
      </DownloadSection>
      <DownloadSection>
        <h2>Genomes</h2>
        <h3>Sites Hail Table</h3>
        <ul>
          <li>
            <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1.1/ht/genomes">
              gs://gnomad-public/release/2.1.1/ht/
              <wbr />
              genomes/gnomad.genomes.r2.1.1.sites.ht
            </ExternalLink>
          </li>
        </ul>
        <h3>Coverage Hail Table</h3>
        <ul>
          <li>
            <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1/coverage">
              gs://gnomad-public/release/2.1/coverage/
              <wbr />
              genomes/gnomad.genomes.r2.1.coverage.ht
            </ExternalLink>
          </li>
        </ul>
        <h3>VCFs</h3>
        <ul>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.sites.vcf.bgz">
              All chromosomes
            </ExternalLink>{' '}
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.sites.vcf.bgz.tbi">
              (.tbi)
            </ExternalLink>
            <br />
            <span>460.93 GiB, MD5 = e6eadf5ac7b2821b40f350da6e1279a2</span>
          </li>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.exome_calling_intervals.sites.vcf.bgz">
              Exome calling intervals
            </ExternalLink>{' '}
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.exome_calling_intervals.sites.vcf.bgz.tbi">
              (.tbi)
            </ExternalLink>
            <br />
            <span>9.7 GiB, MD5 = e5bd69a0f89468149bc3afca78cd5acc</span>
          </li>
          {genomeChromosomeVcfs.map(vcf => (
            <li key={vcf.chrom}>
              <ChromosomeVcfLinks exomesOrGenomes="genomes" {...vcf} />
            </li>
          ))}
        </ul>
      </DownloadSection>

      <DownloadSection>
        <h2>Other</h2>
        <h3>Gene constraint</h3>
        <ul>
          <li>
            <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1.1/constraint/">
              LoF Metrics by Transcript (Hail Table) (gs://gnomad-public/release/2.1.1/constraint/
              <wbr />
              gnomad.v2.1.1.lof_metrics.by_transcript.ht)
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
            <ul>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <React.Fragment key={n}>
                  <li>
                    <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1/mnv/genome">
                      Distance = {n} Hail Table (gs://gnomad-public/release/2.1/mnv/
                      <wbr />
                      genome/gnomad_mnv_genome_d
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
            </ul>
          </li>
        </ul>
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
        <h3>Resources</h3>
        <ul>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/intervals/exome_calling_regions.v1.interval_list">
              Exome calling regions
            </ExternalLink>
          </li>
          <li>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/intervals/hg19-v0-wgs_evaluation_regions.v1.interval_list">
              Genome calling regions
            </ExternalLink>
          </li>
        </ul>
      </DownloadSection>
    </Wrapper>
  </InfoPage>
)
