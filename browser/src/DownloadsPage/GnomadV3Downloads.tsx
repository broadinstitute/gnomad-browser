import React from 'react'

import { Badge, ExternalLink, Link as StyledLink, ListItem } from '@gnomad/ui'

import Link from '../Link'

import {
  DownloadLinks,
  DownloadsSection,
  FileList,
  GetUrlButtons,
  SectionTitle,
  StyledParagraph,
} from './downloadsPageStyles'

const genomeChromosomeVcfs = [
  { chrom: '1', size: '182.01 GiB', md5: '65b21b95252786012721de95458a90e3' },
  { chrom: '2', size: '193.31 GiB', md5: '6ad213299e21959d7b91787928d6f8b5' },
  { chrom: '3', size: '158.78 GiB', md5: '13e380299b1cb61d2d18a45a522e8810' },
  { chrom: '4', size: '152.11 GiB', md5: '90021c65fa7dabfed1a404b713db503f' },
  { chrom: '5', size: '140.43 GiB', md5: 'fc17883bc83787524b7872ba3002a05f' },
  { chrom: '6', size: '133.43 GiB', md5: '3f1a3910c97e3625fe12962d2ed69a9a' },
  { chrom: '7', size: '130.4 GiB', md5: '98fa44053cf0f907b9ae52ac461bb717' },
  { chrom: '8', size: '122.3 GiB', md5: '5ac0337761d358832aa4adb041d1c3b7' },
  { chrom: '9', size: '103.13 GiB', md5: '1a6fcfc564cd1d8e58db3e330b743303' },
  { chrom: '10', size: '109.82 GiB', md5: 'f84d74e58e9eb568bdfe349e6daa2645' },
  { chrom: '11', size: '108.34 GiB', md5: '843ec265623593200dd64d56a5a045b3' },
  { chrom: '12', size: '106.21 GiB', md5: '31f76395874ec62a7998e9fb3b2850a1' },
  { chrom: '13', size: '74.87 GiB', md5: '78a27d411d3512dbbc6eb4b120391cb8' },
  { chrom: '14', size: '73.11 GiB', md5: 'e8273eef9760aac6ad9f799a52082d5d' },
  { chrom: '15', size: '68.73 GiB', md5: '89d6cd19e5c7621f627fab6577cd0e87' },
  { chrom: '16', size: '76.75 GiB', md5: '33ef1541b49d0347d6141609a287bdc7' },
  { chrom: '17', size: '68.76 GiB', md5: 'd13b9287a89e11d8119a93bc0f094c77' },
  { chrom: '18', size: '59.86 GiB', md5: 'e95595ca7a90edc528a09b209ea9bc4c' },
  { chrom: '19', size: '54.47 GiB', md5: '32308281570563a5bc71a815ac11154f' },
  { chrom: '20', size: '49.63 GiB', md5: '5cb14ed936340875c8ef664dbe6e772d' },
  { chrom: '21', size: '32.92 GiB', md5: '92c4b4f1bd63a7bd64ac8378d88d86e2' },
  { chrom: '22', size: '35.77 GiB', md5: '35f4d25b924ab2e9520c725dd9699ee5' },
  { chrom: 'X', size: '95.6 GiB', md5: '040080a18046533728fa60800eedcf4b' },
  { chrom: 'Y', size: '2.29 GiB', md5: '112ed724f8d1cf13b031006def03f55e' },
]

