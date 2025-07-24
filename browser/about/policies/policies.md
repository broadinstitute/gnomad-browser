## gnomAD Ethics Policy

Data included in the gnomAD database has met our ethical requirements including the Principal Investigator (PI) of all shared datasets signing our [memorandum of understanding (MoU)](https://gnomad.broadinstitute.org/mou), and careful review of each study’s consent by Broad-employed regulatory experts to ensure data is appropriately consented for sharing.

## gnomAD Data Preservation Policy

While we hope gnomAD exists for decades to come, we recognize the importance of having a plan in place for preserving gnomAD datasets. Through our [collaboration](https://gnomad.broadinstitute.org/news/2020-10-open-access-to-gnomad-data-on-multiple-cloud-providers/) with Google Cloud Platform (GCP), Microsoft’s Azure, and Amazon Web Services (AWS), we have ensured that the public would continue to have access to any past gnomAD datasets as long as at least one of those public dataset hosting entities remains in business. Additionally we will do everything possible to sustain the existing browser for as long as financial/staffing commitments allow.

## Data Generation

A full description of the methods used to aggregate and call variants across the exomes and genomes in this project will be provided shortly. In brief: we pulled raw data together from as many exomes and genomes as we could get our hands on, aligned and processed each of these data types through unified processing pipelines based on Picard, and performed variant calling with the GATK HaplotypeCaller following GATK best practices. Processing and variant calling at this enormous scale was only possible thanks to the hard work of the Broad Institute's Data Sciences Platform, and the Intel GenomicsDB team. Downstream analysis relied heavily on the [Hail](https://hail.is/) toolkit.

## Public Release of Low Frequency Allele Count

The vast majority of variants being discovered within large population datasets – and in particular those with the greatest functional impact – are extremely rare. Some genomic data generating programs limit the ability to share allele counts (AC) below a certain threshold. However, sharing summary statistics for all variants, including those found only in a single individual, is critical for scientific progress and discovery. Obscuring information about this rare variation would be reasonable if the risks to participants were large, but the experiences of many other large genomics initiatives illustrate that the actual risks to privacy are quite small. Follow [this link](/AC1) to read our full statement supporting public release of low frequency allele count summary statistics.
