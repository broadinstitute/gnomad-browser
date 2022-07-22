import React, { useState } from 'react'

import { Badge, ExternalLink, Link, List, ListItem, Select } from '@gnomad/ui'

import { GNOMAD_POPULATION_NAMES } from '@gnomad/dataset-metadata/gnomadPopulations'

import {
  Column,
  ColumnsWrapper,
  FileList,
  GenericDownloadLinks,
  GetUrlButtons,
  IndexedFileDownloadLinks,
  SectionTitle,
} from './downloadsPageStyles'

const exomeChromosomeVcfs = [
  { chrom: '1', size: '5.77 GiB', md5: '9817acdf1d9600efb3355e4cb4b7ee1f' },
  { chrom: '2', size: '4.2 GiB', md5: 'c2822d7a914d06ede28d1078970336ac' },
  { chrom: '3', size: '3.29 GiB', md5: 'd03d8a6741d109f95ab1d8771c76eb2c' },
  { chrom: '4', size: '2.17 GiB', md5: '579f67cf5b58e70d933e386ffa57bdea' },
  { chrom: '5', size: '2.51 GiB', md5: 'e517127575fc9652469cf9306b3fedb3' },
  { chrom: '6', size: '2.83 GiB', md5: 'b895ac937bcb4b317f66a9da7fcc12f2' },
  { chrom: '7', size: '2.88 GiB', md5: '791980836c644ba6a2d41ef615a75554' },
  { chrom: '8', size: '2.13 GiB', md5: 'ed8e5417fec3fc49b5553a4cfb2fe2c9' },
  { chrom: '9', size: '2.4 GiB', md5: 'e60b08f23b57d7c42840a4bef218dcb2' },
  { chrom: '10', size: '2.23 GiB', md5: '9fd88f3e846e522ecd0361caef2c260c' },
  { chrom: '11', size: '3.61 GiB', md5: '33bc258f61fe541f25720ae71b724f2c' },
  { chrom: '12', size: '3.07 GiB', md5: 'c569364a4610fbb89de87409395cfd69' },
  { chrom: '13', size: '976.73 MiB', md5: '1de4e8967e7718e2b26ab96b3996634c' },
  { chrom: '14', size: '2.02 GiB', md5: '0f645d977acae762b3535b8018d489aa' },
  { chrom: '15', size: '2.08 GiB', md5: '6ffb2113d851c6eebeec601f37937b34' },
  { chrom: '16', size: '3.04 GiB', md5: 'e4740b2798df34aa396d0364c9a8368f' },
  { chrom: '17', size: '3.62 GiB', md5: '8c93bad11b73a94b0f1b41141f50d536' },
  { chrom: '18', size: '882.14 MiB', md5: 'f77f723fece7a690ec34a3f65d59e445' },
  { chrom: '19', size: '4.3 GiB', md5: 'c8ed6f651aeb051090c88f29e3874ff4' },
  { chrom: '20', size: '1.44 GiB', md5: '49a46fab6ff9b68143831caa5bc12483' },
  { chrom: '21', size: '652.73 MiB', md5: '7eea9c7ceb4ac1a86a634c1b3ec808c4' },
  { chrom: '22', size: '1.43 GiB', md5: '766303a757547e413b3daccc1290213f' },
  { chrom: 'X', size: '1.33 GiB', md5: '57082d2021cdd1b93a23b4203dcbbb7d' },
  { chrom: 'Y', size: '15.66 MiB', md5: 'fa412becb3aba27b9acf2529bb76b895' },
]

