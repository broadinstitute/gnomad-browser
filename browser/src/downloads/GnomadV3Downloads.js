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

const hgdpAnd1kgChromosomeVcfs = [
  { chrom: 1, size: '272.23 GiB', md5: '97e46af6ff91096d2fdf91b1667bc50f' },
  { chrom: 2, size: '286.69 GiB', md5: 'd2b7c75b3e8fa3a96cf80af205f7afe9' },
  { chrom: 3, size: '233.76 GiB', md5: 'cbcf06402050c75e4caccd762f3b2475' },
  { chrom: 4, size: '231.49 GiB', md5: '637fb046eae61ebba05c6a73042b3263' },
  { chrom: 5, size: '210.53 GiB', md5: 'da3033e888bd1cbd3b5a6b521d7a5864' },
  { chrom: 6, size: '202.28 GiB', md5: '4b637f5b48e8886ccb8df0ed14b359b6' },
  { chrom: 7, size: '197.99 GiB', md5: '48aa04961bdf16a0b35bb5c8ae36a325' },
  { chrom: 8, size: '182.11 GiB', md5: '82c67e6f0d982a9ea258d442f1751d9c' },
  { chrom: 9, size: '154.34 GiB', md5: 'd1fbf21974e0122d35d34b6a30dff855' },
  { chrom: 10, size: '167.88 GiB', md5: 'a9851cba7565d3058ba13f27c845875e' },
  { chrom: 11, size: '161.22 GiB', md5: 'a9ea394cac4ddc2273c3472fd63ac893' },
  { chrom: 12, size: '159.38 GiB', md5: '6d6b6d4a2fc4ddfb5a3bf1193527ff46' },
  { chrom: 13, size: '115.19 GiB', md5: 'd15b3ba419535133cc25bbd6ab49ce79' },
  { chrom: 14, size: '110.83 GiB', md5: '08bbf9d586521c8b625dba55f1c949dd' },
  { chrom: 15, size: '103.12 GiB', md5: '458f34d5bb414b486f62dc7f50f5d489' },
  { chrom: 16, size: '115.89 GiB', md5: '440d9614fafed099636ff900aa92fb7e' },
  { chrom: 17, size: '105.74 GiB', md5: '26cce5044954d03a3ac3e09685f7921a' },
  { chrom: 18, size: '90.45 GiB', md5: '2922953b20b06bd89f7fc77744ec3850' },
  { chrom: 19, size: '87.02 GiB', md5: 'd09ad50a22801953fdf6bc0df15c460d' },
  { chrom: 20, size: '77.36 GiB', md5: '9c45b73a067e84d39e67cc28d872bef5' },
  { chrom: 21, size: '53.59 GiB', md5: '5d978798892cbfc044d71cd13bf950b8' },
  { chrom: 22, size: '58.18 GiB', md5: '2e6bdc4ae3869a2145dd6897395b8dbc' },
  { chrom: 'X', size: '125.36 GiB', md5: 'aee8000ad1facf83f6dc79d6176c29f1' },
  { chrom: 'Y', size: '2.36 GiB', md5: '12909367b2666b8ecc3214d22bbdc211' },
]

