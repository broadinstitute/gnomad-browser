import React from 'react'

import { Link, List, ListItem } from '@gnomad/ui'

import {
  FileList,
  GenericDownloadLinks,
  GetUrlButtons,
  IndexedFileDownloadLinks,
  SectionTitle,
} from './downloadsPageStyles'

const coverageFiles = [
  { chrom: '1', size: '121.55 MiB', md5: '8b731303596cd0679901bdae25ae654a' },
  { chrom: '2', size: '90.79 MiB', md5: '9a4bd5fb85a33dc6bde9c932341f9c31' },
  { chrom: '3', size: '70.64 MiB', md5: '8478c82b6c9ab8e809beb292d2e7db81' },
  { chrom: '4', size: '47.61 MiB', md5: '1c6133720ac5c7d3f02c28294bee2de3' },
  { chrom: '5', size: '54.83 MiB', md5: '2f9f69c09f22ec5a1f82e0b7ae8e2305' },
  { chrom: '6', size: '61.85 MiB', md5: 'c966f6c3edc6b765077c3e67bf7bd1d6' },
  { chrom: '7', size: '59.2 MiB', md5: '36ddc76034139a05521bbdf5aa99c0a3' },
  { chrom: '8', size: '42.09 MiB', md5: '4e062b04b24312c213a295dbd39ba038' },
  { chrom: '9', size: '49.1 MiB', md5: '5819b51d6ab2de6d1eaa1e5319b97f8f' },
  { chrom: '10', size: '48.53 MiB', md5: '701c07357a8b3de9b7700bc668f8bbb1' },
  { chrom: '11', size: '71.92 MiB', md5: 'c144266babddf8dacaea59016d8205c1' },
  { chrom: '12', size: '66.15 MiB', md5: '13e7b9051ba705da601d82173bf20458' },
  { chrom: '13', size: '21.78 MiB', md5: '9adaeba72ff1722ef00bd7a00ec90dad' },
  { chrom: '14', size: '40.46 MiB', md5: '3a4917008415ba8e50dcd821010b9f07' },
  { chrom: '15', size: '43.05 MiB', md5: '50cfce80e42d66627cc89c53a5c1724d' },
  { chrom: '16', size: '52.89 MiB', md5: '7cdc218a4dbd3dc1f0d168127fa0e71e' },
  { chrom: '17', size: '71.83 MiB', md5: '1f9e9fa7d010fb1cf7e3348e5eec568f' },
  { chrom: '18', size: '18.98 MiB', md5: '964467483c15bd37ffd8e9c83cc65033' },
  { chrom: '19', size: '78.92 MiB', md5: '4af2ebb9460fcb1bc572262479b84063' },
  { chrom: '20', size: '29.74 MiB', md5: 'cddbed4801a75607d1ccd3244acf9f0f' },
  { chrom: '21', size: '12.49 MiB', md5: '03787ccb8aea3ceb8a7bc363200fc817' },
  { chrom: '22', size: '26.81 MiB', md5: '36023dcc64c9fa2dd8af6fce50051429' },
  { chrom: 'X', size: '46.46 MiB', md5: '8bdd0a3a62e3d45db0b9fcf7730bef3e' },
  { chrom: 'Y', size: '1.6 MiB', md5: 'cc42d39bde6e6591901060b3c43b3956' },
]

export default () => (
  <React.Fragment>
    <p>
      The ExAC data set contains data from 60,706 exomes, all mapped to the GRCh37/hg19 reference
      sequence.
    </p>
    <section>
      <h2>Summary</h2>
      {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
      <List>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#exac-variants">Variants</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#exac-coverage">Coverage</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#exac-constraint">Constraint</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#exac-regional-missense-constraint">Regional Missense Constraint</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#exac-resources">Resources</Link>
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
          <Link href="#exac-other">Other</Link>
        </ListItem>
      </List>
    </section>

    <section>
      <SectionTitle id="exac-variants">Variants</SectionTitle>
      <h3>Exomes</h3>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <IndexedFileDownloadLinks
            label="All chromosomes VCF"
            path="/legacy/exac_browser/ExAC.r1.sites.vep.vcf.gz"
            size="4.56 GiB"
            md5="f2b57a6f0660a00e7550f62da2654948"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="exac-coverage">Coverage</SectionTitle>
      <FileList>
        {coverageFiles.map(({ chrom, md5, size }) => (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          <ListItem key={chrom}>
            <GenericDownloadLinks
              label={`chr${chrom} exome coverage summary TSV`}
              path={`/legacy/exac_browser/coverage/Panel.chr${chrom}.coverage.txt.gz`}
              size={size}
              md5={md5}
            />
          </ListItem>
        ))}
      </FileList>
    </section>

    <section>
      <SectionTitle id="exac-constraint">Constraint</SectionTitle>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Gene constraint scores TSV"
            path="/legacy/exac_browser/forweb_cleaned_exac_r03_march16_z_data_pLI_CNV-final.txt.gz"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="exac-regional-missense-constraint">
        Regional Missense Constraint
      </SectionTitle>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Regional missense constraint TSV"
            path="/legacy/exac_browser/regional_missense_constraint.tsv"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="exac-resources">Resources</SectionTitle>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GenericDownloadLinks
            label="Exome calling regions"
            path="/intervals/exome_calling_regions.v1.interval_list"
          />
        </ListItem>
      </FileList>
    </section>

    <section>
      <SectionTitle id="exac-other">Other</SectionTitle>
      <FileList>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Manuscript data"
            path="/legacy/exacv1_downloads/release1/manuscript_data"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="Subset VCFs (non-TCGA and non-psych)"
            path="/legacy/exacv1_downloads/release1/subsets"
          />
        </ListItem>
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <ListItem>
          <GetUrlButtons
            label="CNV counts and intolerance scores"
            path="/legacy/exacv1_downloads/release0.3.1/cnv"
          />
        </ListItem>
      </FileList>
    </section>
  </React.Fragment>
)
