import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { PageHeading, ExternalLink, Link, List, ListItem } from '@broad/ui'

import { withAnchor } from './AnchorLink'
import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

const FileList = styled(List)`
  li {
    line-height: 1.25;
  }
`

const SectionTitle = withAnchor(styled.h2``)

const ColumnsWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`

const Column = styled.div`
  flex-basis: calc(50% - 25px);

  @media (max-width: 900px) {
    flex-basis: 100%;
  }

  > h3 {
    margin-top: 0;
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

const liftoverExomeChromosomeVcfs = [
  { chrom: '1', size: '8.4 GiB', md5: '7de10568689b50697288c7743ac342e0' },
  { chrom: '2', size: '6.1 GiB', md5: '9daadf80734f3fc5894e31c37d5edd5e' },
  { chrom: '3', size: '4.78 GiB', md5: '693a09cb4c70cd21f8b0aa3e63f672ef' },
  { chrom: '4', size: '3.16 GiB', md5: 'd7b7d709857a648a1cec2262cbe72ba0' },
  { chrom: '5', size: '3.66 GiB', md5: 'd2544f5a7664909c7500b3e5b6e72eed' },
  { chrom: '6', size: '4.12 GiB', md5: 'e32aa5ef1948b406b398898c49b439d3' },
  { chrom: '7', size: '4.17 GiB', md5: '5e8dbec42f3e7ff9a3f023358137cc41' },
  { chrom: '8', size: '3.08 GiB', md5: '454d9efe12cdda104032ed78e3769d68' },
  { chrom: '9', size: '3.49 GiB', md5: '13f24aac134162a215024ab9f34d9e4b' },
  { chrom: '10', size: '3.25 GiB', md5: 'f895398b0932c14abce5025d97484bba' },
  { chrom: '11', size: '5.23 GiB', md5: '998b6c79c19422e983183371130d9a56' },
  { chrom: '12', size: '4.45 GiB', md5: '46527606732eb288454b1ed22723ba4c' },
  { chrom: '13', size: '1.39 GiB', md5: '15adaca2b92c43788dae049e0e053808' },
  { chrom: '14', size: '2.92 GiB', md5: '20eccd8bc17f90e14701e1148cfd2ea9' },
  { chrom: '15', size: '3.02 GiB', md5: '8bf4b97fa2bbc5e26909eeccee99125a' },
  { chrom: '16', size: '4.39 GiB', md5: 'ffb631cf9ddc234b6e6053e28c9f9a02' },
  { chrom: '17', size: '5.22 GiB', md5: 'e21098ef8e41b9963a774fbe3dcbbdba' },
  { chrom: '18', size: '1.25 GiB', md5: '655c3f6f63cc7ca14e3d1b307abb550e' },
  { chrom: '19', size: '6.2 GiB', md5: '2587da8ee4e7cd28b453d72c11c074b1' },
  { chrom: '20', size: '2.1 GiB', md5: 'db9dbd66a56428b41b9bc324abf59fb5' },
  { chrom: '21', size: '948.41 MiB', md5: 'ecccf042a895703ab305ab81c9738855' },
  { chrom: '22', size: '2.07 GiB', md5: 'e96e113e26b0ad95a5f2789622b9224c' },
  { chrom: 'X', size: '1.9 GiB', md5: 'b2d62ceecb20b6240ab2047fa0b59de9' },
  { chrom: 'Y', size: '24.14 MiB', md5: '7a3bf626380a108be514991ad21df866' },
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

const liftoverGenomeChromosomeVcfs = [
  { chrom: '1', size: '57.78 GiB', md5: '33ad7883e83ea091bc77b0e19c62ae10' },
  { chrom: '2', size: '61.9 GiB', md5: '721dd923eb5152ab7a80b55a918706eb' },
  { chrom: '3', size: '50.7 GiB', md5: '45b1db20bd90e71259ad1d3fbcc88f74' },
  { chrom: '4', size: '49.13 GiB', md5: '60823a1b5d3eed9569373c7ae6882d12' },
  { chrom: '5', size: '45.89 GiB', md5: 'f3fe0fb5f4d86be2c6ecbc7f666c5a09' },
  { chrom: '6', size: '42.87 GiB', md5: '4eaaaff9d38b765d161c00104fbb6402' },
  { chrom: '7', size: '41.94 GiB', md5: 'fda487fc1c2c4c8a13d86a9c6c70587e' },
  { chrom: '8', size: '39.7 GiB', md5: 'bd482c5fa45049d038646bfd20743004' },
  { chrom: '9', size: '32.33 GiB', md5: '2fbec174a4e704f3defd52a5fdc25391' },
  { chrom: '10', size: '34.29 GiB', md5: '91c0d14635a17593b3fdbcdf91eb8b70' },
  { chrom: '11', size: '35.26 GiB', md5: 'fb19e2a020fd4349e4a2f3192dc4ac36' },
  { chrom: '12', size: '34.22 GiB', md5: '788f21f5f5b7d68d00323eddce1b8a59' },
  { chrom: '13', size: '24.26 GiB', md5: '2258c0edee6994c28fb35e4d7c37ce39' },
  { chrom: '14', size: '23.5 GiB', md5: 'c991f7509e2f9cc1bc021e5a0e7f2d3e' },
  { chrom: '15', size: '22.14 GiB', md5: 'a9cd0171649fc0020e927a55222e20d5' },
  { chrom: '16', size: '24.82 GiB', md5: '292ac43732f3bf3dce6f360ad3290acc' },
  { chrom: '17', size: '21.55 GiB', md5: '943ac20b17c0e3a737b3bc9ef457def4' },
  { chrom: '18', size: '19.53 GiB', md5: '33bf64c3cf4f9c77b2b903969032e699' },
  { chrom: '19', size: '17.71 GiB', md5: '21b57b0ee18225bc95cb494de784ed7a' },
  { chrom: '20', size: '15.58 GiB', md5: '5f49605670c7fb8b7cb2186c4327327b' },
  { chrom: '21', size: '9.87 GiB', md5: '585b7fd4161b09943a70693b3019091f' },
  { chrom: '22', size: '10.33 GiB', md5: '711fc7674901ce7ff26c53ff55a78f7f' },
  { chrom: 'X', size: '27.76 GiB', md5: '381a63cba98b123acdf8b716b1ebc4e3' },
]

const ChromosomeVcfLinks = ({ chrom, md5, size, url }) => {
  const vcfUrl = url(chrom)
  const tabixUrl = `${vcfUrl}.tbi`

  return (
    <React.Fragment>
      <ExternalLink href={vcfUrl}>{`chr${chrom} sites VCF`}</ExternalLink>{' '}
      <ExternalLink href={tabixUrl}>(.tbi)</ExternalLink>
      <br />
      <span>
        {size}, MD5:&nbsp;{md5}
      </span>
    </React.Fragment>
  )
}

ChromosomeVcfLinks.propTypes = {
  chrom: PropTypes.string.isRequired,
  md5: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  url: PropTypes.func.isRequired,
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

    <section>
      <h2>Summary</h2>
      <List>
        <ListItem>
          <Link href="#variants">Variants</Link>
        </ListItem>
        <ListItem>
          <Link href="#variants-grch38-liftover">Variants (GRCh38 liftover)</Link>
        </ListItem>
        <ListItem>
          <Link href="#coverage">Coverage</Link>
        </ListItem>
        <ListItem>
          <Link href="#gene-constraint">Gene constraint</Link>
        </ListItem>
        <ListItem>
          <Link href="#multi-nucleotide-variants">Multi-nucleotide variants (MNVs)</Link>
        </ListItem>
        <ListItem>
          <Link href="#structural-variants">Structural variants</Link>
        </ListItem>
        <ListItem>
          <Link href="#resources">Resources</Link>
        </ListItem>
      </List>
    </section>

    <section>
      <SectionTitle id="variants">Variants</SectionTitle>
      <ColumnsWrapper>
        <Column>
          <h3>Exomes</h3>
          <FileList>
            <ListItem>
              <ExternalLink href="https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1.1/ht/exomes">
                Sites Hail Table
              </ExternalLink>
              <br />
              gs://gnomad-public/release/2.1.1/ht/
              <wbr />
              exomes/gnomad.exomes.r2.1.1.sites.ht
            </ListItem>

            <ListItem>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.vcf.bgz">
                All chromosomes VCF
              </ExternalLink>{' '}
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.vcf.bgz.tbi">
                (.tbi)
              </ExternalLink>
              <br />
              <span>58.81 GiB, MD5: f034173bf6e57fbb5e8ce680e95134f2</span>
            </ListItem>
            {exomeChromosomeVcfs.map(vcf => (
              <ListItem key={vcf.chrom}>
                <ChromosomeVcfLinks
                  {...vcf}
                  url={chrom =>
                    `https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.${chrom}.vcf.bgz`
                  }
                />
              </ListItem>
            ))}
          </FileList>
        </Column>

        <Column>
          <h3>Genomes</h3>
          <FileList>
            <ListItem>
              <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1.1/ht/genomes">
                Sites Hail Table
              </ExternalLink>
              <br />
              gs://gnomad-public/release/2.1.1/ht/
              <wbr />
              genomes/gnomad.genomes.r2.1.1.sites.ht
            </ListItem>
            <ListItem>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.sites.vcf.bgz">
                All chromosomes VCF
              </ExternalLink>{' '}
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.sites.vcf.bgz.tbi">
                (.tbi)
              </ExternalLink>
              <br />
              <span>460.93 GiB, MD5: e6eadf5ac7b2821b40f350da6e1279a2</span>
            </ListItem>
            <ListItem>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.exome_calling_intervals.sites.vcf.bgz">
                Exome calling intervals VCF
              </ExternalLink>{' '}
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.exome_calling_intervals.sites.vcf.bgz.tbi">
                (.tbi)
              </ExternalLink>
              <br />
              <span>9.7 GiB, MD5: e5bd69a0f89468149bc3afca78cd5acc</span>
            </ListItem>
            {genomeChromosomeVcfs.map(vcf => (
              <ListItem key={vcf.chrom}>
                <ChromosomeVcfLinks
                  {...vcf}
                  url={chrom =>
                    `https://storage.googleapis.com/gnomad-public/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.sites.${chrom}.vcf.bgz`
                  }
                />
              </ListItem>
            ))}
          </FileList>
        </Column>
      </ColumnsWrapper>
    </section>

    <section>
      <SectionTitle id="variants-grch38-liftover">Variants (GRCh38 liftover)</SectionTitle>
      <ColumnsWrapper>
        <Column>
          <h3>Exomes</h3>
          <FileList>
            <ListItem>
              <ExternalLink href="https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1.1/liftover_grch38/ht/exomes">
                Sites Hail Table
              </ExternalLink>
              <br />
              gs://gnomad-public/release/2.1.1/
              <wbr />
              liftover_grch38/ht/exomes/
              <wbr />
              gnomad.exomes.r2.1.1.sites.liftover_grch38.ht
            </ListItem>

            <ListItem>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/liftover_grch38/vcf/exomes/gnomad.exomes.r2.1.1.sites.liftover_grch38.vcf.bgz">
                All chromosomes VCF
              </ExternalLink>{' '}
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/liftover_grch38/vcf/exomes/gnomad.exomes.r2.1.1.sites.liftover_grch38.vcf.bgz.tbi">
                (.tbi)
              </ExternalLink>
              <br />
              <span>85.31 GiB, MD5: cff8d0cfed50adc9211d1feaed2d4ca7</span>
            </ListItem>
            {liftoverExomeChromosomeVcfs.map(vcf => (
              <ListItem key={vcf.chrom}>
                <ChromosomeVcfLinks
                  {...vcf}
                  url={chrom =>
                    `https://storage.googleapis.com/gnomad-public/release/2.1.1/liftover_grch38/vcf/exomes/gnomad.exomes.r2.1.1.sites.${chrom}.liftover_grch38.vcf.bgz`
                  }
                />
              </ListItem>
            ))}
          </FileList>
        </Column>

        <Column>
          <h3>Genomes</h3>
          <FileList>
            <ListItem>
              <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1.1/liftover_grch38/ht/genomes">
                Sites Hail Table
              </ExternalLink>
              <br />
              gs://gnomad-public/release/2.1.1/
              <wbr />
              liftover_grch38/ht/genomes/
              <wbr />
              gnomad.genomes.r2.1.1.sites.liftover_grch38.ht
            </ListItem>
            <ListItem>
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/liftover_grch38/vcf/genomes/gnomad.genomes.r2.1.1.sites.liftover_grch38.vcf.bgz">
                All chromosomes VCF
              </ExternalLink>{' '}
              <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/liftover_grch38/vcf/genomes/gnomad.genomes.r2.1.1.sites.liftover_grch38.vcf.bgz.tbi">
                (.tbi)
              </ExternalLink>
              <br />
              <span>743.06 GiB, MD5: 83de3d5b52669f714e810d4fcf047c18</span>
            </ListItem>
            {liftoverGenomeChromosomeVcfs.map(vcf => (
              <ListItem key={vcf.chrom}>
                <ChromosomeVcfLinks
                  {...vcf}
                  url={chrom =>
                    `https://storage.googleapis.com/gnomad-public/release/2.1.1/liftover_grch38/vcf/genomes/gnomad.genomes.r2.1.1.sites.${chrom}.liftover_grch38.vcf.bgz`
                  }
                />
              </ListItem>
            ))}
          </FileList>
        </Column>
      </ColumnsWrapper>
    </section>

    <section>
      <SectionTitle id="coverage">Coverage</SectionTitle>
      <FileList>
        <ListItem>
          <ExternalLink href="https://console.cloud.google.com/storage/browser/gnomad-public/release/2.1/coverage/exomes">
            Exome coverage Hail Table
          </ExternalLink>
          <br />
          gs://gnomad-public/release/2.1/coverage/
          <wbr />
          exomes/gnomad.exomes.r2.1.coverage.ht
        </ListItem>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1/coverage/exomes/gnomad.exomes.coverage.summary.tsv.bgz">
            Exome coverage summary TSV
          </ExternalLink>
          <br />
          <span>1.57 GiB, MD5: 73cddb8cac2c2db4f82662584ede6d20</span>
        </ListItem>
        <ListItem>
          <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1/coverage">
            Genome coverage Hail Table
          </ExternalLink>
          <br />
          gs://gnomad-public/release/2.1/coverage/
          <wbr />
          genomes/gnomad.genomes.r2.1.coverage.ht
        </ListItem>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1/coverage/genomes/gnomad.genomes.coverage.summary.tsv.bgz">
            Genome coverage summary TSV
          </ExternalLink>
          <br />
          <span>50.74 GiB, MD5: bd68fd9241e14eb4debcee63a1c35064</span>
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="gene-constraint">Gene constraint</SectionTitle>
      <FileList>
        <ListItem>
          <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1.1/constraint/">
            LoF Metrics by Transcript Hail Table
          </ExternalLink>
          <br />
          gs://gnomad-public/release/2.1.1/constraint/
          <wbr />
          gnomad.v2.1.1.lof_metrics.by_transcript.ht
        </ListItem>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_transcript.txt.bgz">
            LoF Metrics by Transcript TSV
          </ExternalLink>
        </ListItem>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_gene.txt.bgz">
            LoF Metrics by Gene TSV
          </ExternalLink>
        </ListItem>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.downsamplings.txt.bgz">
            LoF Metrics Downsamplings TSV
          </ExternalLink>
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="multi-nucleotide-variants">Multi-nucleotide variants (MNVs)</SectionTitle>
      <FileList>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1/mnv/readme.md">
            README
          </ExternalLink>
        </ListItem>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1/mnv/gnomad_mnv_coding.tsv">
            Coding MNVs TSV
          </ExternalLink>
        </ListItem>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/release/2.1/mnv/gnomad_mnv_coding_3bp.tsv">
            Coding MNVs consisting of 3 SNVs TSV
          </ExternalLink>
        </ListItem>
      </FileList>
      <h3>MNVs genome wide</h3>
      <FileList>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <React.Fragment key={n}>
            <ListItem>
              <ExternalLink href="https://console.cloud.google.com/storage/gnomad-public/release/2.1/mnv/genome">
                Distance = {n} Hail Table
              </ExternalLink>
              <br />
              gs://gnomad-public/release/2.1/mnv/
              <wbr />
              genome/gnomad_mnv_genome_d
              {n}
              .ht
            </ListItem>
            <ListItem>
              <ExternalLink
                href={`https://storage.googleapis.com/gnomad-public/release/2.1/mnv/genome/gnomad_mnv_genome_d${n}.tsv.bgz`}
              >
                Distance = {n} TSV
              </ExternalLink>
            </ListItem>
          </React.Fragment>
        ))}
      </FileList>
    </section>

    <section>
      <SectionTitle id="structural-variants">Structural variants</SectionTitle>
      <FileList>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.vcf.gz">
            SV sites VCF
          </ExternalLink>{' '}
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.vcf.gz.tbi">
            (.tbi)
          </ExternalLink>
        </ListItem>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.bed.gz">
            SV sites BED
          </ExternalLink>{' '}
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/papers/2019-sv/gnomad_v2_sv.sites.bed.gz.tbi">
            (.tbi)
          </ExternalLink>
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="resources">Resources</SectionTitle>
      <FileList>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/intervals/exome_calling_regions.v1.interval_list">
            Exome calling regions
          </ExternalLink>
        </ListItem>
        <ListItem>
          <ExternalLink href="https://storage.googleapis.com/gnomad-public/intervals/hg19-v0-wgs_evaluation_regions.v1.interval_list">
            Genome calling regions
          </ExternalLink>
        </ListItem>
      </FileList>
    </section>
  </InfoPage>
)
