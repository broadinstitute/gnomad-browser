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
  { chrom: '1', size: '17.56 GiB', md5: '2e08659636b631c38dae62c79553bc65' },
  { chrom: '2', size: '13.35 GiB', md5: 'ec198762f8cb807ac6871de00c157dec' },
  { chrom: '3', size: '10.83 GiB', md5: 'aec7d7e4300b719e345fa69dfaf6538e' },
  { chrom: '4', size: '7.21 GiB', md5: 'fc436e1ae0de3d6fd134efd584959d8a' },
  { chrom: '5', size: '7.94 GiB', md5: 'd13df61b30bf5009565890be990727cf' },
  { chrom: '6', size: '8.54 GiB', md5: 'cdc8f1a61497cf5fc6b77e935c84e02c' },
  { chrom: '7', size: '9.04 GiB', md5: 'b12707e3fcf2b57193c9038153b3843b' },
  { chrom: '8', size: '6.8 GiB', md5: '5eeab891ab132801c9f8da1f4967c02f' },
  { chrom: '9', size: '7.52 GiB', md5: '4d2a672b96f7898ba41ace82b7f3b705' },
  { chrom: '10', size: '7.35 GiB', md5: '82779ca0a54f6906511c939199a975be' },
  { chrom: '11', size: '10.88 GiB', md5: 'c03170a93d0877bfd097f5979350ada3' },
  { chrom: '12', size: '9.94 GiB', md5: '375e39ff8f59f13eea20846ca8f47ee8' },
  { chrom: '13', size: '3.31 GiB', md5: '147de89a0b62789886aa8ba949dfac09' },
  { chrom: '14', size: '6.23 GiB', md5: '330dae70fc6c26031c02ab4f4d0e05b9' },
  { chrom: '15', size: '6.89 GiB', md5: '4ac058ec1ea74a523e4faf9f2082cb5f' },
  { chrom: '16', size: '9.14 GiB', md5: 'bc776c8cbf2352ed4eede17d6cbff567' },
  { chrom: '17', size: '11.23 GiB', md5: 'a929e8043e0719fecb4b72245cc2a490' },
  { chrom: '18', size: '3.17 GiB', md5: '71e0e6fc629e3f8dc7a0c6cadcd8b612' },
  { chrom: '19', size: '11.8 GiB', md5: 'bfffbc0986c81b2d08acf508502ce112' },
  { chrom: '20', size: '4.45 GiB', md5: '14f01ad046abd41d8ba542a38bead27b' },
  { chrom: '21', size: '2.1 GiB', md5: 'f8b112938d68ea61c9dcc4ba26e09ef1' },
  { chrom: '22', size: '4.73 GiB', md5: '4543f706701bc746bf291884fd277934' },
  { chrom: 'X', size: '5.43 GiB', md5: '7e1df7f412ae48b8f8a8a2c71df173b6' },
  { chrom: 'Y', size: '108.72 MiB', md5: 'd541c53ca6551434fbd55c3bdf3e2486' },
]

