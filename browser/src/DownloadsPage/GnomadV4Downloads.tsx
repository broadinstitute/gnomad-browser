import React from 'react'

import { ExternalLink, ListItem } from '@gnomad/ui'

import {
  Column,
  ColumnsWrapper,
  DownloadsSection,
  FileList,
  GenericDownloadLinks,
  GetUrlButtons,
  IndexedFileDownloadLinks,
  SectionTitle,
  StyledParagraph,
} from './downloadsPageStyles'
import Link from '../Link'

const exomeChromosomeVcfs = [
  { chrom: '1', size: '26.88 GiB', md5: '50bba514e8d4e65aef39c7baa9c29e71' },
  { chrom: '2', size: '20.32 GiB', md5: '0bac3559c5d9442d35c72308ab4a8684' },
  { chrom: '3', size: '16.33 GiB', md5: '4cb2b400a8dfd95711e3b20a7a166f25' },
  { chrom: '4', size: '11.07 GiB', md5: '2d1988c3ef15027c1c978a245feb4110' },
  { chrom: '5', size: '12.29 GiB', md5: '4e4b38e9a819748a7909684f311ebd20' },
  { chrom: '6', size: '13.14 GiB', md5: '22bac98dcacfddcc43820e05d4a72081' },
  { chrom: '7', size: '14.01 GiB', md5: 'bf00c8dfe5c22d6fd684b7b90be4e8ff' },
  { chrom: '8', size: '10.38 GiB', md5: 'c10c6a7265af418cbfd7a855944bc9f2' },
  { chrom: '9', size: '11.57 GiB', md5: 'f20000e361f3f2f4759619b3029c10ad' },
  { chrom: '10', size: '11.23 GiB', md5: 'd85984b39664d800ec8da815004029c1' },
  { chrom: '11', size: '16.58 GiB', md5: '882f7345687996ac5e728fe771debeb2' },
  { chrom: '12', size: '15.21 GiB', md5: '1b11c7c60a205703a977ba03c30f2f41' },
  { chrom: '13', size: '5.18 GiB', md5: '4611cd7c3e0a1111ba52b2ec544484b4' },
  { chrom: '14', size: '9.54 GiB', md5: '628757952a5114929bf1150901bc34bb' },
  { chrom: '15', size: '10.65 GiB', md5: '63574925084fa8e48dac46185c41975f' },
  { chrom: '16', size: '13.90 GiB', md5: 'ba59445b0fb0f1a1d78df5dc623c40dd' },
  { chrom: '17', size: '17.04 GiB', md5: '5010e1133a4153c34ae3b113c7c97280' },
  { chrom: '18', size: '4.87 GiB', md5: 'aed2e7e455e35b97a32d4886d94ccaa0' },
  { chrom: '19', size: '18.14 GiB', md5: '67c40daa48e50bb4ec1ec541570217b0' },
  { chrom: '20', size: '6.9 GiB', md5: '09b0221006b59c1626d8188e909e933d' },
  { chrom: '21', size: '3.27 GiB', md5: '206afe8d9dbe544697e1b67eee6d2f7f' },
  { chrom: '22', size: '7.31 GiB', md5: '3084349c03194e8cf5063a1e46473248' },
  { chrom: 'X', size: '7.96 GiB', md5: '6d33a288735eda242c473905ccb6743b' },
  { chrom: 'Y', size: '163.66 MiB', md5: 'c8414744cf75fa498e2497a9391eb1ad' },
]

