import React from 'react'

import { ExternalLink, ListItem } from '@broad/ui'

import { ChromosomeVcfLinks, Column, ColumnsWrapper, FileList } from './downloadsPageStyles'

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

export default () => (
  <React.Fragment>
    <section>
      <h2>Variants (GRCh38 liftover)</h2>
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
  </React.Fragment>
)