const genomeChromosomeVcfs = [
  { chrom: '1', size: '35.83 GiB', md5: 'b81951f2b7cb2dbef63932677b58f57e' },
  { chrom: '2', size: '38.21 GiB', md5: 'f7db44e30f5be3378486c07494aa035f' },
  { chrom: '3', size: '31.35 GiB', md5: '69bd6a52695d5eedb6e66847fff512b9' },
  { chrom: '4', size: '30.33 GiB', md5: '2dbf7408b56daca57b5a33274c8d46a4' },
  { chrom: '5', size: '28.27 GiB', md5: 'b4439ed58fa62e3c9d1b67c472e521ee' },
  { chrom: '6', size: '26.5 GiB', md5: 'c66d92dc5b677df537f19f3d7d6b1815' },
  { chrom: '7', size: '26.05 GiB', md5: 'bb70cc16431d746c5a516d21019a6be5' },
  { chrom: '8', size: '24.47 GiB', md5: '9ed8ba30f63e2ccf2e0d91fb6b944e3c' },
  { chrom: '9', size: '20.03 GiB', md5: 'df50f25ed54b6fbca76fa302451eb139' },
  { chrom: '10', size: '21.22 GiB', md5: 'd886702d52e91632ffbfe508c7eeeec0' },
  { chrom: '11', size: '21.83 GiB', md5: '6f0721fe85c9fa4c4166d68b3033e9eb' },
  { chrom: '12', size: '21.26 GiB', md5: 'ae0eb6ec036f751d05375d5d38b5e54c' },
  { chrom: '13', size: '14.92 GiB', md5: '7d599634271e6478d64df5c193ce1d97' },
  { chrom: '14', size: '14.63 GiB', md5: 'a25f665eb214f334251b8798e893cd8f' },
  { chrom: '15', size: '13.77 GiB', md5: '094be1d4b82d7022f79556b469c324b3' },
  { chrom: '16', size: '15.43 GiB', md5: '082bedc2d5eed158c50d638529ab86da' },
  { chrom: '17', size: '13.52 GiB', md5: 'addd19da8057da3b392d5af04b8b60ba' },
  { chrom: '18', size: '12.07 GiB', md5: '2e72f12ffe39a6b9cc7377bd2e7f3ef1' },
  { chrom: '19', size: '11.22 GiB', md5: '116b0c4b52effdbccf6cd15a6c07c74e' },
  { chrom: '20', size: '9.62 GiB', md5: 'b06ce8dcedfa761ba781e4416ede6ad8' },
  { chrom: '21', size: '6.12 GiB', md5: 'afd34a5ec39d8efb1d374534637895e7' },
  { chrom: '22', size: '6.49 GiB', md5: '113cded38a70f8f4abbef10f5c63e81d' },
  { chrom: 'X', size: '17.8 GiB', md5: '77d25e87e94d360eb2acedaaedaf3df1' },
]