const hgdpAnd1kgChromosomeVcfs = [
  { chrom: '1', size: '260.95 GiB', md5: '66b515f3bc2f54ec01c974b359f93686' },
  { chrom: '2', size: '274.93 GiB', md5: '3dcfa0a6eaf1b322422620c35e302ab0' },
  { chrom: '3', size: '224.56 GiB', md5: 'f7911776bef12fae38c2c7ff477893be' },
  { chrom: '4', size: '222.16 GiB', md5: '26d97a4da3b7b0ffce4f42c37ede10fd' },
  { chrom: '5', size: '202.47 GiB', md5: '4b1e3553262b8077b50940c953c8e00f' },
  { chrom: '6', size: '193.78 GiB', md5: 'eb9b309051b2f059500056cec856b220' },
  { chrom: '7', size: '189.71 GiB', md5: 'e18af68af38a91c523d1de6b4e390579' },
  { chrom: '8', size: '175.21 GiB', md5: '35fbd4be95c70ab4683005ef58734535' },
  { chrom: '9', size: '148.36 GiB', md5: '26d0842911a0a42d470e766a9d44741a' },
  { chrom: '10', size: '160.43 GiB', md5: 'f8d79f3ac86d8b50c89a330e1b3f7989' },
  { chrom: '11', size: '154.64 GiB', md5: 'fbbe9b8042105e791e5906c69af5166d' },
  { chrom: '12', size: '152.53 GiB', md5: '52f20182eeb07782663bd2615789c55c' },
  { chrom: '13', size: '110.43 GiB', md5: '3c69f708ffcf7e44927ff4c08d4c66f7' },
  { chrom: '14', size: '106.29 GiB', md5: 'd493751b424c20a0a2a298ba369b1e96' },
  { chrom: '15', size: '98.83 GiB', md5: 'ff2e043db7bb1643dfafd0a21a41ec59' },
  { chrom: '16', size: '110.94 GiB', md5: '9bc8a00d6faf1c349992e34c22168a2d' },
  { chrom: '17', size: '100.7 GiB', md5: '840b73079d2de44bf3f0b0f03c84c173' },
  { chrom: '18', size: '86.69 GiB', md5: '55010a092c0246295eefed8a5c275b62' },
  { chrom: '19', size: '82.66 GiB', md5: 'a807d07199e3218bc5a330ad13beebd2' },
  { chrom: '20', size: '74.09 GiB', md5: '7b4bedc5cbeaea2271ebda41a290350b' },
  { chrom: '21', size: '51.26 GiB', md5: '13f97437754916a293a0900c4993e358' },
  { chrom: '22', size: '55.38 GiB', md5: 'eb04c341491a1553cb020bb0d2a4cf36' },
  { chrom: 'X', size: '136.42 GiB', md5: 'b20924dca26a6ab12a3d7ee61e88ad92' },
  { chrom: 'Y', size: '8.42 GiB', md5: '407654bf8a3914582ee472762e0d2d11' },
]

