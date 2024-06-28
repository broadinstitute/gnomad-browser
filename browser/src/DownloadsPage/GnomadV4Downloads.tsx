import React from 'react'

import { ExternalLink, ListItem } from '@gnomad/ui'

import {
  Column,
  ColumnsWrapper,
  DownloadLinks,
  DownloadsSection,
  FileList,
  GetUrlButtons,
  SectionTitle,
  StyledParagraph,
} from './downloadsPageStyles'
import Link from '../Link'

const exomeChromosomeVcfs = [
  { chrom: '1', size: '17.5 GiB', md5: '848be4d85c953bc73a8e4f0c97026a72' },
  { chrom: '2', size: '13.3 GiB', md5: 'e2f5d891a3374e88d1c3136f94bed0ea' },
  { chrom: '3', size: '10.79 GiB', md5: 'a35b949b32453b4b5abd7b1de42e298a' },
  { chrom: '4', size: '7.18 GiB', md5: 'c7c7008a73acbb8fea68b82951842832' },
  { chrom: '5', size: '7.91 GiB', md5: 'c1016f56be62deb2e947fed4d31302dd' },
  { chrom: '6', size: '8.5 GiB', md5: 'f96bc8711ed085d63b8bd5396664adbc' },
  { chrom: '7', size: '9.01 GiB', md5: 'c41cd52571b001cf7d3e388a668e4dff' },
  { chrom: '8', size: '6.78 GiB', md5: 'a47777fe141c01876cb170f2c2f2e6b6' },
  { chrom: '9', size: '7.49 GiB', md5: 'c5abd4d8aff12f2bf8b4ec844769782f' },
  { chrom: '10', size: '7.32 GiB', md5: '4befc8dc50ead888e8af24f556c9fdd6' },
  { chrom: '11', size: '10.84 GiB', md5: '3833ce3ab046afe92c9b55df93a61ec8' },
  { chrom: '12', size: '9.9 GiB', md5: 'e530a9ed203cdcc914621ab7430774bb' },
  { chrom: '13', size: '3.3 GiB', md5: 'af1eab40c8be47c8c7c04dc73e0333e4' },
  { chrom: '14', size: '6.21 GiB', md5: 'd0e0fa71d94bf016a061ba4dc0bd869f' },
  { chrom: '15', size: '6.87 GiB', md5: '01b116e34b3815cfd1d3afa53a29a41b' },
  { chrom: '16', size: '9.1 GiB', md5: '44137843b2df39c8a654427181bda919' },
  { chrom: '17', size: '11.19 GiB', md5: 'c61978218ab3eaa07b571eb9959f39d2' },
  { chrom: '18', size: '3.16 GiB', md5: '1ec708d5cae9657ccee0626763ed9946' },
  { chrom: '19', size: '11.75 GiB', md5: '50a37cfa9a9a3e030388bcf15bdabb79' },
  { chrom: '20', size: '4.43 GiB', md5: '605680cd99e469bdf5f0045bd22359c9' },
  { chrom: '21', size: '2.1 GiB', md5: '7ca6d51a42425b857eddb46d7bc5832d' },
  { chrom: '22', size: '4.71 GiB', md5: 'dcf191563e69054a71bd4dc77862799a' },
  { chrom: 'X', size: '5.35 GiB', md5: '5b7b17d3d4cff22c20480a908c861a28' },
  { chrom: 'Y', size: '108.3 MiB', md5: 'd500cf5a73c53f02d1b95f1e092f2e49' },
]

