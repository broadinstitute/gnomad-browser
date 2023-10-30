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

// TODO:
const exomeChromosomeVcfs = [
  { chrom: '1', size: '_ GiB', md5: '_' },
  { chrom: '2', size: '_ GiB', md5: '_' },
  { chrom: '3', size: '_ GiB', md5: '_' },
  { chrom: '4', size: '_ GiB', md5: '_' },
  { chrom: '5', size: '_ GiB', md5: '_' },
  { chrom: '6', size: '_ GiB', md5: '_' },
  { chrom: '7', size: '_ GiB', md5: '_' },
  { chrom: '8', size: '_ GiB', md5: '_' },
  { chrom: '9', size: '_ GiB', md5: '_' },
  { chrom: '10', size: '_ GiB', md5: '_' },
  { chrom: '11', size: '_ GiB', md5: '_' },
  { chrom: '12', size: '- GiB', md5: '_' },
  { chrom: '13', size: '_ MiB', md5: '_' },
  { chrom: '14', size: '_ GiB', md5: '_' },
  { chrom: '15', size: '_ GiB', md5: '_' },
  { chrom: '16', size: '_ GiB', md5: '_' },
  { chrom: '17', size: '_ GiB', md5: '_' },
  { chrom: '18', size: '_ MiB', md5: '_' },
  { chrom: '19', size: '_ GiB', md5: '_' },
  { chrom: '20', size: '_ GiB', md5: '_' },
  { chrom: '21', size: '_ MiB', md5: '_' },
  { chrom: '22', size: '_ GiB', md5: '_' },
  { chrom: 'X', size: '_ GiB', md5: '_' },
  { chrom: 'Y', size: '_ MiB', md5: '_' },
]

// TODO:
const genomeChromosomeVcfs = [
  { chrom: '1', size: '_ GiB', md5: '_' },
  { chrom: '2', size: '_ GiB', md5: '_' },
  { chrom: '3', size: '_ GiB', md5: '_' },
  { chrom: '4', size: '_ GiB', md5: '_' },
  { chrom: '5', size: '_ GiB', md5: '_' },
  { chrom: '6', size: '_ GiB', md5: '_' },
  { chrom: '7', size: '_ GiB', md5: '_' },
  { chrom: '8', size: '_ GiB', md5: '_' },
  { chrom: '9', size: '_ GiB', md5: '_' },
  { chrom: '10', size: '_ GiB', md5: '_' },
  { chrom: '11', size: '_ GiB', md5: '_' },
  { chrom: '12', size: '_ GiB', md5: '_' },
  { chrom: '13', size: '_ GiB', md5: '_' },
  { chrom: '14', size: '_ GiB', md5: '_' },
  { chrom: '15', size: '_ GiB', md5: '_' },
  { chrom: '16', size: '_ GiB', md5: '_' },
  { chrom: '17', size: '_ GiB', md5: '_' },
  { chrom: '18', size: '_ GiB', md5: '_' },
  { chrom: '19', size: '_ GiB', md5: '_' },
  { chrom: '20', size: '_ GiB', md5: '_' },
  { chrom: '21', size: '_ GiB', md5: '_' },
  { chrom: '22', size: '_ GiB', md5: '_' },
  { chrom: 'X', size: '_ GiB', md5: '_' },
]