const GnomadV3Downloads = () => (
  <>
    <SectionTitle id="v3" theme={{ type: 'release' }}>
      v3 Downloads
    </SectionTitle>
    <StyledParagraph>
      The gnomAD v3.1.2 data set contains 76,156 whole genomes (and no exomes), all mapped to the
      GRCh38 reference sequence.
    </StyledParagraph>

    <SectionTitle id="v3-core-dataset" theme={{ type: 'datasets' }}>
      Core Dataset
    </SectionTitle>
    <StyledParagraph>
      gnomAD database and features created and maintained by the gnomAD production team.
    </StyledParagraph>

    <DownloadsSection>
      <SectionTitle id="v3-variants">Variants</SectionTitle>
      <p>
        <Badge level="info">Note</Badge> Find out what changed in the latest release in the{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-10-gnomad-v3-1-2-minor-release/">
          gnomAD v3.1.2 blog post
        </ExternalLink>
        .
      </p>
      <p>
        The variant dataset files below contain all subsets (non-cancer, non-neuro, non-v2,
        non-TOPMed, controls/biobanks, 1KG, and HGDP).
      </p>

      <h3>Genomes</h3>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Sites Hail Table"
            path="/release/3.1.2/ht/genomes/gnomad.genomes.v3.1.2.sites.ht"
          />
        </ListItem>
        {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          <ListItem key={chrom}>
            <DownloadLinks
              label={`chr${chrom} sites VCF`}
              path={`/release/3.1.2/vcf/genomes/gnomad.genomes.v3.1.2.sites.chr${chrom}.vcf.bgz`}
              size={size}
              md5={md5}
              associatedFileType="TBI"
            />
          </ListItem>
        ))}
      </FileList>
    </DownloadsSection>

    <DownloadsSection>
      <SectionTitle id="v3-coverage">Coverage</SectionTitle>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Genome coverage Hail Table"
            path="/release/3.0.1/coverage/genomes/gnomad.genomes.r3.0.1.coverage.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Genome coverage summary TSV"
            path="/release/3.0.1/coverage/genomes/gnomad.genomes.r3.0.1.coverage.summary.tsv.bgz"
            size="75.38 GiB"
            md5="6c809627ff7922dcfc8d2c67bba017ff"
          />
        </ListItem>
      </FileList>
    </DownloadsSection>

    <DownloadsSection>
      <SectionTitle id="v3-hgdp-1kg">HGDP + 1KG callset</SectionTitle>
      <p>
        These files contain individual genotypes for all samples in the HGDP and 1KG subsets. For
        more information, see the{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-10-gnomad-v3-1-2-minor-release/">
          gnomAD v3.1.2 blog post
        </ExternalLink>{' '}
        and the{' '}
        <Link to="/help/hgdp-1kg-annotations">
          HGDP + 1KG dense MatrixTable annotation descriptions
        </Link>
        .
      </p>

      <h3>Genomes</h3>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Dense Hail MatrixTable"
            path="/release/3.1.2/mt/genomes/gnomad.genomes.v3.1.2.hgdp_1kg_subset_dense.mt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Sparse Hail MatrixTable"
            path="/release/3.1.2/mt/genomes/gnomad.genomes.v3.1.2.hgdp_1kg_subset_sparse.mt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Variant annotations Hail Table"
            path="/release/3.1.2/ht/genomes/gnomad.genomes.v3.1.2.hgdp_1kg_subset_variant_annotations.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Sample metadata Hail Table"
            path="/release/3.1.2/ht/genomes/gnomad.genomes.v3.1.2.hgdp_1kg_subset_sample_meta.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Sample metadata TSV"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/metadata_and_qc/gnomad_meta_updated.tsv"
          />
        </ListItem>
        {hgdpAnd1kgChromosomeVcfs.map(({ chrom, size, md5 }) => (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          <ListItem key={chrom}>
            <DownloadLinks
              label={`chr${chrom} VCF`}
              path={`/release/3.1.2/vcf/genomes/gnomad.genomes.v3.1.2.hgdp_tgp.chr${chrom}.vcf.bgz`}
              size={size}
              md5={md5}
              associatedFileType="TBI"
            />
          </ListItem>
        ))}
      </FileList>
    </DownloadsSection>

    <DownloadsSection>
      <SectionTitle id="v3-mitochondrial-dna">Mitochondrial DNA (mtDNA)</SectionTitle>
      <p>
        For details about these files, see the{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2020-11-gnomad-v3-1-mitochondrial-dna-variants/">
          gnomAD v3.1 Mitochondrial DNA Variants blog post
        </ExternalLink>
        .
      </p>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="chrM sites Hail Table"
            path="/release/3.1/ht/genomes/gnomad.genomes.v3.1.sites.chrM.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="chrM sites VCF"
            path="/release/3.1/vcf/genomes/gnomad.genomes.v3.1.sites.chrM.vcf.bgz"
            size="4.77 MiB"
            md5="d0ef2bd882ae44236897d743cb5528cf"
            associatedFileType="TBI"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="chrM coverage Hail Table"
            path="/release/3.1/coverage/genomes/gnomad.genomes.v3.1.chrM.coverage.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="chrM sites TSV (reduced annotations)"
            path="/release/3.1/vcf/genomes/gnomad.genomes.v3.1.sites.chrM.reduced_annotations.tsv"
            size="1 MiB"
            md5="45a91b22ddc3c1176c103d4afee080f5"
          />
        </ListItem>
      </FileList>
    </DownloadsSection>

    <DownloadsSection>
      <SectionTitle id="v3-ancestry-classification">
        Genetic ancestry group classification
      </SectionTitle>
      <p>
        For more information about these files, see our blog post on{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-09-using-the-gnomad-ancestry-principal-components-analysis-loadings-and-random-forest-classifier-on-your-dataset/">
          using the gnomAD genetic ancestry group principal components analysis loadings and random
          forest classifier on your dataset
        </ExternalLink>
        .
      </p>

      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Principal component analysis (PCA) variant loadings"
            path="/release/3.1/pca/gnomad.v3.1.pca_loadings.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Random forest (RF) model"
            path="/release/3.1/pca/gnomad.v3.1.RF_fit.onnx"
          />
        </ListItem>
      </FileList>
    </DownloadsSection>

    <DownloadsSection>
      <SectionTitle id="v3-local-ancestry">Local ancestry</SectionTitle>
      <p>
        For more information about these files, see our blog post on{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-12-local-ancestry-inference-for-latino-admixed-american-samples-in-gnomad/">
          local ancestry inference for Latino/Admixed American samples in gnomAD
        </ExternalLink>
        .
      </p>

      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Sites VCF"
            path="/release/3.1/local_ancestry/genomes/gnomad.genomes.v3.1.local_ancestry.amr.vcf.bgz"
          />
        </ListItem>
      </FileList>
    </DownloadsSection>

    <DownloadsSection>
      <SectionTitle id="v3-short-tandem-repeats">Short tandem repeats</SectionTitle>
      <p>
        For more information about these files, see our blog post on{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2022-01-the-addition-of-short-tandem-repeat-calls-to-gnomad/">
          the addition of short tandem repeat calls to gnomAD
        </ExternalLink>
        .
      </p>

      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks label="README" path="/release/3.1.3/tsv/README.txt" />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Genotypes (TSV)"
            path="/release/3.1.3/tsv/gnomAD_STR_genotypes__2022_01_20.tsv.gz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Distributions (JSON)"
            path="/release/3.1.3/json/gnomAD_STR_distributions__2022_01_20.json.gz"
          />
        </ListItem>
      </FileList>
    </DownloadsSection>

    <SectionTitle id="v3-secondary-analyses" theme={{ type: 'datasets' }}>
      Secondary Analyses
    </SectionTitle>
    <StyledParagraph>
      Additional research analyses created using the core gnomAD releases in collaboration with
      members of the gnomAD steering committee.
    </StyledParagraph>

    <DownloadsSection>
      <SectionTitle id="v3-genomic-constraint">Genomic constraint</SectionTitle>
      <p>For more information about these files, see the README included in the download.</p>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="README"
            path="/release/3.1/secondary_analyses/genomic_constraint/nc_constraint_gnomad_v31_README.docx"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Raw genomic constraint by 1kb regions"
            path="/release/3.1/secondary_analyses/genomic_constraint/constraint_z_genome_1kb.raw.download.txt.gz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="QCed genomic constraint by 1kb regions"
            path="/release/3.1/secondary_analyses/genomic_constraint/constraint_z_genome_1kb.qc.download.txt.gz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Non-coding constraint for gene tissue enhancers"
            path="/release/3.1/secondary_analyses/genomic_constraint/constraint_z_enh_gene_roadmaplinks.all.download.txt.gz"
          />
        </ListItem>
      </FileList>
    </DownloadsSection>

    <DownloadsSection>
      <SectionTitle id="v3-hgdp-1kg-tutorials">HGDP + 1KG tutorials</SectionTitle>
      <p>
        For more information about these files, see the {/* @ts-expect-error */}
        <ExternalLink href="https://docs.google.com/document/d/16W0KyrpRGRKHaOwahxtogtepbHe181BoOrSpTQVSVHc/edit?usp=sharing">
          README
        </ExternalLink>{' '}
        and the {/* @ts-expect-error */}
        <ExternalLink href="https://docs.google.com/spreadsheets/d/179I6AUPOQ09jdsFbKcwcDQugFt4pmL-NNOD_3_rsidA/edit?usp=sharing">
          File Descriptions.
        </ExternalLink>
      </p>
      <p>
        <b>Please note:</b> while these files were generated from the{/* @ts-expect-error */}
        <StyledLink href="/downloads#v3-hgdp-1kg"> HGDP + 1KG callset</StyledLink> files above, the
        quality control steps may differ slightly. This would lead to minor differences in sample
        counts. See the tutorials for details.
      </p>

      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error */}
          <ExternalLink href="https://docs.google.com/document/d/16W0KyrpRGRKHaOwahxtogtepbHe181BoOrSpTQVSVHc/edit?usp=sharing">
            README
          </ExternalLink>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error */}
          <ExternalLink href="https://docs.google.com/spreadsheets/d/179I6AUPOQ09jdsFbKcwcDQugFt4pmL-NNOD_3_rsidA/edit?usp=sharing">
            File Descriptions
          </ExternalLink>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Dense Hail MatrixTable"
            path="/release/3.1.2/mt/genomes/gnomad.genomes.v3.1.2.hgdp_1kg_subset_dense.mt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Sample metadata TSV"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/metadata_and_qc/gnomad_meta_v1.tsv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Subset of the HGDP+1KG callset MatrixTable"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/pca_preprocessing/ld_pruned.mt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Related sample IDs Hail Table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/pca_preprocessing/related_sample_ids.ht"
          />
        </ListItem>

        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Principal component analysis (PCA) PC score tables GCS Bucket"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/pca/pc_scores_with_outliers/"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="PCA outliers table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/pca/pca_outliers.txt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="PCA PC score tables without outliers GCS Buckets"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/pca/pc_scores_without_outliers/"
          />
        </ListItem>

        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Variants and unrelated samples MatrixTable"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/pca_results/unrelateds_without_outliers.mt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Variants and related samples MatrixTable"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/pca_results/relateds_without_outliers.mt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Population-level statistical summary TSV"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/metadata_and_qc/post_qc_summary.tsv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Doubleton counts CSV"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/f2_fst/doubleton_count.csv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Variants and unrelated sample PLINK files - .bed"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/f2_fst/hgdp_tgp.bed"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Variants and unrelated sample PLINK files - .bim"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/f2_fst/hgdp_tgp.bim"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Variants and unrelated sample PLINK files - .fam"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/f2_fst/hgdp_tgp.fam"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Population-level mean fixation index table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/f2_fst/mean_fst.txt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Gambian Genome Variation Project MatrixTable"
            path="/release/3.1/secondary_analyses/hgdp_1kg/data_intersection/gambian_genomes_merged_gvcfs.mt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Principal component analysis (PCA) variant loadings Hail Table"
            path="/release/3.1/pca/gnomad.v3.1.pca_loadings.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Random forest (RF) model PKL"
            path="/release/3.1/pca/gnomad.v3.1.RF_fit.pkl"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="HGDP+1KG and GVV intersection Matrix Table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/data_intersection/hgdp_tgp_ggv_intersect.mt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Super population labels TSV"
            path="/release/3.1/secondary_analyses/hgdp_1kg/data_intersection/hgdp_1kg_sample_info.unrelateds.pca_outliers_removed.with_project.tsv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Phased haplotypes of HGDP+1KG dataset GCS Bucket"
            path="/resources/hgdp_1kg/phased_haplotypes_v2"
          />
        </ListItem>

        <h3>Pre-QC plotting tables</h3>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Pre-QC column fields Hail Table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/plot_datasets/pre_qc_plotting.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Pre-QC expected heterozygosity Hail Table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/plot_datasets/expected_hets_pre_qc.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Pre-QC actual heterozygosity Hail Table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/plot_datasets/actual_hets_pre_qc.ht"
          />
        </ListItem>

        <h3>Post-QC plotting tables</h3>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Post-QC column fields Hail Table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/plot_datasets/post_qc_plotting.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Post-QC expected heterozygosity Hail Table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/plot_datasets/expected_hets_post_qc.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Post-QC actual heterozygosity Hail Table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/plot_datasets/actual_hets_post_qc.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Post-QC site frequency spectrum table"
            path="/release/3.1/secondary_analyses/hgdp_1kg_v2/plot_datasets/sfs_post_qc.txt"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Phased haplotype ChrX PAR1"
            path="/resources/hgdp_1kg/phased_haplotypes_v2/hgdp1kgp_chrX_par1.shapeit5_common.bcf"
            associatedFileType="CSI"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Phased haplotype ChrX PAR2"
            path="/resources/hgdp_1kg/phased_haplotypes_v2/hgdp1kgp_chrX_par2.shapeit5_common.bcf"
            associatedFileType="CSI"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <DownloadLinks
            label="Phased haplotype ChrX Non-PAR"
            path="/resources/hgdp_1kg/phased_haplotypes_v2/hgdp1kgp_chrX_non_par.full.shapeit5_rare.bcf"
            associatedFileType="CSI"
          />
        </ListItem>
      </FileList>
    </DownloadsSection>
  </>
)

export default GnomadV3Downloads
