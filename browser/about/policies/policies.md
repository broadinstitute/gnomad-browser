## gnomAD Ethics Policy

Data included in the gnomAD database has met our ethical requirements including the Principal Investigator (PI) of all shared datasets signing our [memorandum of understanding (MoU)](https://gnomad.broadinstitute.org/mou), and careful review of each study’s consent by Broad-employed regulatory experts to ensure data is appropriately consented for sharing.

## gnomAD Data Preservation Policy

While we hope gnomAD exists for decades to come, we recognize the importance of having a plan in place for preserving gnomAD datasets. Through our [collaboration](https://gnomad.broadinstitute.org/news/2020-10-open-access-to-gnomad-data-on-multiple-cloud-providers/) with Google Cloud Platform (GCP), Microsoft’s Azure, and Amazon Web Services (AWS), we have ensured that the public would continue to have access to any past gnomAD datasets as long as at least one of those public dataset hosting entities remains in business. Additionally we will do everything possible to sustain the existing browser for as long as financial/staffing commitments allow.

## gnomAD Open Science Policy

The gnomAD team has a firm commitment to open science. This includes, but is not limited to, making our data and code open-source, posting pre-prints, and prioritizing publishing in journals that support open access.

We request that developers integrating gnomAD data in their tools include a statement acknowledging the inclusion of gnomAD data (e.g., "This tool is powered by the gnomAD v4.1 release data."). However, to avoid confusion and misattribution, we ask that you refrain from incorporating "gnomAD"/"Genome Aggregation Database" into the name of your tool and from using the gnomAD logo without permission.

## Data Generation

A full description of the methods used to aggregate and call variants across the exomes and genomes in this project will be provided shortly. In brief: we pulled raw data together from as many exomes and genomes as we could get our hands on, aligned and processed each of these data types through unified processing pipelines based on Picard, and performed variant calling with the GATK HaplotypeCaller following GATK best practices. Processing and variant calling at this enormous scale was only possible thanks to the hard work of the Broad Institute's Data Sciences Platform, and the Intel GenomicsDB team. Downstream analysis relied heavily on the [Hail](https://hail.is/) toolkit.
