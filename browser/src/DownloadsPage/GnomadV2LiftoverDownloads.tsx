import React from 'react'

import { Badge, ExternalLink, Link, List, ListItem } from '@gnomad/ui'

import {
  Column,
  ColumnsWrapper,
  FileList,
  GetUrlButtons,
  IndexedFileDownloadLinks,
  SectionTitle,
} from './downloadsPageStyles'

const liftoverExomeChromosomeVcfs = [
  { chrom: '1', size: '5.3 GiB', md5: '6afa2df088f1627eb649c6d24d8784e8' },
  { chrom: '2', size: '3.85 GiB', md5: '570b5aee023938c7b5ab660f28a79651' },
  { chrom: '3', size: '3.02 GiB', md5: '29dd5e955afe7cc9c8342aa1ee88e099' },
  { chrom: '4', size: '1.99 GiB', md5: '560e0fb2c514411ea35638fb2b2a35bf' },
  { chrom: '5', size: '2.31 GiB', md5: '5e777b38fe2437b56b32b455de80015c' },
  { chrom: '6', size: '2.6 GiB', md5: '8815cd575bd71504d8dd243136995d16' },
  { chrom: '7', size: '2.62 GiB', md5: '70d4fbaf888017ab0a12e3c0dced5700' },
  { chrom: '8', size: '1.95 GiB', md5: '39017f2660ac88916a6a9470f0192eda' },
  { chrom: '9', size: '2.2 GiB', md5: '9c683f3b8a17e2aee1eac8b5ad860edf' },
  { chrom: '10', size: '2.04 GiB', md5: '72073e8257316017f5356b986b779dd2' },
  { chrom: '11', size: '3.32 GiB', md5: '89bf2840850664fad81d2f1277bd0d7a' },
  { chrom: '12', size: '2.82 GiB', md5: '50b5cb95f9d7125e385ee3153992fea1' },
  { chrom: '13', size: '892.17 MiB', md5: '8bf51379fa45b205461eb27a8664f2c2' },
  { chrom: '14', size: '1.85 GiB', md5: '75bdaaea3b2ace57cd1165799b29fbd5' },
  { chrom: '15', size: '1.91 GiB', md5: '30f244130bf6ac58006463cd87d56272' },
  { chrom: '16', size: '2.81 GiB', md5: '1ac5e4d7d6ee3255ceedd652691b6cd0' },
  { chrom: '17', size: '3.33 GiB', md5: '947b32de25fe137a8cc95948b852e757' },
  { chrom: '18', size: '810.06 MiB', md5: '6bf85f4d674917346d3b658646b4fdbf' },
  { chrom: '19', size: '3.94 GiB', md5: 'f882913ec97cdbbbf195b777ca4be732' },
  { chrom: '20', size: '1.32 GiB', md5: '9167cd594f30321fec62f31ade758c2c' },
  { chrom: '21', size: '599.31 MiB', md5: '113d7a5d058b617c60db768ce527a96f' },
  { chrom: '22', size: '1.31 GiB', md5: '394dc422f48914496646f33e92eacd27' },
  { chrom: 'X', size: '1.19 GiB', md5: '047145d2b7fb416b516566201e1bc694' },
  { chrom: 'Y', size: '14.18 MiB', md5: '4b8cfe3f9051050c94948dab4871c9ce' },
]

