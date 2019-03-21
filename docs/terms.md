---
index: gnomad_help
title: 'Terms'
---

# Terms

All data here are released openly and publicly for the benefit of the wider biomedical community. You can freely download and search the data, and we encourage the use and publication of results generated from these data. **There are absolutely no restrictions or embargoes on the publication of results derived from gnomAD data**. However, we encourage you to [contact the consortium ](exomeconsortium@gmail.com) before embarking on large-scale analyses to check if your proposed analysis overlaps with work currently underway by the gnomAD consortium.

This data set has been subjected to extensive quality control, but variant calling and filtering from short-read sequencing data is an imperfect and probabilistic process, so many errors no doubt remain. If you spot any results that seem impossible, or suggest some kind of serious processing or variant-calling artifact, don't panic: use the "report variant" form on the corresponding variant page or [email us](exomeconsortium@gmail.com) to let us know, and we'll do our best to address it.

These data are available under the [ODC Open Database License (ODbL)](http://opendatacommons.org/licenses/odbl/1.0/) (summary available [here](http://www.opendatacommons.org/licenses/odbl/1-0/summary/)): you are free to share and modify gnomAD data so long as you attribute any public use of the database, or works produced from the database; keep the resulting data-sets open; and offer your shared or adapted version of the dataset under the same ODbL license.

## Citation in publications

We request that any use of data obtained from the gnomAD browser cite the [ExAC paper](http://www.nature.com/nature/journal/v536/n7616/full/nature19057.html). This will be updated when we get around to writing a gnomAD paper.

There's no need to include us as authors on your manuscript, unless we contributed specific advice or analysis for your work. However, we ask that the Consortium be acknowledged in publications as follows:

> The authors would like to thank the Genome Aggregation Database (gnomAD) and the groups that provided exome and genome variant data to this resource. A full list of contributing groups can be found at <https://gnomad.broadinstitute.org/about>.


## Data generation

A full description of the methods used to aggregate and call variants across the exomes and genomes in this project will be provided shortly. In brief: we pulled raw data together from as many exomes and genomes as we could get our hands on, aligned and processed each of these data types through unified processing pipelines based on Picard, and performed variant calling with the GATK HaplotypeCaller following GATK best practices. Processing and variant calling at this enormous scale was only possible thanks to the hard work of the Broad Institute's Data Sciences Platform, and the Intel GenomicsDB team. Downstream analysis relied heavily on the [Hail](https://hail.is) toolkit.
