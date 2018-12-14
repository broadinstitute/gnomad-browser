import React from 'react'

const help = {
  geneResult: {
    title: 'Gene Burden Result',
    render: () => (
      <div>
        <p>
          These tables display the case-control gene burden for the full epilepsy cohort (EPI) and
          for each of the primary epilepsy types (DEE, GGE, and NAFE). Cases in the EPI table
          includes all 9,170 epilepsy patients (1,021 with DEE, 3,108 with GGE, 3,597 with NAFE, and
          1,444 with other epilepsy syndromes). Each of the case groups is compared against 8,364
          controls without known neuropsychiatric conditions.
        </p>
        <p>
          Given a functional category of deleterious variants, the numbers in the tables are the
          carrier counts of singletons (AC=1) absent in the DiscovEHR database (“ultra-rare”
          singletons) aggregated at the gene level. LoF stands for loss-of-function or
          protein-truncating variants; MPC for missense variants with an MPC score &ge;2; and
          Inframe indel for inframe insertions or deletions. DiscovEHR is a population allele
          frequency reference that contains 50,726 whole-exome sequences from a largely European and
          non-diseased adult population. The difference in the proportion of carriers between cases
          and controls is assessed using a two-tailed Fisher’s exact test.
        </p>
      </div>
    ),
  },
  variantTable: {
    render: () => (
      <p>
        The allele frequencies and association test statistics shown here are based on all-epilepsy
        (EPI) patients. Select an individual variant to view subgroup analysis results.
      </p>
    ),
  },
}

export default help