const genomeChromosomeVcfs = [
  { chrom: '1', size: '41.05 GiB', md5: '328b4578212afec2cde394a1b02d544f' },
  { chrom: '2', size: '43.36 GiB', md5: '518ca01e6757a68bc0abe76f85af644d' },
  { chrom: '3', size: '36.56 GiB', md5: '716c181431a3c11a2eb18c5f50a3542d' },
  { chrom: '4', size: '33.56 GiB', md5: 'd9b913f3e30c8f410f9ce7dee5dee6d4' },
  { chrom: '5', size: '30.46 GiB', md5: 'a2a3b9014af5c8f9bbaaf743968e48f8' },
  { chrom: '6', size: '29.61 GiB', md5: 'e65c2aa321c5e272548fb3d901bae382' },
  { chrom: '7', size: '29.1 GiB', md5: '58ee22cf3dcc8cb8b493d218e19432cc' },
  { chrom: '8', size: '27.28 GiB', md5: '9854d9df22977cf5bac0f9fc05f4e8f5' },
  { chrom: '9', size: '23.06 GiB', md5: '6adfc9c47000cf66d1305392051b391d' },
  { chrom: '10', size: '25.0 GiB', md5: 'c2cd760130d2339f7135fc70700db1e1' },
  { chrom: '11', size: '24.58 GiB', md5: 'd1e7a4dcf3ff62eeffca57afefc5a33a' },
  { chrom: '12', size: '24.17 GiB', md5: '644bdbc5c53d9112edbacad401a28d1a' },
  { chrom: '13', size: '15.93 GiB', md5: '84b12f299210d2a7e390c56a234b7b68' },
  { chrom: '14', size: '16.63 GiB', md5: '0e524b414faf5a51b74d153939b3ddcd' },
  { chrom: '15', size: '15.74 GiB', md5: '00d1386eadbfcb653eb810a6c08ed250' },
  { chrom: '16', size: '17.62 GiB', md5: '2b106c12ca8cca9bd58e98d2c248ef4d' },
  { chrom: '17', size: '16.22 GiB', md5: '9d58b459e75312b487c660666ea540c4' },
  { chrom: '18', size: '13.44 GiB', md5: 'b95d30a6f5a45242d834fc7351afd760' },
  { chrom: '19', size: '12.74 GiB', md5: '73fa1c7c09072e8ca5e26a1443f0af2a' },
  { chrom: '20', size: '11.03 GiB', md5: '6c6f326c67b288ec99932905da72c1e6' },
  { chrom: '21', size: '7.23 GiB', md5: '9b6584cfe62f6e8bd0c3cea90a4ce56a' },
  { chrom: '22', size: '8.13 GiB', md5: 'a7bcf712a6b8d29e690468bf1dd8913d' },
  { chrom: 'X', size: '21.34 GiB', md5: '8b91766906865b0795c653af51cb73b8' },
  { chrom: 'Y', size: '571.35 MiB', md5: '1ffb9c683674f41ff7cf524e5bb56bb8' },
]

