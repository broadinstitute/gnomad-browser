import React from 'react'

import { ListItem } from '@gnomad/ui'

import { FileList, GenericDownloadLinks, SectionTitle } from './downloadsPageStyles'

const ResearchDownloads = () => {
  return (
    <>
      <p>
        The research data set contains data from various research projects that are relevant to
        gnomAD, and the datasets are not curated by the gnomAD Production Team. Each dataset has an
        accompanying README file explaining what it contains.
      </p>
      <section>
        <SectionTitle id="research-genomic-constraint">Genomic constraint</SectionTitle>
        <p>For more information about these files, see the README included in the download.</p>
        <FileList>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="README"
              gcsBucket="gnomad-nc-constraint-v31-paper"
              path="/download_files/nc_constraint_gnomad_v31_README.docx"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Raw genomic constraint by 1kb regions"
              gcsBucket="gnomad-nc-constraint-v31-paper"
              path="/download_files/constraint_z_genome_1kb.raw.download.txt.gz"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="QCed genomic constraint by 1kb regions"
              gcsBucket="gnomad-nc-constraint-v31-paper"
              path="/download_files/constraint_z_genome_1kb.qc.download.txt.gz"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
          {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <ListItem>
            <GenericDownloadLinks
              label="Non-coding constraint for gene tissue enhancers"
              gcsBucket="gnomad-nc-constraint-v31-paper"
              path="/download_files/constraint_z_enh_gene_roadmaplinks.all.download.txt.gz"
              includeAWS={false}
              includeAzure={false}
            />
          </ListItem>
        </FileList>
      </section>
    </>
  )
}

export default ResearchDownloads
