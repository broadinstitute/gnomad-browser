import React from 'react'

import { Link, List, ListItem } from '@gnomad/ui'

import {
  FileList,
  GenericDownloadLinks,
  GetUrlButtons,
  IndexedFileDownloadLinks,
  SectionTitle,
} from './downloadsPageStyles'

const genomeChromosomeVcfs = [
  { chrom: '1', size: '18.4 GiB', md5: 'e78783bb528d4b43ae80282d36107cfe' },
  { chrom: '2', size: '19.46 GiB', md5: 'dfe1310a9eb9d649255bf85950b26140' },
  { chrom: '3', size: '15.93 GiB', md5: 'f815bd5d61e5e736740da7e57821fd58' },
  { chrom: '4', size: '15.33 GiB', md5: '862cf872c64a0abf30a41102c9e1f458' },
  { chrom: '5', size: '14.19 GiB', md5: 'be3ce2085bbef13dca96a09451cb182d' },
  { chrom: '6', size: '13.47 GiB', md5: 'c211cbeea35cf0ee5d930bc7d85f90ab' },
  { chrom: '7', size: '13.23 GiB', md5: '0c350900f496559db70eda453014146b' },
  { chrom: '8', size: '12.28 GiB', md5: '43b7e8dc549aa5a5e3d637c07c2e1586' },
  { chrom: '9', size: '10.34 GiB', md5: 'd1a0ef9d1c45c213acd8bead72cc73ed' },
  { chrom: '10', size: '11.02 GiB', md5: '6afea1ff8a767d108b8858d3b9da2740' },
  { chrom: '11', size: '10.93 GiB', md5: 'ea649b38278aa114e559f515fb7db1f2' },
  { chrom: '12', size: '10.74 GiB', md5: 'fd0d4f46a3ce791ee067ba9997b6a6ff' },
  { chrom: '13', size: '7.54 GiB', md5: 'a860c98407c65a10aef6cc8126bccb60' },
  { chrom: '14', size: '7.35 GiB', md5: '7a26b7b3e53d2980af6964b4c63a0718' },
  { chrom: '15', size: '6.99 GiB', md5: '3a1072e7bd4715d82b10c8411139f2b2' },
  { chrom: '16', size: '7.84 GiB', md5: '366093d698523fd2a54262395246f691' },
  { chrom: '17', size: '7.09 GiB', md5: '122476ac38e1030b8e4d1a98bebe470c' },
  { chrom: '18', size: '6.0 GiB', md5: '18a5769368d318e4a7832818b39dc5bc' },
  { chrom: '19', size: '5.68 GiB', md5: '80cc4f45faf931908eb80b13bf7c1459' },
  { chrom: '20', size: '5.05 GiB', md5: 'c1cb84fb3fca6f4d49c46cc1b1ed0a15' },
  { chrom: '21', size: '3.34 GiB', md5: '67027dc069875a73bbd11e26bf93a77f' },
  { chrom: '22', size: '3.66 GiB', md5: 'd8188bb8ca03747fdf165313e1d15cce' },
  { chrom: 'X', size: '9.51 GiB', md5: '40f30c6a62b4ae850f8880b684b5e04c' },
  { chrom: 'Y', size: '322.31 MiB', md5: 'f5f61530616d814fe368073a946ae070' },
]

export default () => (
  <React.Fragment>
    <section>
      <h2>Summary</h2>
      <List>
        <ListItem>
          <Link href="#v3-variants">Variants</Link>
        </ListItem>
        <ListItem>
          <Link href="#v3-coverage">Coverage</Link>
        </ListItem>
      </List>
    </section>

    <section>
      <SectionTitle id="v3-variants">Variants</SectionTitle>
      <h3>Genomes</h3>
      <FileList>
        <ListItem>
          <GetUrlButtons
            label="Sites Hail Table"
            path="/release/3.0/ht/genomes/gnomad.genomes.r3.0.sites.ht"
          />
        </ListItem>
        <ListItem>
          <IndexedFileDownloadLinks
            label="All chromosomes VCF"
            path="/release/3.0/vcf/genomes/gnomad.genomes.r3.0.sites.vcf.bgz"
            size="235.68 GiB"
            md5="f3501102192975da34b5d2c32f7c0791"
          />
        </ListItem>
        {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
          <ListItem key={chrom}>
            <IndexedFileDownloadLinks
              label={`chr${chrom} sites VCF`}
              path={`/release/3.0/vcf/genomes/gnomad.genomes.r3.0.sites.chr${chrom}.vcf.bgz`}
              size={size}
              md5={md5}
            />
          </ListItem>
        ))}
      </FileList>
    </section>

    <section>
      <SectionTitle id="v3-coverage">Coverage</SectionTitle>
      <FileList>
        <ListItem>
          <GetUrlButtons
            label="Genome coverage Hail Table"
            path="/release/3.0.1/coverage/genomes/gnomad.genomes.r3.0.1.coverage.ht"
          />
        </ListItem>
        <ListItem>
          <GenericDownloadLinks
            label="Genome coverage summary TSV"
            path="/release/3.0.1/coverage/genomes/gnomad.genomes.r3.0.1.coverage.summary.tsv.bgz"
            size="75.38 GiB"
            md5="6c809627ff7922dcfc8d2c67bba017ff"
          />
        </ListItem>
      </FileList>
    </section>
  </React.Fragment>
)