const genomeChromosomeVcfs = [
  { chrom: '1', size: '64.64 GiB', md5: '722d44a602a6988c2ffd55b6ed7ca3ce' },
  { chrom: '2', size: '68.24 GiB', md5: '2d14cb70a93d772191fa5133f5b1a129' },
  { chrom: '3', size: '56.96 GiB', md5: 'b0c8955adcd44e8757d9bfdb01a2e180' },
  { chrom: '4', size: '53.19 GiB', md5: '9fba0d34f3074100681b74fc489f620b' },
  { chrom: '5', size: '48.64 GiB', md5: '007112b5d72df612dcfb3dc45606dc25' },
  { chrom: '6', size: '46.85 GiB', md5: '9b0a289a7dc7910f1a79586b8aa62593' },
  { chrom: '7', size: '45.95 GiB', md5: '0929e74108e1d7faab3f7e90e8af9410' },
  { chrom: '8', size: '43.03 GiB', md5: '4c6bc15f9d1232f83e89f5305cc1fbab' },
  { chrom: '9', size: '36.36 GiB', md5: '83c85e0d39b0bab7b8223642c8d2dab0' },
  { chrom: '10', size: '39.16 GiB', md5: '757db8e8f1007144e6dd8dfcd697046b' },
  { chrom: '11', size: '38.57 GiB', md5: '52c5b1e9313869dc347b55133dd5c31f' },
  { chrom: '12', size: '37.86 GiB', md5: '19d5b3abacf1c6be990b3aa8f6ca2786' },
  { chrom: '13', size: '25.65 GiB', md5: '94c6da5e72d87bf0a714d6b5c1c09272' },
  { chrom: '14', size: '26.02 GiB', md5: '145c7f1710a6b3a90044f3d14912ce4b' },
  { chrom: '15', size: '24.63 GiB', md5: '3e04c33c6a03f91b1b071dc8c3224f77' },
  { chrom: '16', size: '27.57 GiB', md5: '572a343a3d8629e0579dbd424f5147ad' },
  { chrom: '17', size: '25.17 GiB', md5: 'ac0003ebe2297dd4377c5045bb439c5c' },
  { chrom: '18', size: '21.12 GiB', md5: '4e1b5b41b0bc70c23d43904dd9ff3bb1' },
  { chrom: '19', size: '19.91 GiB', md5: '992829f49533843a5ced897d6388d5e2' },
  { chrom: '20', size: '17.49 GiB', md5: 'd3ab3ed3c79c53a4fe15ced300b07ef5' },
  { chrom: '21', size: '11.47 GiB', md5: '4d2e808cbaafcd2ddc7692be0a45a924' },
  { chrom: '22', size: '12.77 GiB', md5: 'd6ba3b18b07423e3a1af56e8405a26c2' },
  { chrom: 'X', size: '37.05 GiB', md5: 'b77d8f0219fa9a033a6f747d5fef12d9' },
  { chrom: 'Y', size: '890.03 MiB', md5: '8c231b75745b6670555915847c9999e8' },
]

const svChromosomeVcfs = [
  { chrom: '1', size: '616.33 MiB', crc32: 'f497d60f' },
  { chrom: '2', size: '612.83 MiB', crc32: 'bee58761' },
  { chrom: '3', size: '469.64 MiB', crc32: '00c11e03' },
  { chrom: '4', size: '446.44 MiB', crc32: '4aa1be45' },
  { chrom: '5', size: '418.1 MiB', crc32: 'cc78d775' },
  { chrom: '6', size: '418.37 MiB', crc32: '8ad01764' },
  { chrom: '7', size: '437.99 MiB', crc32: '0e78bed7' },
  { chrom: '8', size: '332.91 MiB', crc32: '1a7974d3' },
  { chrom: '9', size: '289.19 MiB', crc32: '693c4cc1' },
  { chrom: '10', size: '320.36 MiB', crc32: '63dc92db' },
  { chrom: '11', size: '312.75 MiB', crc32: 'c0016756' },
  { chrom: '12', size: '322.33 MiB', crc32: '28396743' },
  { chrom: '13', size: '208.4 MiB', crc32: '504d3937' },
  { chrom: '14', size: '218.37 MiB', crc32: '06ccecf9' },
  { chrom: '15', size: '183.5 MiB', crc32: 'c191b2ca' },
  { chrom: '16', size: '234 MiB', crc32: '016c8e77' },
  { chrom: '17', size: '233.1 MiB', crc32: 'f37738a4' },
  { chrom: '18', size: '157.88 MiB', crc32: '1f802ad6' },
  { chrom: '19', size: '227.48 MiB', crc32: '16a48cf0' },
  { chrom: '20', size: '148.62 MiB', crc32: '7e34ac14' },
  { chrom: '21', size: '109.55 MiB', crc32: '6805d560' },
  { chrom: '22', size: '112.34 MiB', crc32: '3a0cce90' },
  { chrom: 'X', size: '335.93 MiB', crc32: '1b49e5a6' },
  { chrom: 'Y', size: '50.76 MiB', crc32: 'd8a3a636' },
]

