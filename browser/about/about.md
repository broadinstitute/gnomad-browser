The Genome Aggregation Database (gnomAD), originally launched in 2014 as the Exome Aggregation Consortium (ExAC), is the result of a coalition of investigators willing to share aggregate exome and genome sequencing data from a variety of large-scale sequencing projects, and make summary data available for the wider scientific community. The project is overseen by co-directors Heidi Rehm and Mark Daly, and steering committee members Samantha Baxter, Katherine Chao, Julia Goodrich, Konrad Karczewski, Daniel MacArthur, Benjamin Neale, Anne O'Donnell-Luria, Kaitlin Samocha, Matthew Solomonson, and Michael Talkowski. To learn more about the team that produces gnomAD please see our [team page](/team). A list of investigators and groups that have contributed data is available below.

The gnomAD database is composed of exome and genome sequences from around the world. We have removed cohorts that were recruited for pediatric disease, except for a small number of diverse cohorts where we have included unaffected relatives. As such, the gnomAD resource should serve as useful reference sets of allele frequencies for severe pediatric disease studies - however, note that some individuals with severe disease may still be included in the data sets such as biobanks, albeit likely at a frequency equivalent to or lower than that seen in the general population.

All of the raw data from these projects have been reprocessed through equivalent pipelines, and jointly variant-called to increase consistency across projects. The processing pipelines were written in the [WDL workflow definition language](https://software.broadinstitute.org/wdl/) and executed using the [Cromwell execution engine](https://github.com/broadinstitute/cromwell), open-source projects for defining and executing genomic workflows at massive scale on multiple platforms. The gnomAD data set contains individuals sequenced using multiple exome capture methods and sequencing chemistries, so coverage varies between individuals and across sites. This variation in coverage is incorporated into the variant frequency calculations for each variant. gnomAD was QCed and analyzed using the [Hail](https://hail.is/) open-source framework for scalable genetic analysis. The full gnomAD datasets are released publicly via [download](/downloads) for the benefit of the wider biomedical community. For terms of use and other policies please see our [policy page](/policies).

For the specific details on any of our releases, including methods for annotation and QC, the calling of [structural variants](https://gnomad.broadinstitute.org/news/2019-03-structural-variants-in-gnomad/), [mitochondrial variants](https://gnomad.broadinstitute.org/news/2020-11-gnomad-v3-1-mitochondrial-dna-variants/), and [STRs](https://gnomad.broadinstitute.org/news/2022-01-the-addition-of-short-tandem-repeat-calls-to-gnomad/) as well as guidance for use of gnomAD-specific metrics and browser features, please see our [blog posts](https://gnomad.broadinstitute.org/news/), [help page](/help) and [publications](/publications).

The aggregation and release of summary data from the exomes and genomes collected by the Genome Aggregation Database has been approved by the Mass General Brigham IRB (protocol 2013P001339, "Large-scale aggregation of human genomic data").

<br />

## Stats

- v4 release is composed of 730,947 exomes and 76,215 genomes (GRCh38)
- gnomAD v4 structural variants (SV) represent 63,046 genomes (GRCh38)
- gnomAD v4 copy number variants (CNV) represent variants in less than 1% of 464,297 exomes (GRCh38)

For more Stats on gnomAD v4 please see our [stats page](/stats)