const genomeChromosomeVcfs = [
  { chrom: '1', size: '41.25 GiB', md5: '21939573565c47e54edaf3c8a9bf50f3' },
  { chrom: '2', size: '43.57 GiB', md5: '3211b86b12fa71c187914fc5161eb037' },
  { chrom: '3', size: '36.73 GiB', md5: '26bd6279907cf7d8c4af7d64ca2aaf51' },
  { chrom: '4', size: '33.71 GiB', md5: 'b34adf5d22bf3e4cef2ed7d90c7abff3' },
  { chrom: '5', size: '30.6 GiB', md5: '5e4669f942d647a3274bab54e729288e' },
  { chrom: '6', size: '29.74 GiB', md5: 'b78e1717d6b79101ae188ef5e587de84' },
  { chrom: '7', size: '29.24 GiB', md5: '2948b4e3fded433dcf59cf5d4e2e40e9' },
  { chrom: '8', size: '27.41 GiB', md5: '7e0f96ede0cab3d431bcb61bdd50b5bd' },
  { chrom: '9', size: '23.17 GiB', md5: '6683e973b5931fe30a059ea157644b07' },
  { chrom: '10', size: '25.12 GiB', md5: 'eafd6ae544ce6d2e54e103a8516e9dba' },
  { chrom: '11', size: '24.7 GiB', md5: 'c7d1ddeb1b2da2c74c3e0bdec91307f5' },
  { chrom: '12', size: '24.28 GiB', md5: '2c7adf6e982838fa692ce7716d55e17a' },
  { chrom: '13', size: '16.0 GiB', md5: 'de54f559704bf06abbc3f413ba561923' },
  { chrom: '14', size: '16.71 GiB', md5: '6471ff6deec38d5e04a9479fa9b587b8' },
  { chrom: '15', size: '15.82 GiB', md5: 'bb966d401f1b43954aeec2b55acce917' },
  { chrom: '16', size: '17.7 GiB', md5: '311fe5c98d585a7bcb03a5560bcb80b3' },
  { chrom: '17', size: '16.3 GiB', md5: '08776a899230bc9cadf8250da87aec4b' },
  { chrom: '18', size: '13.5 GiB', md5: 'a5afa2140f64c8ea45bd9caaad9d9559' },
  { chrom: '19', size: '12.8 GiB', md5: 'f5420e0cdce4e33a9644296b93313e3b' },
  { chrom: '20', size: '11.08 GiB', md5: '49f1f7ffc17d5c45aa5a5cd18731d2ff' },
  { chrom: '21', size: '7.26 GiB', md5: 'bd088f86e1924a9702c5ba5dc5e16053' },
  { chrom: '22', size: '8.17 GiB', md5: '8018e6e02b9bf7ec97c3367928c7e105' },
  { chrom: 'X', size: '21.36 GiB', md5: '2d0515434ddceef8a6d5e48199b76e91' },
  { chrom: 'Y', size: '573.63 MiB', md5: '853a50d5462b4bcf904b0ffd6f052baa' },
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
      <SectionTitle id="v4" subject="release">
        v4 Downloads
      </SectionTitle>
      <StyledParagraph>
        The gnomAD v4.1.0 data set contains data from 730,947 exomes and 76,215 whole genomes, all
        mapped to the GRCh38 reference sequence.
      </StyledParagraph>

      <SectionTitle id="v4-core-dataset" subject="datasets">
        Core Dataset
      </SectionTitle>
      <StyledParagraph>
        gnomAD database and features created and maintained by the gnomAD production team.
      </StyledParagraph>

      <DownloadsSection>
        <SectionTitle id="v4-variants">Variants</SectionTitle>
        <p>
          For more information, read the{' '}
          <ExternalLink href="https://gnomad.broadinstitute.org/news/2023-11-gnomad-v4-0">
            gnomAD v4.0.0 blog post
          </ExternalLink>{' '}
          and the{' '}
          <ExternalLink href="https://gnomad.broadinstitute.org/news/2024-04-gnomad-v4-1">
            gnomAD v4.1.0 blog post
          </ExternalLink>
          .
        </p>
        <ColumnsWrapper>
          <Column>
            <h3>Exomes</h3>
            <FileList>
              <ListItem>
                <GetUrlButtons
                  label="Sites Hail Table"
                  path="/release/4.1.1/ht/exomes/gnomad.exomes.v4.1.1.sites.ht"
                />
              </ListItem>
              {exomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
                <ListItem key={chrom}>
                  <DownloadLinks
                    label={`chr${chrom} sites VCF`}
                    path={`/release/4.1.1/vcf/exomes/gnomad.exomes.v4.1.1.sites.chr${chrom}.vcf.bgz`}
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
              <ListItem>
                <GetUrlButtons
                  label="Sites Hail Table"
                  path="/release/4.1.1/ht/genomes/gnomad.genomes.v4.1.1.sites.ht"
                />
              </ListItem>
              {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
                <ListItem key={chrom}>
                  <DownloadLinks
                    label={`chr${chrom} sites VCF`}
                    path={`/release/4.1.1/vcf/genomes/gnomad.genomes.v4.1.1.sites.chr${chrom}.vcf.bgz`}
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
          <ListItem>
            <GetUrlButtons
              label="Joint sites Hail Table"
              path="/release/4.1/ht/joint/gnomad.joint.v4.1.sites.ht"
            />
          </ListItem>
          {jointChromosomeVcfs.map(({ chrom, size, md5 }) => (
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
              <ListItem>
                <GetUrlButtons
                  label="Exomes all site allele number Hail Table"
                  path="/release/4.1/ht/exomes/gnomad.exomes.v4.1.allele_number_all_sites.ht"
                />
              </ListItem>

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
              <ListItem>
                <GetUrlButtons
                  label="Genomes all site allele number Hail Table"
                  path="/release/4.1/ht/genomes/gnomad.genomes.v4.1.allele_number_all_sites.ht"
                />
              </ListItem>

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
        <SectionTitle id="v4-browser-tables">Browser Tables</SectionTitle>

        <p>
          For more information about these files, see our{' '}
          <ExternalLink href="https://gnomad.broadinstitute.org/news/2024-08-release-gnomad-browser-tables">
            changelog entry
          </ExternalLink>{' '}
          on the browser tables, and the <Link to="/help/v4-browser-hts">help text</Link>.
        </p>

        <h3>Browser variants</h3>
        <FileList>
          <ListItem>
            <GetUrlButtons
              label="Browser variants Hail Table"
              path="/release/4.1.1/ht/browser/gnomad.browser.v4.1.1.sites.ht"
            />
          </ListItem>
          <ListItem>
            <GetUrlButtons
              label="Exome copy number variant Hail Table"
              path="/release/4.1/exome_cnv/gnomad.v4.1.cnv.all.ht"
            />
          </ListItem>
          <ListItem>
            <GetUrlButtons
              label="Genome structural variant Hail Table"
              path="/release/4.1/genome_sv/gnomad.v4.1.sv.sites.ht"
            />
          </ListItem>
        </FileList>

        <h3>Browser gene models</h3>
        <FileList>
          <ListItem>
            <GetUrlButtons
              label="Browser GRCh38 gene models Hail Table"
              path="/resources/grch38/browser/gnomad.genes.GRCh38.GENCODEv39.pext.flags.ht"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-coverage">Coverage</SectionTitle>
        <FileList>
          <ListItem>
            <GetUrlButtons
              label="Exome coverage Hail Table"
              path="/release/4.0/coverage/exomes/gnomad.exomes.v4.0.coverage.ht"
            />
          </ListItem>
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
          <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-09-using-the-gnomad-ancestry-principal-components-analysis-loadings-and-random-forest-classifier-on-your-dataset/">
            using the gnomAD genetic ancestry group principal components analysis loadings and
            random forest classifier on your dataset
          </ExternalLink>
          .
        </p>
        <FileList>
          <ListItem>
            <GetUrlButtons
              label="Principal component analysis (PCA) variant loadings"
              path="/release/4.0/pca/gnomad.v4.0.pca_loadings.ht"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Random forest (RF) .pkl model"
              path="/release/4.0/pca/gnomad.v4.0.RF_fit.pkl"
            />
          </ListItem>
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
          <ListItem>
            <DownloadLinks
              label="README"
              loggingLabel="v4.1.1 constraint README"
              path="/release/4.1.1/constraint/gnomad.v4.1.1.gene_constraint_ht_README.md"
            />
          </ListItem>
          <ListItem>
            <GetUrlButtons
              label="Constraint metrics Hail Table"
              path="/release/4.1.1/constraint/gnomad.v4.1.1.constraint_metrics.ht"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Constraint metrics TSV"
              path="/release/4.1.1/constraint/gnomad.v4.1.1.constraint_metrics.tsv.bgz"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="LOEUF gene percentile TSV"
              path="/release/4.1.1/constraint/gnomad.v4.1.1.loeuf_percentile_thresholds.tsv"
            />
          </ListItem>
          <ListItem>
            <GetUrlButtons
              label="Mutation rate Hail Table"
              path="/release/4.1.1/constraint/model/gnomad.v4.1.1.mutation_rate.ht"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Mutation rate TSV"
              path="/release/4.1.1/constraint/model/gnomad.v4.1.1.mutation_rate.tsv"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Mutation rate README"
              path="/release/4.1.1/constraint/model/gnomad.v4.1.1.mutation_rate_README.md"
            />
          </ListItem>
          <ListItem>
            <GetUrlButtons
              label="Methylation rate Hail Table"
              path="/resources/grch38/methylation_sites/methylation_all.ht"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Methylation rate README"
              path="/resources/grch38/methylation_sites/README.md"
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
          <ListItem>
            <DownloadLinks
              label="Genome SV VCF"
              path="/release/4.1/genome_sv/gnomad.v4.1.sv.sites.vcf.gz"
              size="1.62 GiB"
              md5="3ee614951c2f0c36659842876f7ce0ba"
              associatedFileType="TBI"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Genome SV non neuro controls VCF"
              path="/release/4.1/genome_sv/gnomad.v4.1.sv.non_neuro_controls.sites.vcf.gz"
              size="3.19 GiB"
              md5="442b43a740f7f12f1f9b054f9d09b530"
              associatedFileType="TBI"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Genome SV BED"
              path="/release/4.1/genome_sv/gnomad.v4.1.sv.sites.bed.gz"
              size="1.26 GiB"
              md5="a898e3e37aacfdb1e4d6218d5479683a"
            />
          </ListItem>
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
          <ListItem>
            <DownloadLinks
              label="Exome CNV VCF"
              path="/release/4.1/exome_cnv/gnomad.v4.1.cnv.all.vcf.gz"
              size="8.5 MiB"
              md5="74000fc29d0b9bc547859cfc2ba4ac84"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Exome CNV non neuro VCF"
              path="/release/4.1/exome_cnv/gnomad.v4.1.cnv.non_neuro.vcf.gz"
              size="7.9 MiB"
              md5="e2976db50823d608f2cf2fb8077f0ddd"
            />
          </ListItem>
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
        <SectionTitle id="v4-pext">Proportion expressed across transcripts (pext)</SectionTitle>
        <p>
          For information on pext, see{' '}
          <ExternalLink href="https://doi.org/10.1038/s41586-020-2329-2">
            <em>Transcript expression-aware annotation improves rare variant interpretation.</em>{' '}
            Nature 581, 452–458 (2020)
          </ExternalLink>
        </p>
        <FileList>
          <ListItem>
            <GetUrlButtons
              label="Annotation-level pext for all possible SNVs Hail table"
              path="/release/4.1/pext/gnomad.pext.gtex_v10.annotation_level.ht"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Annotation-level pext for all possible SNVs TSV"
              path="/release/4.1/pext/gnomad.pext.gtex_v10.annotation_level.tsv.gz"
            />
          </ListItem>
          <ListItem>
            <GetUrlButtons
              label="Base-level pext Hail table"
              path="/release/4.1/pext/gnomad.pext.gtex_v10.base_level.ht"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Base-level pext TSV"
              path="/release/4.1/pext/gnomad.pext.gtex_v10.base_level.tsv.gz"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-de-novo">De novo variants (DNVs)</SectionTitle>
        <p>
          For more information on DNVs, see the{' '}
          <ExternalLink href="https://gnomad.broadinstitute.org/news/2025-03-de-novo-variants-in-gnomad-v4-exomes">
            DNVs changelog
          </ExternalLink>{' '}
        </p>
        <FileList>
          <ListItem>
            <GetUrlButtons
              label="High-quality coding DNVs Hail table"
              path="/release/4.1/ht/exomes/gnomad.exomes.v4.1.de_novo.high_quality_coding.ht"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="High-quality coding DNVs TSV"
              path="/release/4.1/tsv/exomes/gnomad.exomes.v4.1.de_novo.high_quality_coding.tsv.bgz"
            />
          </ListItem>
          <ListItem>
            <GetUrlButtons
              label="High-quality coding DNVs README"
              path="/release/4.1/ht/exomes/gnomad.exomes.v4.1.de_novo.high_quality_coding.README.md"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-regional-missense-constraint">
          Regional Missense Constraint
        </SectionTitle>
        <FileList>
          <ListItem>
            <GetUrlButtons
              label="TK: TO BE STAGED - Regional missense constraint Hail Table"
              path=""
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Transcript and regional missense constraint TSV (all transcripts)"
              path="/papers/2026-rmc/gnomad_v4.1.1_all_mcrs.tsv"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Transcript and regional missense constraint TSV (high quality transcripts only)"
              path="gs://gcp-public-data--gnomad/papers/2026-rmc/gnomad_v4.1.1_non_outlier_mcrs.tsv"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Missense observed/expected percentiles TSV"
              path="gs://gcp-public-data--gnomad/papers/2026-rmc/gnomad_v4.1.1_coding_locus_oe_percentiles.he"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-clinvar-grch38">ClinVar</SectionTitle>
        <p>
          For more information about these files, including how to download a specific previous
          version of the gnomAD browser ClinVar GRCh38 table, see the{' '}
          <Link to="/help/clinvar-hts">help text</Link>.
        </p>

        <FileList>
          <ListItem>
            <GetUrlButtons
              gcsBucket="gnomad-browser-clinvar"
              label="Latest ClinVar GRCh38 Browser Hail Table"
              path="/grch38/gnomad_clinvar_grch38_latest.ht"
              includeAWS={false}
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-resources">Resources</SectionTitle>
        <FileList>
          <ListItem>
            <DownloadLinks
              label="Exome sex ploidy cutoffs TSV"
              path="/release/4.0/sex_inference/gnomad.exomes.v4.0.sample_qc.sex_inference.ploidy_cutoffs.tsv"
            />
          </ListItem>
          <ListItem>
            <GetUrlButtons
              label="Exome calling intervals Hail Table"
              path="/resources/grch38/intervals/ukb.pad50.broad.pad50.union.interval_list.ht"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Exome calling intervals flat file"
              path="/resources/grch38/intervals/ukb.pad50.broad.pad50.union.intervals"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="REVEL v4.1 README"
              path="/release/4.1/tsv/revel_for_2414_unmatched_transcripts_README.md"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Exomes REVEL supplementary TSV"
              path="/release/4.1/tsv/exomes/gnomad.v4.1.exomes.revel_for_2414_unmatched_transcripts.tsv.bgz"
            />
          </ListItem>
          <ListItem>
            <DownloadLinks
              label="Genomes REVEL supplementary TSV"
              path="/release/4.1/tsv/genomes/gnomad.v4.1.genomes.revel_for_2414_unmatched_transcripts.tsv.bgz"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <SectionTitle id="v4-secondary-analyses" subject="datasets">
        Secondary Analyses
      </SectionTitle>
      <StyledParagraph>
        Additional research analyses created using the core gnomAD releases in collaboration with
        members of the gnomAD steering committee.
      </StyledParagraph>

      <DownloadsSection>
        <SectionTitle id="v4-lof-curation-results">Loss-of-function curation results</SectionTitle>
        <p>
          For information on v4 loss-of-function curation results, see{' '}
          <ExternalLink href="https://doi.org/10.1038/s41586-020-2308-7">
            <em>The mutational constraint spectrum quantified from variation in 141,456 humans.</em>{' '}
            Nature 581, 434–443 (2020)
          </ExternalLink>{' '}
          (all homozygous LoF curation results),{' '}
          <ExternalLink href="https://doi.org/10.1038/s41586-020-2329-2">
            <em>Transcript expression-aware annotation improves rare variant interpretation.</em>{' '}
            Nature 581, 452–458 (2020)
          </ExternalLink>{' '}
          (haploinsufficient genes LoF curation results), and{' '}
          <ExternalLink href="https://pubmed.ncbi.nlm.nih.gov/37633279/">
            <em>
              Advanced variant classification framework reduces the false positive rate of predicted
              loss-of-function variants in population sequencing data.
            </em>{' '}
            Am J Hum Genet 110, 1496-1508 (2023)
          </ExternalLink>
          .
        </p>

        <FileList>
          <ListItem>
            <DownloadLinks
              label="Incomplete penetrance LoF curation results"
              path="/release/4.1/lof_curation/incomplete_penetrance_curation_results.csv"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>
    </>
  )
}

export default GnomadV4Downloads
