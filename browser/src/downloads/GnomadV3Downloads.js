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
  { chrom: '1', size: '181.84 GiB', md5: '0786113ae0b5009ecf1a47cc9af6d3da' },
  { chrom: '2', size: '193.13 GiB', md5: '6bc22db58e480efe93ea956161d315b4' },
  { chrom: '3', size: '158.64 GiB', md5: 'aa6723af92011fee203f794a19b74684' },
  { chrom: '4', size: '151.96 GiB', md5: '3b670c491fd6c3bf5ac27a4a82df5378' },
  { chrom: '5', size: '140.29 GiB', md5: 'd649fd030afbddd6aaf8ed9e46deb05a' },
  { chrom: '6', size: '133.3 GiB', md5: 'c292b77b39069537b4c8a594a2e0d90a' },
  { chrom: '7', size: '130.28 GiB', md5: '1981e5ab8da5ed4b2a0e9c140e525f22' },
  { chrom: '8', size: '122.18 GiB', md5: 'ecec6e59e59431afeb4ffe38498b0c17' },
  { chrom: '9', size: '103.03 GiB', md5: 'cc6a53b9947f085c5a21ebb990d3e4d4' },
  { chrom: '10', size: '109.71 GiB', md5: '046b89237d784d0f9af3a09b28e4dacb' },
  { chrom: '11', size: '108.23 GiB', md5: '83f20f8919cce6fa4ba4fcdc7f978717' },
  { chrom: '12', size: '106.11 GiB', md5: '51225260c0df8e71b296bfcabf153751' },
  { chrom: '13', size: '74.79 GiB', md5: '6624049c527edb07212d1b998098631a' },
  { chrom: '14', size: '73.05 GiB', md5: '4f64febf0879ddb336b993b1b2191f70' },
  { chrom: '15', size: '68.66 GiB', md5: '1818549f4a5fee1728e0bb64e75e92a3' },
  { chrom: '16', size: '76.67 GiB', md5: '416b5f6d632081effb50cd0e917d0e8b' },
  { chrom: '17', size: '68.7 GiB', md5: 'af1046203e4601753ea07da8aa89b714' },
  { chrom: '18', size: '59.8 GiB', md5: '5152466a563c349f4cfce4c9296295ba' },
  { chrom: '19', size: '54.41 GiB', md5: '224d78be80b3a0c3b80d04def3e2d928' },
  { chrom: '20', size: '49.58 GiB', md5: 'ba8e3ccf52161810e3333168e8c9e9b1' },
  { chrom: '21', size: '32.89 GiB', md5: 'fb0ddba7d9c2d545bd9c9d925ff7cf32' },
  { chrom: '22', size: '35.73 GiB', md5: 'e67aa222cf9fb79d6e7a47c522418630' },
  { chrom: 'X', size: '95.51 GiB', md5: '096a6bb7f44ac80ecfaf74d1c303e490' },
  { chrom: 'Y', size: '2.29 GiB', md5: 'b8ea438878643f294d5c24c9b41d19fe' },
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
      The gnomAD v3.1.1 data set contains 76,156 whole genomes (and no exomes), all mapped to the
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
        <ListItem>
          <Link href="#v3-ancestry-classification">Ancestry classification</Link>
        </ListItem>
      </List>
    </section>

    <section>
      <SectionTitle id="v3-variants">Variants</SectionTitle>
      <p>
        <Badge level="info">Note</Badge> Find out what changed in the latest release in the{' '}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-03-gnomad-v3-1-1/">
          gnomAD v3.1.1 changelog
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
            path="/release/3.1.1/ht/genomes/gnomad.genomes.v3.1.1.sites.ht"
          />
        </ListItem>
        {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
          <ListItem key={chrom}>
            <IndexedFileDownloadLinks
              label={`chr${chrom} sites VCF`}
              path={`/release/3.1.1/vcf/genomes/gnomad.genomes.v3.1.1.sites.chr${chrom}.vcf.bgz`}
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
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2020-10-gnomad-v3-1-new-content-methods-annotations-and-data-availability/#the-gnomad-hgdp-and-1000-genomes-callset">
          gnomAD v3.1 blog post
        </ExternalLink>{' '}
        for more information.
      </p>

      <p>
        <Badge level="error">Warning</Badge> We have identified an issue in gnomAD v3.1 where some
        variants are missing VEP annotations. This affects both v3.1 Hail Tables and VCFs. We are
        working to resolve this issue.
      </p>

      <h3>Genomes</h3>
      <FileList>
        <ListItem>
          <GetUrlButtons
            label="Hail MatrixTable"
            path="/release/3.1/mt/genomes/gnomad.genomes.v3.1.hgdp_1kg_subset_dense.mt"
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
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2020-11-gnomad-v3-1-mitochondrial-dna-variants/">
          gnomAD v3.1 Mitochondrial DNA Variants blog post
        </ExternalLink>
        .
      </p>
      <FileList>
        <ListItem>
          <GetUrlButtons
            label="chrM sites Hail Table"
            path="/release/3.1/ht/genomes/gnomad.genomes.v3.1.sites.chrM.ht"
            gcsBucket="gnomad-public-requester-pays"
          />
        </ListItem>
        <ListItem>
          <IndexedFileDownloadLinks
            label="chrM sites VCF"
            path="/release/3.1/vcf/genomes/gnomad.genomes.v3.1.sites.chrM.vcf.bgz"
            size="4.77 MiB"
            md5="fbdf6807628c13b5379b359f12a39c61"
            includeGCP={false}
          />
        </ListItem>
        <ListItem>
          <GetUrlButtons
            label="chrM coverage Hail Table"
            path="/release/3.1/coverage/genomes/gnomad.genomes.v3.1.chrM.coverage.ht"
            gcsBucket="gnomad-public-requester-pays"
          />
        </ListItem>
        <ListItem>
          <GenericDownloadLinks
            label="chrM sites TSV (reduced annotations)"
            path="/release/3.1/vcf/genomes/gnomad.genomes.v3.1.sites.chrM.reduced_annotations.tsv"
            size="1 MiB"
            md5="45a91b22ddc3c1176c103d4afee080f5"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="v3-ancestry-classification">Ancestry classification</SectionTitle>
      <p>
        For more information about these files, see our blog post on{' '}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-09-using-the-gnomad-ancestry-principal-components-analysis-loadings-and-random-forest-classifier-on-your-dataset/">
          using the gnomAD ancestry principal components analysis loadings and random forest
          classifier on your dataset
        </ExternalLink>
        .
      </p>

      <FileList>
        <ListItem>
          <GetUrlButtons
            label="Principal component analysis (PCA) variant loadings"
            path="/release/3.1/pca/gnomad.v3.1.pca_loadings.ht"
            gcsBucket="gnomad-public-requester-pays"
            includeAWS={false}
            includeAzure={false}
          />
        </ListItem>
        <ListItem>
          <GetUrlButtons
            label="Random forest (RF) model"
            path="/release/3.1/pca/gnomad.v3.1.RF_fit.pkl"
            gcsBucket="gnomad-public-requester-pays"
            includeAWS={false}
            includeAzure={false}
          />
        </ListItem>
      </FileList>
    </section>
  </React.Fragment>
)
