---
question: "I can find my variant of interest by searching for the particular variant, but why doesn't it show up in the variant table when I type the gene into the search bar?"
---

A gene search in the new browser will return variants in the CDS regions of the gene or within 75 base pairs of a CDS region. This behavior means that not all intronic or UTR variants will appear when doing a gene search or downloading the CSV tables, leading to fewer variants being displayed on the browser than what is present in the downloadable VCFs (which will contain all variants). You can also do a region search (example: [https://gnomad.broadinstitute.org/region/1-55510000-55512000](/region/1-55510000-55512000)) to bring up intronic variants. We are working on an option to include UTR variants in the results.