const liftoverGenomeChromosomeVcfs = [
  { chrom: '1', size: '33.37 GiB', md5: '49a18c485dbf68fa6bc92312c4a646eb' },
  { chrom: '2', size: '35.88 GiB', md5: 'c5f5ec623377b1d2dbc30502cd31d086' },
  { chrom: '3', size: '29.47 GiB', md5: '0ad77689edb3bc731c71d6d140dfaacd' },
  { chrom: '4', size: '28.47 GiB', md5: 'e0b1dc365600bc31cb48debb6b03c561' },
  { chrom: '5', size: '26.56 GiB', md5: 'ea53a6e364cade4f6ed5504d5cd14d62' },
  { chrom: '6', size: '24.88 GiB', md5: 'b717eb2c2154740558ca3f62adf30a4a' },
  { chrom: '7', size: '24.37 GiB', md5: '5b97c8c80b9b8404f611d5725d4f563d' },
  { chrom: '8', size: '22.99 GiB', md5: 'f502012b3b6fd771e1f97878d4c89831' },
  { chrom: '9', size: '18.76 GiB', md5: 'd9cb3ac24eb9cdd891bbeaf554b7f701' },
  { chrom: '10', size: '19.93 GiB', md5: '8b4573aee1f13efcaa822a736cea3be3' },
  { chrom: '11', size: '20.53 GiB', md5: '340101c9092be9a2e408c82c78f860fc' },
  { chrom: '12', size: '19.97 GiB', md5: 'e7612e7a222cbf7077f3766eb793f75b' },
  { chrom: '13', size: '13.99 GiB', md5: 'e8146ed73263cfc6c733bcb9e942a05f' },
  { chrom: '14', size: '13.71 GiB', md5: '3b437d953f169a299df69ab51726117a' },
  { chrom: '15', size: '12.92 GiB', md5: 'd03e682c7271dac3d333da2aab17b486' },
  { chrom: '16', size: '14.51 GiB', md5: 'f38fe23fe7bdc3debf5f43945f160383' },
  { chrom: '17', size: '12.67 GiB', md5: '732e899517000c1505898ca918a38267' },
  { chrom: '18', size: '11.34 GiB', md5: 'de2e98425c57ba805145dea4f2483867' },
  { chrom: '19', size: '10.48 GiB', md5: '60f5d011e1684f6db81b3d052ae75bc0' },
  { chrom: '20', size: '9.04 GiB', md5: '1da4057634c7143a0f33f61f49ebbe5f' },
  { chrom: '21', size: '5.77 GiB', md5: 'be37bea3ac95097021e8c130291d45de' },
  { chrom: '22', size: '6.07 GiB', md5: '0f5703d8373516eb3753bcf89a547621' },
  { chrom: 'X', size: '16.41 GiB', md5: '898a122480632cfdc58450bbbb3554c1' },
]

export default () => (
  <React.Fragment>
    <p>
      The gnomAD v2.1.1 liftover data set contains data from 125,748 exomes and 15,708 whole
      genomes, lifted over from the GRCh37 to the GRCh38 reference sequence.
    </p>
    <section>
      <h2>Summary</h2>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <List>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-liftover-variants">Variants (GRCh38 liftover)</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#v2-liftover-structural-variants">Structural variants (GRCh38 liftover)</Link>
        </ListItem>
      </List>
    </section>

    <section>
      <SectionTitle id="v2-liftover-variants">Variants (GRCh38 liftover)</SectionTitle>
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
                path="/release/2.1.1/liftover_grch38/ht/exomes/gnomad.exomes.r2.1.1.sites.liftover_grch38.ht"
              />
            </ListItem>

            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              <IndexedFileDownloadLinks
                label="All chromosomes VCF"
                path="/release/2.1.1/liftover_grch38/vcf/exomes/gnomad.exomes.r2.1.1.sites.liftover_grch38.vcf.bgz"
                size="85.31 GiB"
                md5="cff8d0cfed50adc9211d1feaed2d4ca7"
              />
            </ListItem>
            {liftoverExomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              <ListItem key={chrom}>
                <IndexedFileDownloadLinks
                  label={`chr${chrom} sites VCF`}
                  path={`/release/2.1.1/liftover_grch38/vcf/exomes/gnomad.exomes.r2.1.1.sites.${chrom}.liftover_grch38.vcf.bgz`}
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
                path="/release/2.1.1/liftover_grch38/ht/genomes/gnomad.genomes.r2.1.1.sites.liftover_grch38.ht"
              />
            </ListItem>
            {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
            <ListItem>
              <IndexedFileDownloadLinks
                label="All chromosomes VCF"
                path="/release/2.1.1/liftover_grch38/vcf/genomes/gnomad.genomes.r2.1.1.sites.liftover_grch38.vcf.bgz"
                size="743.06 GiB"
                md5="83de3d5b52669f714e810d4fcf047c18"
              />
            </ListItem>
            {liftoverGenomeChromosomeVcfs.map(({ chrom, size, md5 }) => (
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              <ListItem key={chrom}>
                <IndexedFileDownloadLinks
                  label={`chr${chrom} sites VCF`}
                  path={`/release/2.1.1/liftover_grch38/vcf/genomes/gnomad.genomes.r2.1.1.sites.${chrom}.liftover_grch38.vcf.bgz`}
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
      <SectionTitle id="v2-liftover-structural-variants">
        Structural variants (GRCh38 liftover)
      </SectionTitle>
      <p>
        <Badge level="info">Note</Badge> The lifted over structural variant dataset was created by
        dbVar and has not been assessed by the gnomAD production team.
      </p>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://www.ncbi.nlm.nih.gov/sites/dbvarapp/studies/nstd166/">
            nstd166 (gnomAD Structural Variants)
          </ExternalLink>
        </ListItem>
      </FileList>
    </section>
  </React.Fragment>
)