// TODO:
const svChromosomeVcfs = [
  { chrom: '1', size: '_ GiB', md5: '_' },
  { chrom: '2', size: '_ GiB', md5: '_' },
  { chrom: '3', size: '_ GiB', md5: '_' },
  { chrom: '4', size: '_ GiB', md5: '_' },
  { chrom: '5', size: '_ GiB', md5: '_' },
  { chrom: '6', size: '_ GiB', md5: '_' },
  { chrom: '7', size: '_ GiB', md5: '_' },
  { chrom: '8', size: '_ GiB', md5: '_' },
  { chrom: '9', size: '_ GiB', md5: '_' },
  { chrom: '10', size: '_ GiB', md5: '_' },
  { chrom: '11', size: '_ GiB', md5: '_' },
  { chrom: '12', size: '- GiB', md5: '_' },
  { chrom: '13', size: '_ MiB', md5: '_' },
  { chrom: '14', size: '_ GiB', md5: '_' },
  { chrom: '15', size: '_ GiB', md5: '_' },
  { chrom: '16', size: '_ GiB', md5: '_' },
  { chrom: '17', size: '_ GiB', md5: '_' },
  { chrom: '18', size: '_ MiB', md5: '_' },
  { chrom: '19', size: '_ GiB', md5: '_' },
  { chrom: '20', size: '_ GiB', md5: '_' },
  { chrom: '21', size: '_ MiB', md5: '_' },
  { chrom: '22', size: '_ GiB', md5: '_' },
  { chrom: 'X', size: '_ GiB', md5: '_' },
  { chrom: 'Y', size: '_ MiB', md5: '_' },
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
            v4 blog post
          </ExternalLink>
          , and the{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://storage.googleapis.com/gcp-public-data--gnomad/release/4.0/README.txt">
            gnomAD v4.0.0 README
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
                  // TODO: check after sync
                  path="/release/4.0/ht/exomes/gnomad.exomes.v4.0.sites.ht"
                  includeAWS={false}
                  includeAzure={false}
                />
              </ListItem>
              {exomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                <ListItem key={chrom}>
                  <IndexedFileDownloadLinks
                    label={`chr${chrom} sites VCF`}
                    // TODO: check after sync
                    path={`/release/4.0/vcf/exomes/gnomad.exomes.v4.0.sites.chr${chrom}.vcf.bgz`}
                    size={size}
                    md5={md5}
                    includeAWS={false}
                    includeAzure={false}
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
                  // TODO: check after sync
                  path="/release/4.0/ht/genomes/gnomad.genomes.v4.0.sites.ht"
                  includeAWS={false}
                  includeAzure={false}
                />
              </ListItem>
              {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
              <ListItem>
                <IndexedFileDownloadLinks
                  label="Exome calling intervals VCF"
                  // TODO: check after sync
                  path="/release/4.0/vcf/genomes/gnomad.genomes.r4.0.exome_calling_intervals.sites.vcf.bgz"
                  size="_ GiB"
                  md5="_"
                  includeAWS={false}
                  includeAzure={false}
                />
              </ListItem>
              {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
                // @ts-expect-error TS(2769) FIXME: No overload matches this call.
                <ListItem key={chrom}>
                  <IndexedFileDownloadLinks
                    label={`chr${chrom} sites VCF`}
                    // TODO: check after sync
                    path={`/release/4.0/vcf/genomes/gnomad.genomes.v4.0.sites.chr${chrom}.vcf.bgz`}
                    size={size}
                    md5={md5}
                    includeAWS={false}
                    includeAzure={false}
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
              // TODO: double check this after sync
              path="/release/4.0/coverage/exomes/gnomad.exomes.v4.0.coverage.ht"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Exome coverage summary TSV"
              // TODO: double check this after sync
              path="/release/4.0/coverage/exomes/gnomad.exomes.v4.0.coverage.tsv.bgz"
              size="_ GiB"
              md5="_"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GetUrlButtons
              label="Genome coverage Hail Table"
              // TODO: double check this after sync
              path="/release/4.0/coverage/genomes/gnomad.genomes.v4.0.coverage.ht"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Genome coverage summary TSV"
              // TODO: double check this after sync
              path="/release/4.0/coverage/genomes/gnomad.genomes.v4.0.coverage.tsv.bgz"
              size="_ GiB"
              md5="_"
              includeAWS={false}
              includeAzure={false}
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
            <GetUrlButtons
              label="Constraint metrics Hail Table"
              // TODO: double check this after sync
              path="/release/4.0/constraint/metrics/gnomad.v4.0.constraint_metrics.ht"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Constraint metrics TSV"
              // TODO: double check this after sync
              path="/release/4.0/constraint/metrics/gnomad.v4.0.constraint_metrics.tsv.bgz"
              includeAWS={false}
              includeAzure={false}
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
          {svChromosomeVcfs.map(({ chrom, size, md5 }) => (
            // @ts-expect-error TS(2769) FIXME: No overload matches this call.
            <ListItem key={chrom}>
              <IndexedFileDownloadLinks
                label={`chr${chrom} VCF`}
                // TODO: check after sync
                path={`/release/4.0/genome_sv/gnomad.v4.0.sv.chr${chrom}.vcf.gz`}
                size={size}
                md5={md5}
                includeAWS={false}
                includeAzure={false}
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
              // TODO: double check this after sync
              path="/release/4.0/exome_cnv/gnomad.v4.0.cnv.all.vcf.gz"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Exome CNV non neuro VCF"
              // TODO: double check this after sync
              path="/release/4.0/exome_cnv/gnomad.v4.0.cnv.non_neuro.vcf.gz"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Exome CNV non-neuro controls VCF"
              // TODO: double check this after sync
              path="/release/4.0/exome_cnv/gnomad.v4.0.cnv.non_neuro_controls.vcf.gz"
              includeAWS={false}
              includeAzure={false}
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
              // TODO: double check this after sync
              path="/release/4.0/sex_inference/gnomad.exomes.v4.0.sample_qc.sex_inference.ploidy_cutoffs.tsv"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GetUrlButtons
              label="Exome calling intervals Hail Table"
              // TODO: double check this after sync
              path="/resources/grch38/intervals/ukb.pad50.broad.pad50.union.interval_list.ht"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Exome calling intervals flat file"
              // TODO: double check this after sync
              path="/resources/grch38/intervals/ukb.pad50.broad.pad50.union.intervals"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
        </FileList>
      </DownloadsSection>
    </>
  )
}

export default GnomadV4Downloads
