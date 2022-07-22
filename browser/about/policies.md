## gnomAD Ethics Policy

Data included in the gnomAD database has met our ethical requirements including the Principal Investigator (PI) of all shared datasets signing our [memorandum of understanding (MoU)](https://gnomad.broadinstitute.org/mou), and careful review of each study’s consent by Broad-employed regulatory experts to ensure data is appropriately consented for sharing.

## gnomAD Data Preservation Policy

While we hope gnomAD exists for decades to come, we recognize the importance of having a plan in place for preserving gnomAD datasets. Through our [collaboration](https://gnomad.broadinstitute.org/news/2020-10-open-access-to-gnomad-data-on-multiple-cloud-providers/) with Google Cloud Platform (GCP), Microsoft’s Azure, and Amazon Web Services (AWS), we have ensured that the public would continue to have access to any past gnomAD datasets as long as at least one of those public dataset hosting entities remains in business. Additionally we will do everything possible to sustain the existing browser for as long as financial/staffing commitments allow.

## gnomAD Open Science Policy

The gnomAD team has a firm commitment to open science. This includes, but is not limited to, making our data and code open-source, posting pre-prints, and prioritizing publishing in journals that support open access.

## Terms of use

All data here are released openly and publicly for the benefit of the wider biomedical community. You can freely download and search the data, and we encourage the use and publication of results generated from these data. **There are absolutely no restrictions or embargoes on the publication of results derived from gnomAD data**. However, we encourage you to [contact the consortium](mailto:gnomad@broadinstitute.org) before embarking on large-scale analyses to check if your proposed analysis overlaps with work currently underway by the gnomAD consortium. All users of gnomAD data agree to not attempt to reidentify participants.

This data set has been subjected to extensive quality control, but variant calling and filtering from short-read sequencing data is an imperfect and probabilistic process, so many errors no doubt remain. If you spot any results that seem impossible, or suggest some kind of serious processing or variant-calling artifact, don't panic: use the "report variant" form on the corresponding variant page or [email us](mailto:gnomad@broadinstitute.org) to let us know, and we'll do our best to address it.

The data released by gnomAD are available free of restrictions under the [Creative Commons Zero Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/). This means that you can use it for any purpose without legally having to give attribution. However, we request that you actively acknowledge and give attribution to the gnomAD project, and link back to the relevant page, wherever possible. Attribution supports future efforts to release other data. It also reduces the amount of "orphaned data", helping retain links to authoritative sources.

Screenshots of the website may also be used without restriction. As with any use of gnomAD data, we request that you actively acknowledge and give attribution to the gnomAD project, and link back to the relevant page, wherever possible.

## Citation in publications

We request that any use of data obtained from the gnomAD browser cite [the gnomAD flagship paper](https://broad.io/gnomad_lof) and any online resources that include the data set provide a link to the browser. For use of the SV data, we request cite [this paper](https://broad.io/gnomad_sv) for use of the SV data.

There is no need to include us as authors on your manuscript, unless we contributed specific advice or analysis for your work.

## Data Generation

A full description of the methods used to aggregate and call variants across the exomes and genomes in this project will be provided shortly. In brief: we pulled raw data together from as many exomes and genomes as we could get our hands on, aligned and processed each of these data types through unified processing pipelines based on Picard, and performed variant calling with the GATK HaplotypeCaller following GATK best practices. Processing and variant calling at this enormous scale was only possible thanks to the hard work of the Broad Institute's Data Sciences Platform, and the Intel GenomicsDB team. Downstream analysis relied heavily on the [Hail](https://hail.is/) toolkit.