const jointChromosomeVcfs = [
  { chrom: '1', size: '67.11 GiB', md5: '11c62331b0a654fce6a9cd43838de648' },
  { chrom: '2', size: '64.64 GiB', md5: '563a8fe6f148621169b0215ac9f19602' },
  { chrom: '3', size: '52.28 GiB', md5: 'c44f1661bafc15685f1eee593b4886ea' },
  { chrom: '4', size: '48.04 GiB', md5: 'e6d438b84539c6adad5bc67d6febb33b' },
  { chrom: '5', size: '46.04 GiB', md5: 'd226db0e0055b5e87e72f4b63158664a' },
  { chrom: '6', size: '44.57 GiB', md5: '2820f13a2439ebbdf55066a0c320cdb5' },
  { chrom: '7', size: '44.26 GiB', md5: 'd1d50e4fa082246a5787eee76c036189' },
  { chrom: '8', size: '39.26 GiB', md5: '195f2825e94c9b5e43b34bb2b1ab5c7b' },
  { chrom: '9', size: '35.19 GiB', md5: '1c739fb01fd9de816e3fddc958668627' },
  { chrom: '10', size: '36.48 GiB', md5: 'e2f174f150b5d709d5d7349ac241c438' },
  { chrom: '11', size: '39.79 GiB', md5: 'b8651f2e5a0aafa23d7fc3406b35bc69' },
  { chrom: '12', size: '38.53 GiB', md5: '62795bafd326eae566ef49781a26bc91' },
  { chrom: '13', size: '23.84 GiB', md5: '92244327bee6d45973f6077a8134ccd9' },
  { chrom: '14', size: '25.82 GiB', md5: 'f7a8344b03a4162cb71cdb628dd1e15b' },
  { chrom: '15', size: '25.58 GiB', md5: '40c8ab829f973688d2ef891ce5acabb7' },
  { chrom: '16', size: '29.46 GiB', md5: '58a5f920fc191b2069126c41278cc077' },
  { chrom: '17', size: '29.64 GiB', md5: 'aa48657f45d8db7711c69fbf71a25cdc' },
  { chrom: '18', size: '19.08 GiB', md5: '80dd729bc61be464c964d3a3bfb0f41a' },
  { chrom: '19', size: '27.07 GiB', md5: '1853ca4993ceb25bd6f3a4554173f7cf' },
  { chrom: '20', size: '18.11 GiB', md5: '09263d3c29b822760c61607c6398f5c4' },
  { chrom: '21', size: '11.03 GiB', md5: '2ec2d9876d61fc9c5b1e84ab6841b62e' },
  { chrom: '22', size: '14.57 GiB', md5: 'df15a5ea8ae2e3090eae112f548c74ef' },
  { chrom: 'X', size: '35.49 GiB', md5: 'a5288ced0c2fe893fcfae4d2022b9cd9' },
  { chrom: 'Y', size: '777.46 MiB', md5: '7b882f00919d582139acbc116a7a559f' },
]

