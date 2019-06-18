import React from 'react'

import { ExternalLink, Link } from '@broad/ui'

export default () => (
  <React.Fragment>
    <p>
      The <ExternalLink href="http://epi-25.org">Epi25 collaborative</ExternalLink> is a global
      collaboration committed to aggregating, sequencing, and deep-phenotyping up to 25,000 epilepsy
      patients to advance epilepsy genetics research. Partnering with the Broad Institute, Epi25 has
      sequenced more than 14,000 patients as of 2018 from 40 research cohorts across the world.
    </p>

    <p>
      The Epi25 whole-exome sequencing (WES) case-control study is one of the collaborative&apos;s
      ongoing endeavors that aims to characterize the contribution of rare genetic variation to a
      spectrum of epilepsy syndromes to identify individual risk genes. The browser displays the
      latest findings from the study—as part of the consortium’s deep dedication to data and
      resource sharing—with the hope of engaging the scientific community to generate hypotheses and
      facilitate discoveries.
    </p>

    <p>
      In the current release, we report gene burden results of ultra-rare deleterious variants
      (PTVs, missense variants with MPC&ge;2, and inframe indels not present in the DiscovEHR
      database) in three primary epilepsy types: developmental and epileptic encephalopathy (DEE,
      N=1,021), genetic generalized epilepsy (GGE, N=3,108), non-acquired focal epilepsy (NAFE,
      N=3,597), as well as the full epilepsy cohort (EPI, N=9,170). Each subgroup was compared
      against 8,364 controls aggregated from independent sources. Due to differences in ancestry and
      exome capture technologies across cohorts, we implemented stringent QC procedures to minimize
      confounding between cases and controls to arrive at the current dataset of 17,606 unrelated
      individuals of European descent. Details of variant-calling, QC, and analysis pipelines can be
      found on 
      <ExternalLink href="https://www.biorxiv.org/content/10.1101/525683v1">bioRxiv</ExternalLink>.
      The current findings recapitulate candidate genes for screened DEE patients and highlight a
      growing evidence of cation channel genes in the etiology of GGE and NAFE. With the continuing
      effort to recruit samples, many from non-European populations, we anticipate a boost in the
      detection power to identify risk-conferring genes in the coming years.
    </p>

    <p>
      This work is supported and maintained by a tremendous effort worldwide, including the Epi25
      principal investigators, NHGRI (CCDG), and the Stanley Center at the Broad Institute. We are
      especially grateful to all the{' '}
      <ExternalLink href="http://epi-25.org/epi25-members/">consortium members</ExternalLink> and
      patients for their gracious contribution to make this collaboration possible. We welcome any
      feedback! You can contact us by{' '}
      <ExternalLink href="mailto:yfeng@broadinstitute.org">email</ExternalLink> if you have any
      questions or suggestions.
    </p>

    <p>
      All{' '}
      <Link
        download
        href="https://storage.googleapis.com/epi-browser/downloads/Epi25_all_gene_results_2018_11_07.tsv.gz"
      >
        gene-level
      </Link>{' '}
      and{' '}
      <Link
        download
        href="https://storage.googleapis.com/epi-browser/downloads/Epi25_all_variant_results_2018_11_27.tsv.gz"
      >
        variant-level
      </Link>{' '}
      results are available for download.
    </p>

    <p>Analysis data last updated November 27th, 2018.</p>
  </React.Fragment>
)
