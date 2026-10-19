import React from 'react'

import { ExternalLink, ListItem } from '@gnomad/ui'

import {
  Column,
  ColumnsWrapper,
  DownloadLinks,
  DownloadsSection,
  FileList,
  SectionTitle,
  StyledParagraph,
} from './downloadsPageStyles'

const chromosomes = [...Array.from({ length: 22 }, (_, i) => `${i + 1}`), 'X', 'Y']

// The HGSVC/HPRC VCFs include per-sample genotypes; the All of Us VCFs are sites-only
const cohorts = [
  {
    id: 'hgsvc_hprc',
    label: 'HGSVC/HPRC',
    vcfDescription: 'VCF with genotypes',
    vcfFileNamePrefix: 'gnomad.lr.genomes.0.1.hgsvc_hprc',
  },
  {
    id: 'aou',
    label: 'All of Us',
    vcfDescription: 'sites VCF',
    vcfFileNamePrefix: 'gnomad.lr.genomes.0.1.aou.sites',
  },
]

const GnomadLongReadDownloads = () => {
  return (
    <>
      <SectionTitle id="lr" subject="release">
        LR Downloads
      </SectionTitle>
      <StyledParagraph>
        The gnomAD LR dataset contains long-read genome sequencing from 1,319 samples mapped to the
        GRCh38 reference sequence. The release includes two complementary datasets: site-level data
        from 1,027 participants in Phase I of the All of Us Research Program (AoU), and site and
        genotype-level information from 292 publicly available samples with high-coverage from the
        Human Pangenome Reference Consortium (HPRC) and the Human Genome Structural Variation
        Consortium (HGSVC).
        <br />
        For more information about this dataset, see our{' '}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2026-10-long-read-genome-data-in-gnomad/">
          blog post
        </ExternalLink>
        .
      </StyledParagraph>

      <SectionTitle id="lr-core-dataset" subject="datasets">
        Core Dataset
      </SectionTitle>

      <DownloadsSection>
        <SectionTitle id="lr-variants">Variants</SectionTitle>
        <FileList>
          <ListItem>
            <DownloadLinks
              label="README"
              loggingLabel="LR 0.1 VCF README"
              path="/release/lr/0.1/vcf/README.md"
            />
          </ListItem>
        </FileList>
        <ColumnsWrapper>
          {cohorts.map((cohort) => (
            <Column key={cohort.id}>
              <h3>{cohort.label}</h3>
              <FileList>
                {chromosomes.map((chrom) => (
                  <ListItem key={chrom}>
                    <DownloadLinks
                      label={`chr${chrom} ${cohort.vcfDescription}`}
                      loggingLabel={`LR 0.1 ${cohort.label} chr${chrom} ${cohort.vcfDescription}`}
                      path={`/release/lr/0.1/vcf/${cohort.id}/${cohort.vcfFileNamePrefix}.chr${chrom}.vcf.gz`}
                      associatedFileType="TBI"
                    />
                  </ListItem>
                ))}
              </FileList>
            </Column>
          ))}
        </ColumnsWrapper>
      </DownloadsSection>
    </>
  )
}

export default GnomadLongReadDownloads