const GnomadV4Downloads = () => {
  return (
    <>
      <SectionTitle id="v4" theme={{ type: 'release' }}>
        v4 Downloads
      </SectionTitle>
      <StyledParagraph>
        The gnomAD v4.1.0 data set contains data from 730,947 exomes and 76,215 whole genomes, all
        mapped to the GRCh38 reference sequence.
      </StyledParagraph>

      <SectionTitle id="v4-core-dataset" theme={{ type: 'datasets' }}>
        Core Dataset
      </SectionTitle>
      <StyledParagraph>
        gnomAD database and features created and maintained by the gnomAD production team.
      </StyledParagraph>

      <DownloadsSection>
        <SectionTitle id="v4-variants">Variants</SectionTitle>
        <p>
          For more information, read the{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://gnomad.broadinstitute.org/news/2023-11-gnomad-v4-0">
            gnomAD v4.0.0 blog post
          </ExternalLink>{' '}
          and the{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://gnomad.broadinstitute.org/news/2024-04-gnomad-v4-1">
            gnomAD v4.1.0 blog post
          </ExternalLink>
          .
        </p>
        <ColumnsWrapper>
          <Column>
            <h3>Exomes</h3>
            <FileList>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>
                <GetUrlButtons
                  label="Sites Hail Table"
                  path="/release/4.1/ht/exomes/gnomad.exomes.v4.1.sites.ht"
                />
              </ListItem>
              {exomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                <ListItem key={chrom}>
                  <DownloadLinks
                    label={`chr${chrom} sites VCF`}
                    path={`/release/4.1/vcf/exomes/gnomad.exomes.v4.1.sites.chr${chrom}.vcf.bgz`}
                    size={size}
                    md5={md5}
                    associatedFileType="TBI"
                  />
                </ListItem>
              ))}
            </FileList>
          </Column>

          <Column>
            <h3>Genomes</h3>
            <FileList>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>
                <GetUrlButtons
                  label="Sites Hail Table"
                  path="/release/4.1/ht/genomes/gnomad.genomes.v4.1.sites.ht/"
                />
              </ListItem>
              {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                <ListItem key={chrom}>
                  <DownloadLinks
                    label={`chr${chrom} sites VCF`}
                    path={`/release/4.1/vcf/genomes/gnomad.genomes.v4.1.sites.chr${chrom}.vcf.bgz`}
                    size={size}
                    md5={md5}
                    associatedFileType="TBI"
                  />
                </ListItem>
              ))}
            </FileList>
          </Column>
        </ColumnsWrapper>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-joint-freq-stats">Joint Frequency</SectionTitle>
        <FileList>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GetUrlButtons
              label="Joint sites Hail Table"
              path="/release/4.1/ht/joint/gnomad.joint.v4.1.sites.ht"
            />
          </ListItem>
          {jointChromosomeVcfs.map(({ chrom, size, md5 }) => (
            // @ts-expect-error TS(2769) FIXME: No overload matches this call.
            <ListItem key={chrom}>
              <DownloadLinks
                label={`chr${chrom} sites VCF`}
                path={`/release/4.1/vcf/joint/gnomad.joint.v4.1.sites.chr${chrom}.vcf.bgz`}
                size={size}
                md5={md5}
                associatedFileType="TBI"
              />
            </ListItem>
          ))}
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-all-sites-allele-number">All sites allele numbers</SectionTitle>
        <ColumnsWrapper>
          <Column>
            <h3>Exomes</h3>
            <FileList>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>
                <GetUrlButtons
                  label="Exomes all site allele number Hail Table"
                  path="/release/4.1/ht/exomes/gnomad.exomes.v4.1.allele_number_all_sites.ht"
                />
              </ListItem>

              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>
                <DownloadLinks
                  label="Exomes all site allele number TSV"
                  path="/release/4.1/tsv/exomes/gnomad.exomes.v4.1.allele_number_all_sites.tsv.bgz"
                  md5="ee71ce1ccfa5c1d9dd86e1ee1b1d11e2"
                  size="1.07 GiB"
                />
              </ListItem>
            </FileList>
          </Column>

          <Column>
            <h3>Genomes</h3>
            <FileList>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>
                <GetUrlButtons
                  label="Genomes all site allele number Hail Table"
                  path="/release/4.1/ht/genomes/gnomad.genomes.v4.1.allele_number_all_sites.ht"
                />
              </ListItem>

              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>
                <DownloadLinks
                  label="Genomes all site allele number TSV"
                  path="/release/4.1/tsv/genomes/gnomad.genomes.v4.1.allele_number_all_sites.tsv.bgz"
                  md5="7101516dd79d48d10c28fa548b22884a"
                  size="11.19 GiB"
                />
              </ListItem>
            </FileList>
          </Column>
        </ColumnsWrapper>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-coverage">Coverage</SectionTitle>
        <FileList>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GetUrlButtons
              label="Exome coverage Hail Table"
              path="/release/4.0/coverage/exomes/gnomad.exomes.v4.0.coverage.ht"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Exome coverage summary TSV"
              path="/release/4.0/coverage/exomes/gnomad.exomes.v4.0.coverage.summary.tsv.bgz"
              size="3.77 GiB"
              md5="a6955332c9cccae7efb9c95581282a73"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-genetic-ancestry-group-classification">
          Genetic ancestry group classification
        </SectionTitle>
        <p>
          For more information about these files, see our blog post on{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-09-using-the-gnomad-ancestry-principal-components-analysis-loadings-and-random-forest-classifier-on-your-dataset/">
            using the gnomAD genetic ancestry group principal components analysis loadings and
            random forest classifier on your dataset
          </ExternalLink>
          .
        </p>
        <FileList>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GetUrlButtons
              label="Principal component analysis (PCA) variant loadings"
              path="/release/4.0/pca/gnomad.v4.0.pca_loadings.ht"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Random forest (RF) .pkl model"
              path="/release/4.0/pca/gnomad.v4.0.RF_fit.pkl"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Random forest (RF) .onnx model"
              path="/release/4.0/pca/gnomad.v4.0.RF_fit.onnx"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-constraint">Constraint</SectionTitle>
        <p>
          For information on constraint, see our <Link to="/help/constraint">help text</Link>
        </p>
        <FileList>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks label="README" path="/release/4.1/constraint/README.txt" />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GetUrlButtons
              label="Constraint metrics Hail Table"
              path="/release/4.1/constraint/gnomad.v4.1.constraint_metrics.ht"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Constraint metrics TSV"
              path="/release/4.1/constraint/gnomad.v4.1.constraint_metrics.tsv"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-structural-variants">Structural variants</SectionTitle>
        <p>
          For information on structural variants, see our{' '}
          <Link to="/help/sv-overview">help text</Link>
        </p>
        <FileList>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Genome SV VCF"
              path="/release/4.1/genome_sv/gnomad.v4.1.sv.sites.vcf.gz"
              size="1.62 GiB"
              md5="3ee614951c2f0c36659842876f7ce0ba"
              associatedFileType="TBI"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Genome SV non neuro controls VCF"
              path="/release/4.1/genome_sv/gnomad.v4.1.sv.non_neuro_controls.sites.vcf.gz"
              size="3.19 GiB"
              md5="442b43a740f7f12f1f9b054f9d09b530"
              associatedFileType="TBI"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Genome SV BED"
              path="/release/4.1/genome_sv/gnomad.v4.1.sv.sites.bed.gz"
              size="1.26 GiB"
              md5="a898e3e37aacfdb1e4d6218d5479683a"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Genome SV non neuro controls BED"
              path="/release/4.1/genome_sv/gnomad.v4.1.sv.non_neuro_controls.sites.bed.gz"
              size="1.95 GiB"
              md5="42cc0071d81dd8ae0492a53a462e8c33"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-copy-number-variants">Copy number variants</SectionTitle>
        <p>
          For information on copy number variants, see our{' '}
          <Link to="/help/sv-overview">help text</Link>
        </p>
        <FileList>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Exome CNV VCF"
              path="/release/4.1/exome_cnv/gnomad.v4.1.cnv.all.vcf.gz"
              size="8.5 MiB"
              md5="74000fc29d0b9bc547859cfc2ba4ac84"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Exome CNV non neuro VCF"
              path="/release/4.1/exome_cnv/gnomad.v4.1.cnv.non_neuro.vcf.gz"
              size="7.9 MiB"
              md5="e2976db50823d608f2cf2fb8077f0ddd"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Exome CNV non neuro controls VCF"
              path="/release/4.1/exome_cnv/gnomad.v4.1.cnv.non_neuro_controls.vcf.gz"
              size="5.32 MiB"
              md5="10e6b0d9585d79d9620c40c96c257e4c"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-resources">Resources</SectionTitle>
        <FileList>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Exome sex ploidy cutoffs TSV"
              path="/release/4.0/sex_inference/gnomad.exomes.v4.0.sample_qc.sex_inference.ploidy_cutoffs.tsv"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GetUrlButtons
              label="Exome calling intervals Hail Table"
              path="/resources/grch38/intervals/ukb.pad50.broad.pad50.union.interval_list.ht"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Exome calling intervals flat file"
              path="/resources/grch38/intervals/ukb.pad50.broad.pad50.union.intervals"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="REVEL v4.1 README"
              path="/release/4.1/tsv/revel_for_2414_unmatched_transcripts_README.md"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Exomes REVEL supplementary TSV"
              path="/release/4.1/tsv/exomes/gnomad.v4.1.exomes.revel_for_2414_unmatched_transcripts.tsv.bgz"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <DownloadLinks
              label="Genomes REVEL supplementary TSV"
              path="/release/4.1/tsv/genomes/gnomad.v4.1.genomes.revel_for_2414_unmatched_transcripts.tsv.bgz"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>
    </>
  )
}

export default GnomadV4Downloads
