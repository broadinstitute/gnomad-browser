---
index: gnomad_help
title: 'About gnomAD'
---

# About gnomAD

The Genome Aggregation Database (gnomAD), is a coalition of investigators seeking to aggregate and harmonize exome and genome sequencing data from a variety of large-scale sequencing projects, and to make summary data available for the wider scientific community. In its first release, which contained exclusively exome data, it was known as the Exome Aggregation Consortium (ExAC).

The data set provided on this website spans 125,748 exomes and 15,708 genomes from unrelated individuals sequenced as part of various disease-specific and population genetic studies. [This blog post](https://macarthurlab.org/2018/10/09/gnomad-v2-1) describes the latest release. We have removed individuals known to be affected by severe pediatric disease, as well as their first-degree relatives, so this data set should serve as a useful reference set of allele frequencies for severe disease studies - however, note that some individuals with severe disease may still be included in the data set, albeit likely at a frequency equivalent to or lower than that seen in the general population.

All of the raw data from these projects have been reprocessed through the same pipeline, and jointly variant-called to increase consistency across projects. The processing pipelines were written in the [WDL workflow definition language](https://software.broadinstitute.org/wdl/) and executed using the [Cromwell execution engine](https://github.com/broadinstitute/cromwell), open-source projects for defining and executing genomic workflows at massive scale on multiple platforms. The gnomAD data set contains individuals sequenced using multiple exome capture methods and sequencing chemistries, so coverage varies between individuals and across sites. This variation in coverage is incorporated into the variant frequency calculations for each variant.

gnomAD was QCed and analysed using the [Hail](https://hail.is/) open-source framework for scalable genetic analysis.

A list of gnomAD Principal Investigators and groups that have contributed data and analysis to the current release is available below.

The generation of this call set was funded primarily by the Broad Institute, and the data here are released publicly for the benefit of the wider biomedical community. There are no publication restrictions or embargoes on these data. Please cite the [ExAC paper](http://www.nature.com/nature/journal/v536/n7616/full/nature19057.html) for any use of these data.

The data are available under the [ODC Open Database License (ODbL)](ODC Open Database License (ODbL)) (summary available [here](http://www.opendatacommons.org/licenses/odbl/1-0/summary/)): you are free to share and modify the gnomAD data so long as you attribute any public use of the database, or works produced from the database; keep the resulting data-sets open; and offer your shared or adapted version of the dataset under the same ODbL license.

The aggregation and release of summary data from the exomes and genomes collected by the Genome Aggregation Database has been approved by the Partners IRB (protocol 2013P001339, "Large-scale aggregation of human genomic data").

For bug reports, please file an issue on [Github](https://github.com/macarthur-lab/gnomad_browser/issues).