const GnomadV4Downloads = () => {
  return (
    <>
      <SectionTitle id="v4" theme={{ type: 'release' }}>
        v4 Downloads
      </SectionTitle>
      <StyledParagraph>
        The gnomAD v4.0.0 data set contains data from 730,947 exomes and 76,215 whole genomes, all
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
                  path="/release/4.0/ht/exomes/gnomad.exomes.v4.0.sites.ht"
                />
              </ListItem>
              {exomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                <ListItem key={chrom}>
                  <IndexedFileDownloadLinks
                    label={`chr${chrom} sites VCF`}
                    path={`/release/4.0/vcf/exomes/gnomad.exomes.v4.0.sites.chr${chrom}.vcf.bgz`}
                    size={size}
                    md5={md5}
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
                  path="/release/4.0/ht/genomes/gnomad.genomes.v4.0.sites.ht/"
                />
              </ListItem>
              {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                <ListItem key={chrom}>
                  <IndexedFileDownloadLinks
                    label={`chr${chrom} sites VCF`}
                    path={`/release/4.0/vcf/genomes/gnomad.genomes.v4.0.sites.chr${chrom}.vcf.bgz`}
                    size={size}
                    md5={md5}
                  />
                </ListItem>
              ))}
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
            <GenericDownloadLinks
              label="Exome coverage summary TSV"
              path="/release/4.0/coverage/exomes/gnomad.exomes.v4.0.coverage.summary.tsv.bgz"
              size="3.77 GiB"
              md5="a6955332c9cccae7efb9c95581282a73"
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
            <GenericDownloadLinks label="README" path="/release/v4.0/constraint/README.txt" />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GetUrlButtons
              label="Constraint metrics Hail Table"
              path="/release/v4.0/constraint/gnomad.v4.0.constraint_metrics.ht"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Constraint metrics TSV"
              path="/release/v4.0/constraint/gnomad.v4.0.constraint_metrics.tsv"
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
          {svChromosomeVcfs.map(({ chrom, size, crc32 }) => (
            // @ts-expect-error TS(2769) FIXME: No overload matches this call.
            <ListItem key={chrom}>
              <IndexedFileDownloadLinks
                label={`chr${chrom} VCF`}
                path={`/release/4.0/genome_sv/gnomad.v4.0.sv.chr${chrom}.vcf.gz`}
                size={size}
                crc32={crc32}
              />
            </ListItem>
          ))}
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
            <GenericDownloadLinks
              label="Exome CNV VCF"
              path="/release/4.0/exome_cnv/gnomad.v4.0.cnv.all.vcf.gz"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Exome CNV non neuro VCF"
              path="/release/4.0/exome_cnv/gnomad.v4.0.cnv.non_neuro.vcf.gz"
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Exome CNV non-neuro controls VCF"
              path="/release/4.0/exome_cnv/gnomad.v4.0.cnv.non_neuro_controls.vcf.gz"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>

      <DownloadsSection>
        <SectionTitle id="v4-resources">Resources</SectionTitle>
        <FileList>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
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
            <GenericDownloadLinks
              label="Exome calling intervals flat file"
              path="/resources/grch38/intervals/ukb.pad50.broad.pad50.union.intervals"
            />
          </ListItem>
        </FileList>
      </DownloadsSection>
    </>
  )
}

export default GnomadV4Downloads