export default () => (
  <React.Fragment>
    <p>
      The gnomAD v3.1 data set contains 76,156 whole genomes (and no exomes), all mapped to the
      GRCh38 reference sequence.
    </p>
    <section>
      <h2>Summary</h2>
      <List>
        <ListItem>
          <Link href="#v3-variants">Variants</Link>
        </ListItem>
        <ListItem>
          <Link href="#v3-coverage">Coverage</Link>
        </ListItem>
        <ListItem>
          <Link href="#v3-hgdp-1kg">HGDP + 1KG callset</Link>
        </ListItem>
        <ListItem>
          <Link href="#v3-mitochondrial-dna">Mitochondrial DNA (mtDNA)</Link>
        </ListItem>
      </List>
    </section>

    <section>
      <SectionTitle id="v3-variants">Variants</SectionTitle>
      <p>
        <Badge level="error">Warning</Badge> We have identified an issue in gnomAD v3.1 where some
        variants are missing VEP annotations. This affects both v3.1 Hail Tables and VCFs. We are
        working to resolve this issue.
      </p>
      <p>
        <Badge level="info">Note</Badge> Find out what changed in the latest release in the{' '}
        <ExternalLink href="https://gnomad.broadinstitute.org/blog/2020-10-gnomad-v3-1-new-content-methods-annotations-and-data-availability/">
          gnomAD v3.1 blog post
        </ExternalLink>
        .
      </p>
      <p>
        The variant dataset files below contain all subsets (non-cancer, non-neuro, non-v2,
        non-TOPMed, controls/biobanks, 1KG, and HGDP).
      </p>

      <h3>Genomes</h3>
      <FileList>
        <ListItem>
          <GetUrlButtons
            label="Sites Hail Table"
            path="/release/3.1/ht/genomes/gnomad.genomes.v3.1.sites.ht"
          />
        </ListItem>
        {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
          <ListItem key={chrom}>
            <IndexedFileDownloadLinks
              label={`chr${chrom} sites VCF`}
              path={`/release/3.1/vcf/genomes/gnomad.genomes.v3.1.sites.chr${chrom}.vcf.bgz`}
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

    <section>
      <SectionTitle id="v3-hgdp-1kg">HGDP + 1KG callset</SectionTitle>
      <p>
        These files contain individual genotypes for all samples in the HGDP and 1KG subsets. See
        the{' '}
        <ExternalLink href="https://gnomad.broadinstitute.org/blog/2020-10-gnomad-v3-1-new-content-methods-annotations-and-data-availability/#the-gnomad-hgdp-and-1000-genomes-callset">
          gnomAD v3.1 blog post
        </ExternalLink>{' '}
        for more information.
      </p>

      <h3>Genomes</h3>
      <FileList>
        <ListItem>
          <GetUrlButtons
            label="Hail MatrixTable"
            path="/release/3.1/mt/genomes/gnomad.genomes.v3.1.hgdp_1kg_subset_dense.mt"
            includeAzure={false}
          />
        </ListItem>
        <ListItem>
          <GenericDownloadLinks
            label="Sample metadata TSV"
            path="/release/3.1/vcf/genomes/gnomad.genomes.v3.1.hgdp_1kg_subset.sample_meta.tsv.gz"
          />
        </ListItem>
        {hgdpAnd1kgChromosomeVcfs.map(({ chrom, size, md5 }) => (
          <ListItem key={chrom}>
            <IndexedFileDownloadLinks
              label={`chr${chrom} VCF`}
              path={`/release/3.1/vcf/genomes/gnomad.genomes.v3.1.hgdp_1kg_subset.chr${chrom}.vcf.bgz`}
              size={size}
              md5={md5}
            />
          </ListItem>
        ))}
      </FileList>
    </section>

    <section>
      <SectionTitle id="v3-mitochondrial-dna">Mitochondrial DNA (mtDNA)</SectionTitle>
      <p>
        For details about these files, see the{' '}
        <ExternalLink href="https://gnomad.broadinstitute.org/blog/2020-11-gnomad-v3-1-mitochondrial-dna-variants/">
          gnomAD v3.1 Mitochondrial DNA Variants blog post
        </ExternalLink>
        .
      </p>
      <FileList>
        <ListItem>
          <GetUrlButtons
            label="chrM sites Hail Table"
            gcsBucket="gnomad-public-requester-pays"
            path="/release/3.1/ht/genomes/gnomad.genomes.v3.1.sites.chrM.ht"
            includeAWS={false}
            includeAzure={false}
          />
        </ListItem>
        <ListItem>
          <IndexedFileDownloadLinks
            label="chrM sites VCF"
            gcsBucket="gnomad-public"
            path="/release/3.1/vcf/genomes/gnomad.genomes.v3.1.sites.chrM.vcf.bgz"
            size="4.77 MiB"
            md5="fbdf6807628c13b5379b359f12a39c61"
            includeAWS={false}
            includeAzure={false}
          />
        </ListItem>
        <ListItem>
          <GetUrlButtons
            label="chrM coverage Hail Table"
            gcsBucket="gnomad-public-requester-pays"
            path="/release/3.1/coverage/genomes/gnomad.genomes.v3.1.chrM.coverage.ht"
            includeAWS={false}
            includeAzure={false}
          />
        </ListItem>
        <ListItem>
          <GenericDownloadLinks
            label="chrM sites TSV (reduced annotations)"
            gcsBucket="gnomad-public"
            path="/release/3.1/vcf/genomes/gnomad.genomes.v3.1.sites.chrM.reduced_annotations.tsv"
            size="1 MiB"
            md5="45a91b22ddc3c1176c103d4afee080f5"
            includeAWS={false}
            includeAzure={false}
          />
        </ListItem>
      </FileList>
    </section>
  </React.Fragment>
)
