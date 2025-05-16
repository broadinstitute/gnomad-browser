The OurDNA browser is a resource intended for clinicians and researchers. If you are part of one of our OurDNA communities and you would like to learn more about the program, please visit the [OurDNA website](https://www.ourdna.org.au) to learn more.
<br />
<br />

## The Centre for Population Genomics


[The Centre for Population Genomics](https://populationgenomics.org.au) (CPG) is a not-for-profit research initiative, jointly based at the Garvan Institute of Medical Research and the Murdoch Children’s Research Institute, working to build a more equitable future for genomic medicine. At CPG, we celebrate and respect diversity in our team and our work. We believe that including all human diversity in genomic research will empower medical care that benefits everyone.

Our principles:

1. **Respect**: CPG respects the rights and agency of individuals and communities with regard to their data and scientific results;

2. **Diversity**: CPG works to expand representation of diverse communities in genomic datasets;

3. **Openness**: CPG practices open science, releasing data, code, and scientific results as rapidly and openly as possible;

4. **Scalability**: CPG builds platforms and approaches that are robust for use at population scale;

5. **Connectedness**: CPG is part of and helps to build a global network of leading genomic research teams.
<br />
<br />

## The OurDNA program

The OurDNA program is a flagship initiative of the Centre for Population Genomics to increase the genomic representation of Australian multicultural communities. The OurDNA program aims to aggregate and share genetic variation data from over 20,000 Australians, including 8,000 new high-quality whole genome sequences from participants from genomically underrepresented groups recruited following participatory community engagement.

The OurDNA program is overseen by the director of the Centre for Population Genomics, Daniel MacArthur. To learn more about program governance and institutional support, please visit our [Funding](/about) and [Team](/team) pages.

The OurDNA program is currently producing three key resources:

* OurDNA Samples - a lab that stores participants’ donated blood and cells for future health and medical research according to participants’ consent

* OurDNA Data - a controlled-access repository of participants’ individual-level genomic information for future research according to participants’ consent

* OurDNA Browser - an open access genome reference database for use by clinicians and researchers to guide disease prediction, diagnosis and treatment
<br />
<br />

## The OurDNA Browser

The OurDNA browser provides access to harmonised, aggregated genome and exome sequences from the OurDNA program. The OurDNA dataset includes healthy individuals that self-identify as having ancestry from East Africa, Middle East and North Africa, Oceania, and Southeast Asia. Data from the OurDNA browser is designed to integrate with clinical pipelines to support researchers and doctors to find disease-causing genes, understand diversity and improve medical treatments for Australians of diverse backgrounds. 

To read more about OurDNA program, please see the [program website](https://www.ourdna.org.au) and the [CPG Zenodo Community](https://zenodo.org/communities/populationgenomics/records). For a [select bibliography](https://populationgenomics.org.au/about-us/resources/publications/) for the Centre for Population Genomics, Centre [talks](https://populationgenomics.org.au/about-us/resources/talks/), and for information on the CPG’s open source [software tools](https://populationgenomics.org.au/about-us/resources/software-tools-2/) that support the OurDNA dataset, please see the [Centre for Population Genomics](https://populationgenomics.org.au) website.

The aggregation and release of summary data from the genomes collected by the OurDNA program has been approved by the Royal Children's Hospital Human Research Ethics Committee (HREC/91986/RCHM-2023).

The OurDNA dataset is composed of:

- v1 (GRCh38)
  - 6,101 genomes
  - 11,945 exomes

[See our stats page](/stats) for additional summary statistics.
<br />
<br />

## Methods

The OurDNA dataset contains individuals sequenced using a mix of exome and genome capture methods and sequencing chemistries, so coverage varies between individuals and across sites. This variation in coverage is incorporated into the variant frequency calculations for each variant. gnomAD was QCed and analyzed using the [Hail](https://hail.is) open-source framework for scalable genetic analysis. 

All of the raw data from contributing projects and the OurDNA project have been (re)processed through equivalent pipelines to increase consistency across projects. Short-read whole genome sequencing data was processed according to the DRAGEN-GATK Best Practices guidelines. This includes alignment to GRCh38 using the open-source DRAGEN mapper (DRAGMAP, v1.3.0), and variant calling with GATK v4.2.6.1 HaplotypeCaller to discover single-nucleotide variants (SNVs) and insertion-deletions (indels). All samples were aggregated using the hail gVCF Combiner, and then sample and variant quality control was performed on the joint call set in line with gnomAD best practices.

For details on dataset releases, including methodologies for annotation and QC, please refer to the OurDNA browser [blog](/news). For details on the software releases that support the browser, please see the browser’s [GitHub page](https://github.com/populationgenomics/gnomad-browser). Further description of methodologies will be included in a forthcoming flagship paper.

Aggregate data download is currently under development. Please check back for a release date.

## Funding

Garvan Institute of Medical Research (https://ror.org/01b3dvp57 ) and Murdoch Children’s Research Institute (https://ror.org/048fyec77 ) contribute to the development of this resource via their significant funding support for the Centre for Population Genomics, enabled through the generosity of donors.

Funding for this research has also been provided by the Australian Government’s Medical Research Future Fund (MRFF) grant 2015969 (CIA Daniel MacArthur; 2022-2027) from the Genomics Health Futures Mission and by the National Health and Medical Research Council (NHMRC) investigator grant 2009982 (CIA Daniel MacArthur; 2022-2026).

The contents of this published material are solely the responsibility of the authors and do not reflect the views of the Commonwealth of Australia or the NHMRC.

The OurDNA program also receives support from Google’s Digital Future Initiative.

## Contributors

### Data contributors

- BioHEART (Gemma Figtree)
- Mackenzie's Mission
- OurDNA (Daniel MacArthur)
- Tasmanian Ophthalmic Biobank Whole Genome Sequencing (Alex Hewitt)