const LDFiles = () => {
  const [selectedPopulation, setSelectedPopulation] = useState('afr')

  const urlPopId = selectedPopulation.includes('_')
    ? selectedPopulation.split('_')[1]
    : selectedPopulation

  return (
    <>
      <p>
        <label htmlFor="ld-files-population">
          Population {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Select
            id="ld-files-population"
            value={selectedPopulation}
            onChange={(e: any) => setSelectedPopulation(e.target.value)}
          >
            <option value="afr">{GNOMAD_POPULATION_NAMES.afr}</option>
            <option value="amr">{GNOMAD_POPULATION_NAMES.amr}</option>
            <option value="asj">{GNOMAD_POPULATION_NAMES.asj}</option>
            <option value="eas">{GNOMAD_POPULATION_NAMES.eas}</option>
            <option value="fin">{GNOMAD_POPULATION_NAMES.fin}</option>

            <optgroup label="European (non-Finnish)">
              <option value="nfe">{GNOMAD_POPULATION_NAMES.nfe}</option>
              <option value="nfe_est">{GNOMAD_POPULATION_NAMES.nfe_est}</option>
              <option value="nfe_nwe">{GNOMAD_POPULATION_NAMES.nfe_nwe}</option>
              <option value="nfe_seu">{GNOMAD_POPULATION_NAMES.nfe_seu}</option>
            </optgroup>
          </Select>
        </label>
      </p>

      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            label={`LD matrix Hail BlockMatrix for ${GNOMAD_POPULATION_NAMES[selectedPopulation]} population`}
            path={`/release/2.1.1/ld/gnomad.genomes.r2.1.1.${urlPopId}.common.adj.ld.bm`}
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            label={`Variant indices Hail Table for ${GNOMAD_POPULATION_NAMES[selectedPopulation]} population`}
            path={`/release/2.1.1/ld/gnomad.genomes.r2.1.1.${urlPopId}.common.adj.ld.variant_indices.ht`}
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            label={`LD scores Hail Table for ${GNOMAD_POPULATION_NAMES[selectedPopulation]} population`}
            path={`/release/2.1.1/ld/scores/gnomad.genomes.r2.1.1.${urlPopId}.adj.ld_scores.ht`}
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            label={`LDSC .ldscore.bgz file for ${GNOMAD_POPULATION_NAMES[selectedPopulation]} population`}
            path={`/release/2.1.1/ld/scores/gnomad.genomes.r2.1.1.${urlPopId}.adj.ld_scores.ldscore.bgz`}
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            label={`LDSC .M file for ${GNOMAD_POPULATION_NAMES[selectedPopulation]} population`}
            path={`/release/2.1.1/ld/scores/gnomad.genomes.r2.1.1.${urlPopId}.adj.ld_scores.M`}
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            label={`LDSC .M_5_50 file for ${GNOMAD_POPULATION_NAMES[selectedPopulation]} population`}
            path={`/release/2.1.1/ld/scores/gnomad.genomes.r2.1.1.${urlPopId}.adj.ld_scores.M_5_50`}
          />
        </ListItem>
      </FileList>
    </>
  )
}

export default () => (
  <React.Fragment>
    <p>
      The gnomAD v2.1.1 data set contains data from 125,748 exomes and 15,708 whole genomes, all
      mapped to the GRCh37/hg19 reference sequence.
    </p>
    <section>
      <h2>Summary</h2>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <List>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-variants">Variants</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-coverage">Coverage</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-constraint">Constraint</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-multi-nucleotide-variants">Multi-nucleotide variants (MNVs)</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-pext">Proportion expressed across transcripts (pext)</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-structural-variants">Structural variants</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-lof-curation-results">Loss-of-function curation results</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-variant-cooccurrence">Variant co-occurrence</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-linkage-disequilibrium">Linkage disequilibrium</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-ancestry-classification">Ancestry classification</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-resources">Resources</Link>
        </ListItem>
      </List>
    </section>

    <section>
      <SectionTitle id="v2-variants">Variants</SectionTitle>
      <p>
        <Badge level="info">Note</Badge> Find out what changed in the latest release in the{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://storage.googleapis.com/gcp-public-data--gnomad/release/2.1.1/README.txt">
          gnomAD v2.1.1 README
        </ExternalLink>
        .
      </p>
      <p>
        The variant dataset files below contain all subsets (non-neuro, non-cancer, controls-only,
        and non-TOPMed).
      </p>
      <ColumnsWrapper>
        <Column>
          <h3>Exomes</h3>
          <FileList>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              <GetUrlButtons
                label="Sites Hail Table"
                path="/release/2.1.1/ht/exomes/gnomad.exomes.r2.1.1.sites.ht"
              />
            </ListItem>

            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              <IndexedFileDownloadLinks
                label="All chromosomes sites VCF"
                path="/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.vcf.bgz"
                size="58.81 GiB"
                md5="f034173bf6e57fbb5e8ce680e95134f2"
              />
            </ListItem>
            {exomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              <ListItem key={chrom}>
                <IndexedFileDownloadLinks
                  label={`chr${chrom} sites VCF`}
                  path={`/release/2.1.1/vcf/exomes/gnomad.exomes.r2.1.1.sites.${chrom}.vcf.bgz`}
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
                path="/release/2.1.1/ht/genomes/gnomad.genomes.r2.1.1.sites.ht"
              />
            </ListItem>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              <IndexedFileDownloadLinks
                label="All chromosomes sites VCF"
                path="/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.sites.vcf.bgz"
                size="460.93 GiB"
                md5="e6eadf5ac7b2821b40f350da6e1279a2"
              />
            </ListItem>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              <IndexedFileDownloadLinks
                label="Exome calling intervals VCF"
                path="/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.exome_calling_intervals.sites.vcf.bgz"
                size="9.7 GiB"
                md5="e5bd69a0f89468149bc3afca78cd5acc"
              />
            </ListItem>
            {genomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              <ListItem key={chrom}>
                <IndexedFileDownloadLinks
                  label={`chr${chrom} sites VCF`}
                  path={`/release/2.1.1/vcf/genomes/gnomad.genomes.r2.1.1.sites.${chrom}.vcf.bgz`}
                  size={size}
                  md5={md5}
                />
              </ListItem>
            ))}
          </FileList>
        </Column>
      </ColumnsWrapper>
    </section>

    <section>
      <SectionTitle id="v2-coverage">Coverage</SectionTitle>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Exome coverage Hail Table"
            path="/release/2.1/coverage/exomes/gnomad.exomes.r2.1.coverage.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Exome coverage summary TSV"
            path="/release/2.1/coverage/exomes/gnomad.exomes.coverage.summary.tsv.bgz"
            size="1.57 GiB"
            md5="73cddb8cac2c2db4f82662584ede6d20"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Genome coverage Hail Table"
            path="/release/2.1/coverage/genomes/gnomad.genomes.r2.1.coverage.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Genome coverage summary TSV"
            path="/release/2.1/coverage/genomes/gnomad.genomes.coverage.summary.tsv.bgz"
            size="50.74 GiB"
            md5="bd68fd9241e14eb4debcee63a1c35064"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="v2-constraint">Constraint</SectionTitle>
      <p>
        For information on constraint, see{' '}
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ExternalLink href="https://doi.org/10.1038/s41586-020-2308-7">
          <em>The mutational constraint spectrum quantified from variation in 141,456 humans.</em>{' '}
          Nature 581, 434–443 (2020).
        </ExternalLink>{' '}
        Descriptions of the fields in these files can be found in the Supplementary Dataset 11
        section on pages 74-77 of the{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://www.nature.com/articles/s41586-020-2308-7#Sec12">
          Supplementary Information
        </ExternalLink>
        .
      </p>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="pLoF Metrics by Transcript Hail Table"
            path="/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_transcript.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="pLoF Metrics by Transcript TSV"
            path="/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_transcript.txt.bgz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="pLoF Metrics by Gene TSV"
            path="/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.by_gene.txt.bgz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="pLoF Metrics Downsamplings TSV"
            path="/release/2.1.1/constraint/gnomad.v2.1.1.lof_metrics.downsamplings.txt.bgz"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="v2-multi-nucleotide-variants">
        Multi-nucleotide variants (MNVs)
      </SectionTitle>
      <p>
        For information on multi-nucleotide variants in gnomAD, see{' '}
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ExternalLink href="https://doi.org/10.1038/s41467-019-12438-5">
          <em>
            Landscape of multi-nucleotide variants in 125,748 human exomes and 15,708 genomes.
          </em>{' '}
          Nature Communications 11, 2539 (2020).
        </ExternalLink>
      </p>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks label="README" path="/release/2.1/mnv/readme.md" />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Coding MNVs TSV"
            path="/release/2.1/mnv/gnomad_mnv_coding.tsv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Coding MNVs consisting of 3 SNVs TSV"
            path="/release/2.1/mnv/gnomad_mnv_coding_3bp.tsv"
          />
        </ListItem>
      </FileList>
      <h3>MNVs genome wide</h3>
      <FileList>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <React.Fragment key={n}>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              <GetUrlButtons
                label={`Distance = ${n} Hail Table`}
                path={`/release/2.1/mnv/genome/gnomad_mnv_genome_d${n}.ht`}
              />
            </ListItem>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              <GenericDownloadLinks
                label={`Distance = ${n} TSV`}
                path={`/release/2.1/mnv/genome/gnomad_mnv_genome_d${n}.tsv.bgz`}
              />
            </ListItem>
          </React.Fragment>
        ))}
      </FileList>
    </section>

    <section>
      <SectionTitle id="v2-pext">Proportion expressed across transcripts (pext)</SectionTitle>
      <p>
        For information on pext, see{' '}
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ExternalLink href="https://doi.org/10.1038/s41586-020-2329-2">
          <em>Transcript expression-aware annotation improves rare variant interpretation.</em>{' '}
          Nature 581, 452–458 (2020)
        </ExternalLink>
      </p>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Annotation-level pext for all possible SNVs Hail table"
            path="/papers/2019-tx-annotation/pre_computed/all.possible.snvs.tx_annotated.021520.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Annotation-level pext for all possible SNVs TSV"
            path="/papers/2019-tx-annotation/pre_computed/all.possible.snvs.tx_annotated.GTEx.v7.021520.tsv.bgz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Base-level pext Hail table"
            path="/papers/2019-tx-annotation/gnomad_browser/all.baselevel.021620.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Base-level pext TSV"
            path="/papers/2019-tx-annotation/gnomad_browser/all.baselevel.021620.tsv.bgz"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="v2-structural-variants">Structural variants</SectionTitle>
      <p>
        For information on gnomAD structural variants, see{' '}
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ExternalLink href="https://doi.org/10.1038/s41586-020-2287-8">
          <em>A structural variation reference for medical and population genetics.</em> Nature 581,
          444–451 (2020).
        </ExternalLink>
      </p>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <IndexedFileDownloadLinks
            label="SV 2.1 sites VCF"
            path="/papers/2019-sv/gnomad_v2.1_sv.sites.vcf.gz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <IndexedFileDownloadLinks
            label="SV 2.1 sites BED"
            path="/papers/2019-sv/gnomad_v2.1_sv.sites.bed.gz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <IndexedFileDownloadLinks
            label="SV 2.1 (controls) sites VCF"
            path="/papers/2019-sv/gnomad_v2.1_sv.controls_only.sites.vcf.gz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <IndexedFileDownloadLinks
            label="SV 2.1 (controls) sites BED"
            path="/papers/2019-sv/gnomad_v2.1_sv.controls_only.sites.bed.gz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <IndexedFileDownloadLinks
            label="SV 2.1 (non-neuro) sites VCF"
            path="/papers/2019-sv/gnomad_v2.1_sv.nonneuro.sites.vcf.gz"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <IndexedFileDownloadLinks
            label="SV 2.1 (non-neuro) sites BED"
            path="/papers/2019-sv/gnomad_v2.1_sv.nonneuro.sites.bed.gz"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="v2-lof-curation-results">Loss-of-function curation results</SectionTitle>
      <p>
        For information on loss-of-function curation results, see{' '}
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ExternalLink href="https://doi.org/10.1038/s41586-020-2308-7">
          <em>The mutational constraint spectrum quantified from variation in 141,456 humans.</em>{' '}
          Nature 581, 434–443 (2020)
        </ExternalLink>{' '}
        (all homozygous LoF curation results) and{' '}
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <ExternalLink href="https://doi.org/10.1038/s41586-020-2329-2">
          <em>Transcript expression-aware annotation improves rare variant interpretation.</em>{' '}
          Nature 581, 452–458 (2020)
        </ExternalLink>{' '}
        (haploinsufficient genes LoF curation results).
      </p>

      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="All homozygous LoF curation results"
            path="/truth-sets/source/lof-curation/all_homozygous_curation_results.csv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Lysosomal storage disease genes LoF curation results"
            path="/truth-sets/source/lof-curation/lysosomal_storage_disease_genes_curation_results.csv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="AP4 LoF curation results"
            path="/truth-sets/source/lof-curation/AP4_curation_results.csv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="FIG4 LoF curation results"
            path="/truth-sets/source/lof-curation/FIG4_curation_results.csv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="MCOLN1 LoF curation results"
            path="/truth-sets/source/lof-curation/MCOLN1_curation_results.csv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Haploinsufficient genes LoF curation results"
            path="/truth-sets/source/lof-curation/haploinsufficient_genes_curation_results.csv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Metabolic conditions genes LoF curation results"
            path="/truth-sets/source/lof-curation/metabolic_conditions_genes_curation_results.csv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="gnomAD addendum LoF curation results"
            path="/truth-sets/source/lof-curation/gnomAD_addendum_curation_results.csv"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="NSD1 LoF curation results"
            path="/truth-sets/source/lof-curation/NSD1_curation_results.csv"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="v2-variant-cooccurrence">Variant co-occurrence</SectionTitle>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Variant co-occurrence Hail Table"
            path="/release/2.1.1/ht/exomes_phased_counts_0.05_3_prime_UTR_variant_vp.ht"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="v2-linkage-disequilibrium">Linkage disequilibrium</SectionTitle>
      <LDFiles />
    </section>

    <section>
      <SectionTitle id="v2-ancestry-classification">Ancestry classification</SectionTitle>
      <p>
        For more information about these files, see our blog post on{' '}
        {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
        <ExternalLink href="https://gnomad.broadinstitute.org/news/2021-09-using-the-gnomad-ancestry-principal-components-analysis-loadings-and-random-forest-classifier-on-your-dataset/">
          using the gnomAD ancestry principal components analysis loadings and random forest
          classifier on your dataset
        </ExternalLink>
        .
      </p>

      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Principal component analysis (PCA) variant loadings"
            path="/release/2.1/pca/gnomad.r2.1.pca_loadings.ht"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Random forest (RF) model"
            path="/release/2.1/pca/gnomad.r2.1.RF_fit.pkl"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="v2-resources">Resources</SectionTitle>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Exome calling regions"
            path="/intervals/exome_calling_regions.v1.interval_list"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Genome calling regions"
            path="/intervals/hg19-v0-wgs_evaluation_regions.v1.interval_list"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="All pLoF variants"
            path="/papers/2019-flagship-lof/v1.0/gnomad.v2.1.1.all_lofs.txt.bgz"
          />
        </ListItem>
      </FileList>
    </section>
  </React.Fragment>
)
