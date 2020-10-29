import React from 'react'

import { Badge, ExternalLink, Link, List, ListItem } from '@gnomad/ui'

import {
  FileList,
  GenericDownloadLinks,
  GetUrlButtons,
  IndexedFileDownloadLinks,
  SectionTitle,
} from './downloadsPageStyles'

const genomeChromosomeVcfs = [
  { chrom: '1', size: '180.86 GiB', md5: '3fed7d7a8e5cd7477c34f2b707c9eca4' },
  { chrom: '2', size: '192.35 GiB', md5: '4fe2d70bf6855d74b89e3fea4ab2f5e2' },
  { chrom: '3', size: '157.99 GiB', md5: '88be6d8786d56376d3fb641d30634690' },
  { chrom: '4', size: '151.24 GiB', md5: 'e123e800a797dd1d12cb4f0469ac088c' },
  { chrom: '5', size: '139.02 GiB', md5: 'd60ae9aafdef8616a0806b9ab0d845bf' },
  { chrom: '6', size: '132.76 GiB', md5: '8e81f3dd9bc893605fff5a532dadd250' },
  { chrom: '7', size: '129.4 GiB', md5: 'cb3139514db686c573043aebcac1bc8a' },
  { chrom: '8', size: '121.4 GiB', md5: '82d67c5d4b3ade6edadcc36bd59e5c05' },
  { chrom: '9', size: '102.62 GiB', md5: 'a23e1760c30bf37771e96d6bf694d615' },
  { chrom: '10', size: '109.27 GiB', md5: '3aeb7e71af2594cf808603cd85263922' },
  { chrom: '11', size: '107.43 GiB', md5: '259a9adf32b0094b294cab968329655d' },
  { chrom: '12', size: '105.37 GiB', md5: 'ba90ec92f5427f43c0caa8e4447ba0be' },
  { chrom: '13', size: '74.29 GiB', md5: '21114bfd0a298ae84f44123660962be1' },
  { chrom: '14', size: '72.61 GiB', md5: 'b3afd0d35557d7e3c2576292f228fa93' },
  { chrom: '15', size: '68.39 GiB', md5: '6d222908c1fd43f454d862f2f32ccef3' },
  { chrom: '16', size: '76.12 GiB', md5: 'bc02d6d9234f212b4a8b19673624c7af' },
  { chrom: '17', size: '68.43 GiB', md5: 'b15096d041d7fa0e5abab52f317eed48' },
  { chrom: '18', size: '59.38 GiB', md5: 'd145896fe2440f4eb661b934f46602a6' },
  { chrom: '19', size: '53.82 GiB', md5: 'c5138793924b10fb9735ca9fd449338f' },
  { chrom: '20', size: '49.07 GiB', md5: '931a3f1ec3a890b2541919f339b34f22' },
  { chrom: '21', size: '32.81 GiB', md5: '58fbe5e6dd82041a5e231bc8e50c136a' },
  { chrom: '22', size: '35.62 GiB', md5: 'e44a2dfbc324a595e01a28a1d0074785' },
  { chrom: 'X', size: '94.95 GiB', md5: '5fa6e3824bffdcb437039da7c86a247c' },
  { chrom: 'Y', size: '2.27 GiB', md5: '7a2114a7633f7245c2e0b54e9b03f9dc' },
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
      <p>
        <Badge level="info">Note</Badge> Find out what changed in the latest release in the{' '}
        <ExternalLink href="https://gnomad.broadinstitute.org/blog/">
          gnomAD v3.1 blog post
        </ExternalLink>
        .
      </p>
      <p>
        The variant dataset files below contain all subsets (non-cancer, non-neuro, non-v2,
        non-TOPMed, controls/biobanks, 1KG, and HGDP).
      </p>
      <p>
        v3.1 files will be available soon on Google Cloud Public Datasets and Azure Open Datasets.
      </p>

      <h3>Genomes</h3>
      <FileList>
        <ListItem>
          <GetUrlButtons
            label="Sites Hail Table"
            path="/release/3.1/ht/genomes/gnomad.genomes.v3.1.sites.ht"
            gcsBucket="gnomad-public-requester-pays"
            includeAzure={false}
          />
        </ListItem>
        {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
          <ListItem key={chrom}>
            <IndexedFileDownloadLinks
              label={`chr${chrom} sites VCF`}
              path={`/release/3.1/vcf/genomes/gnomad.genomes.v3.1.sites.chr${chrom}.vcf.bgz`}
              size={size}
              md5={md5}
              gcsBucket="gnomad-public"
              includeAzure={false}
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
