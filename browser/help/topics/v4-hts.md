---
id: v4-hts
title: 'gnomAD v4 Hail Tables'
---

All of gnomAD’s files are stored as Hail tables. In this section we will review:

- [Background on Hail](/help/v4-hts#background)
- [gnomAD Hail Table frequency annotations](/help/v4-hts#frequency-annotations)
- [gnomAD v4.1 Hail Table annotation descriptions](/help/v4-hts#annotation-descriptions)

Note that Hail Tables (HT), MatrixTables (MT), and VariantDatasets (VDS) are all **directories** when viewed through a file manager, so you will need to download all of the associated files.

### <a id="background"></a>Background

Hail is an open-source library that provides accessible interfaces for exploring genomic data, with a backend that automatically scales to take advantage of large compute clusters. Hail enables those without expertise in parallel computing to flexibly, efficiently, and interactively analyze large sequencing datasets. We recommend using Hail and our Hail utilities for gnomAD to work with the data listed in the gnomAD downloads page.

The Hail forum is a place to search for answers to Hail issues, post about any bugs found, engage with the Hail community and Hail team.

### <a id="frequency-annotations"></a>gnomAD Hail Table frequency annotations

The gnomAD release sites Hail Tables containing allele frequency information within the row annotation named '`freq`'.

The '`freq`' annotation is an array, and each element of the array is a struct that contains the alternate allele count (`AC`), alternate allele frequency (`AF`), total number of alleles (`AN`), and number of homozygous alternate individuals (`homozygote_count`) for a specific sample grouping.

Use the '`freq_index_dict`' global annotation to retrieve frequency information for a specific group of samples from the '`freq`' array. This global annotation is a dictionary keyed by sample grouping combinations whose values are the combination's index in the '`freq`' array. The groupings and their available options by version are listed in the table below.

| Category                     | Definition                             | Exome Options                                                                                                                                                                                                                                                                                  | Genome Options                                                                                                                                                                                                                                                                                                                                                                                                                                    | Joint (combined exome + genome) Options                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group`                      | Genotype's filter                      | adj<sup>1</sup>, raw                                                                                                                                                                                                                                                                           | adj<sup>1</sup>, raw                                                                                                                                                                                                                                                                                                                                                                                                                              | adj<sup>1</sup>, raw                                                                                                                                                                                                                                                                           |
| `sex`                        | Inferred sex/sex karyotype | XX, XY                                                                                                                                                                                                                                                                                         | XX, XY                                                                                                                                                                                                                                                                                                                                                                                                                                            | XX, XY                                                                                                                                                                                                                                                                                         |
| `subset`                     | Sample subsets within release          | non-UK Biobank (Download only)                                                                                                                                                                                                                                                                 | HGDP, 1KG (Download Hail Table only)                                                                                                                                                                                                                                                                                                                                                                                                              | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `gen_anc`                    | gnomAD inferred genetic ancestry group | `afr`, `amr`, `asj`, `eas`, `fin`, `mid`, `nfe`, `rmi`, `sas`                                                                                                                                                                                                                                  | `afr`, `ami`, `amr`, `asj`, `eas`, `fin`, `mid`, `nfe`, `rmi`,                                                                                                                                                                                                                                                                                                                                                                                     | `afr`, `amr`, `ami`, `asj`, `eas`, `fin`, `mid`, `nfe`, `rmi`, `sas`                                                                                                                                                                                                                            |
| `gen_anc` (1KG subset only)<sup>2</sup>  | The 1KG project's ancestry             | N/A                                                                                                                                                                                                                                                                                            | `acb`, `asw`, `beb`, `cdx`, `ceu`, `chb`, `chs`, `clm`, `esn`, `fin`, `gbr`, `gih`, `gwd`, `ibs`, `itu`, `jpt`, `khv`, `lwk`, `msl`, `mxl`, `pel`, `pjl`, `pur`, `stu`, `tsi`, `yri`                                                                                                                                                                                                                                                              | N/A                                                                                                                                                                                                                                                                                            |
| `gen_anc` (HGDP subset only)<sup>2</sup> | The HGDP's ancestry labels             | N/A                                                                                                                                                                                                                                                                                            | adygei, balochi, bantukenya, bantusafrica, basque, bedouin, biakapygmy, brahui, burusho, cambodian, colombian, dai, daur, druze, french, han, hazara, hezhen, italian, japanese, kalash, karitiana, lahu, makrani, mandenka, maya, mbutipygmy, melanesian, miaozu, mongola, mozabite, naxi, orcadian, oroqen, palestinian, papuan, pathan, pima, russian, san, sardinian, she, sindhi, surui, tu, tujia, tuscan, uygur, xibo, yakut, yizu, yoruba | N/A                                                                                                                                                                                                                                                                                            |
| `downsampling`<sup>3</sup>               | Downsampled sample counts              | gnomAD: 10, 100, 500, 1000, 2000, 2884, 5000, 10000, 13068, 16740, 19850, 20000, 22362, 26710, 30198, 43129, 50000, 100000, 200000, 500000, 556006, non-UKB: 10, 100, 500, 1000, 2000, 2074, 5000, 8847, 10000, 10492, 16549, 18035, 20000, 21870, 26572, 34899, 50000, 100000, 175054, 200000 | The genomes release Hail Table does not contain downsampling information.                                                                                                                                                                                                                                                                                                                                                                          | The joint frequencies Hail Table does not contain downsampling information.|

#### Version 4.1 sample grouping combinations and '`freq`' array access

The available v4.1 grouping combinations within the '`freq`' array annotation are listed below. adj<sup>1</sup> must be provided as the “group” for all combinations except when requesting raw frequency information, which is only available for the main gnomAD callsets and subsets.

- group, e.g. '`adj`', '`raw`'
- sex-group, e.g. '`XX_adj`'
- subset-group, e.g. '`non_ukb-raw`'
- gen-anc<sup>2</sup>-group, e.g. '`afr_adj`'
- gen-anc-sex-group, e.g. '`ami_XX_adj`'
- downsampling<sup>3</sup>-group-gen-anc, e.g. '`10_adj_eas`',
- subset-gen-anc-group, e.g. '`non_ukb_sas_adj`'
- subset-sex-group, e.g. '`non_ukb_XY_adj`'
- subset-gen-anc<sup>3</sup>-sex-group, e.g. '`non_ukb_mid_XX_adj`',

To access the '`freq`' array using the '`freq_index_dict`', you need to retrieve the value of your desired label combination key. The example below accesses the entry of the high quality genotypes (group: adj) of XX individuals (sex: XX) clustered with the AFR genetic ancestry group in the gnomAD v4.1 exomes:

```
# Load the v4.1 exomes public release HT
from gnomad.resources.grch38.gnomad import public_release
ht = public_release("exomes").ht()

# Use the key 'afr-XX-adj' to retrieve the index of this groups frequency data in 'freq'
ht = ht.annotate(afr_XX_freq=ht.freq[ht.freq_index_dict["afr_XX_adj"]])
```

The above example will retrieve the entire frequency struct for each variant. To grab a certain statistic, such as `AC`, specify the statistic after the value:

```
ht = ht.annotate(afr_XX_AC=ht.freq[ht.freq_index_dict["afr_XX_adj"].AC)
```

This same approach can be applied to the filtering allele frequency (FAF) array, '`faf`', by using the '`faf_index_dict`'.

1. Includes only genotypes with depth >= 10, genotype quality >= 20 and minor allele balance > 0.2 for heterozygous genotypes.
2. For the HGDP and 1KG subsets in the gnomAD v4.1 genomes, project specified ancestry labels are available in place of gnomAD inferred genetic ancestry groups. The HGDP labels are detailed [here](https://science.sciencemag.org/content/367/6484/eaay5012). The 1KG labels are described [here](https://www.internationalgenome.org/category/population).
3. Some downsamplings exceed genetic ancestry group counts and thus are not available for those groups. Also, downsamplings are available in the v4 exomes with two stratifications: across the full gnomAD release and across the non-UKB subset only. Note that the genomes Hail Table does not contain downsampling information.

### <a id="annotation-descriptions"></a>gnomAD v4.1 Hail Table annotation descriptions

#### gnomAD v4.1 exomes Hail Table annotations

Global fields:

- `freq_meta`: Allele frequency metadata. An ordered list containing the frequency aggregation group for each element of the '`freq`' array row annotation.
- `freq_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, gen_anc: gnomAD inferred genetic ancestry group, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the '`freq`' array row annotation.
- `freq_meta_sample_count`: A sample count per sample grouping defined in the '`freq_meta`' global annotation.
- `faf_meta`: Filtering allele frequency metadata. An ordered list containing the frequency aggregation group for each element of the '`faf`' array row annotation.
- `faf_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, gen_anc: gnomAD inferred genetic ancestry group, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the filtering allele frequency ('`faf`') row annotation.
- `age_distribution`: Callset-wide age histogram calculated on release samples.
  - `bin_edges`: Bin edges for the age histogram.
  - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
  - `n_smaller`: Count of age values falling below lowest histogram bin edge.
  - `n_larger`: Count of age values falling above highest histogram bin edge.
- `downsamplings`: Dictionary keyed by dataset with values corresponding to available downsampled sample counts.
- `filtering_model`: The variant filtering model used and its specific cutoffs.
  - `filter_name`: Variant filtering model name used in the '`filters`' row annotation, indicating the variant was filtered by this model during variant QC.
  - `score_name`: Annotation name of the score used for variant filtering.
  - `snv_cutoff`: SNV filtering cutoff information.
    - `bin`: Filtering percentile cutoff for SNVs.
    - `min_score`: Minimum score at SNV filtering percentile cutoff.
  - `indel_cutoff`: Indel filtering cutoff information.
    - `bin`: Filtering percentile cutoff for indels.
    - `min_score`: Minimum score at indel filtering percentile cutoff.
  - `snv_training_variables`: Variant annotations used as features in the SNV filtering model.
  - `indel_training_variables`: Variant annotations used as features in the indel filtering model.
- `inbreeding_coeff_cutoff`: Inbreeding Coefficient threshold used to hard filter variants.
- `interval_qc_parameters`: Thresholds used to determine whether an exome calling interval was high coverage and passed interval QC.
  - `per_platform`: Whether these thresholds were stratified per platform.
  - `all_platforms`: Whether these thresholds were applied uniformly across platforms, as long as a platform had a sample size above `min_platform_size`.
  - `high_qual_cutoffs`: Dictionary of interval QC thresholds per chromosomal region. Items in the dictionary are:
    - `autosome_par`: Contains annotation used to filter high coverage intervals on autosomes and in pseudoautosomal regions and threshold for annotation. Interval was considered high quality only if this annotation was over the specified threshold value.
    - `x_non_par`: Contains annotation used to filter high coverage intervals in non-pseudoautosomal regions of chromosome X and threshold for annotation. Interval was considered high quality only if this annotation was over the specified threshold value.
    - `y_non_par`: Contains annotation used to filter high coverage intervals in non-pseudoautosomal regions of chromosome Y and threshold for annotation. Interval was considered high quality only if this annotation was over the specified threshold value.
  - `min_platform_size`: Sample size required for a platform to be considered.
- `tool_versions`: Versions of in silico predictors used in the callset.
  - `cadd_version`: Combined Annotation Dependent Depletion (CADD) version.
  - `revel_version`: Rare Exome Variant Ensemble Learner (REVEL) version.
  - `spliceai_version`: SpliceAI version.
  - `pangolin_version`: Pangolin version.
  - `phylop_version`: phyloP version.
  - `dbsnp_version`: dbSNP version used in the callset.
  - `sift_version`: Sorting Intolerant from Tolerant (SIFT) version.
  - `polyphen_version`: Polymorphism Phenotyping v2 (Polyphen-v2) version.
- `vrs_versions`: The Variant Representation Specification version that was used to compute IDs on the callset.
  - `vrs_schema_version`: The [version](https://github.com/ga4gh/vrs/tags) of the VRS schema that is used to represent variants and compute identifiers.
  - `vrs_python_version`: The [version](https://github.com/ga4gh/vrs-python/tags) of the vrs-python library that was used to compute IDs on the callset.
  - `seqrepo_version`: The [version](https://github.com/biocommons/biocommons.seqrepo) of the SeqRepo database that was used in VRS computations.
- `vep_globals`: Information about VEP annotations.
  - `vep_version`: VEP version that was run on the callset.
  - `vep_help`: Output from `vep --help`.
  - `vep_config`: VEP configuration to run VEP version with [Hail](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.vep). File created using command within VEP init shell script in https://github.com/broadinstitute/gnomad_methods/tree/main.
  - `gencode_version`: GENCODE version used in VEP.
  - `mane_select_version`: MANE select version used in VEP.
- `frequency_README`: Explanation of how to use the '`freq_index_dict`' global annotation to extract frequencies from the '`freq`' row annotation.
- `date`: Date Hail Table was created.
- `version`: gnomAD data version.

Row fields:

- `locus`: Variant locus. Contains contig and position information.
- `alleles`: Variant alleles.
- `freq`: Array of allele frequency information (AC, AN, AF, homozygote count) for each frequency aggregation group in the gnomAD release.
  - `AC`: Alternate allele count in release.
  - `AF`: Alternate allele frequency, (AC/AN), in release.
  - `AN`: Total number of alleles in release.
  - `homozygote_count`: Count of homozygous alternate individuals in release.
- `grpmax`: Allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked genetic ancestry group with maximum allele frequency. Excludes Ashkenazi Jewish (`asj`), European Finnish (`fin`), Middle Eastern (`mid`), and "Remaining individuals" (`remaining`) groups.
  - `gnomAD`: grpmax information across the full gnomAD release dataset.
    - `AC`: Alternate allele count in the group with the maximum allele frequency.
    - `AF`: Maximum alternate allele frequency, (AC/AN), across groups in gnomAD.
    - `AN`: Total number of alleles in the group with the maximum allele frequency.
    - `homozygote_count`: Count of homozygous individuals in the group with the maximum allele frequency.
    - `gen_anc`: Genetic ancestry group with maximum allele frequency.
  - `non_ukb`: grpmax information across the non-UKB subset.
    - `AC`: Alternate allele count in the group with the maximum allele frequency.
    - `AF`: Maximum alternate allele frequency, (AC/AN), across groups in gnomAD.
    - `AN`: Total number of alleles in the group with the maximum allele frequency.
    - `homozygote_count`: Count of homozygous individuals in the group with the maximum allele frequency.
    - `gen_anc`: Genetic ancestry group with maximum allele frequency
- `faf`: Filtering allele frequency.
  - `faf95`: Filtering allele frequency (using Poisson 95% CI).
  - `faf99`: Filtering allele frequency (using Poisson 99% CI).
- `fafmax`: Information about the genetic ancestry group with the maximum filtering allele frequency.
  - `gnomAD`: Information about the genetic ancestry group with the maximum filtering allele frequency across the full gnomAD release dataset.
    - `faf95_max`: Maximum filtering allele frequency (using Poisson 95% CI).
    - `faf95_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (95% CI).
    - `faf99_max`: Maximum filtering allele frequency (using Poisson 99% CI).
    - `faf99_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (99% CI).
  - `non_ukb`: Information about the genetic ancestry group with the maximum filtering allele frequency in the non-UKB subset.
    - `faf95_max`: Maximum filtering allele frequency (using Poisson 95% CI).
    - `faf95_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (95% CI).
    - `faf99_max`: Maximum filtering allele frequency (using Poisson 99% CI).
    - `faf99_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (99% CI).
- `a_index`: The original index of this alternate allele in the multiallelic representation (1 is the first alternate allele or the only alternate allele in a biallelic variant).
- `was_split`: True if this variant was originally multiallelic, otherwise False.
- `rsid`: dbSNP reference SNP identification (rsID) numbers.
- `filters`: Variant filters; AC0: Allele count is zero after filtering out low-confidence genotypes (GQ < 20; DP < 10; and AB < 0.2 for het calls), AS_VQSR: Failed allele-specific VQSR filtering thresholds of -4.0598 for SNPs and 0.1078 for indels, InbreedingCoeff: GATK InbreedingCoeff < -0.3. An empty set in this field indicates that the variant passed all variant filters.
- `info`: Struct containing typical GATK allele-specific (AS) info fields and additional variant QC fields.
  - `FS`: Phred-scaled p-value of Fisher's exact test for strand bias.
  - `MQ`: Root mean square of the mapping quality of reads across all samples.
  - `MQRankSum`: Z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
  - `QUALapprox`: Sum of PL[0] values; used to approximate the QUAL score.
  - `QD`: Variant call confidence normalized by depth of sample reads supporting a variant.
  - `ReadPosRankSum`: Z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
  - `SB`: Aggregate counts of strand depth across all non-homozygous-reference calls. The values are the of the depth of reference allele on forward strand, depth of the reference allele on reverse strand, depth of all alternate alleles on forward strand, depth of all alternate alleles on reverse strand.
  - `SOR`: Strand bias estimated by the symmetric odds ratio test.
  - `VarDP`: Depth over variant genotypes (does not include depth of reference samples).
  - `AS_FS`: Allele-specific phred-scaled p-value of Fisher's exact test for strand bias.
  - `AS_MQ`: Allele-specific root mean square of the mapping quality of reads across all samples.
  - `AS_MQRankSum`: Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
  - `AS_pab_max`: Maximum p-value over callset for binomial test of observed allele balance for a heterozygous genotype, given expectation of 0.5.
  - `AS_QUALapprox`: Allele-specific sum of PL[0] values; used to approximate the QUAL score.
  - `AS_QD`: Allele-specific variant call confidence normalized by depth of sample reads supporting a - variant.
  - `AS_ReadPosRankSum`: Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
  - `AS_SB_TABLE`: Allele-specific forward/reverse read counts for strand bias tests.
  - `AS_SOR`: Allele-specific strand bias estimated by the symmetric odds ratio test.
  - `AS_VarDP`: Allele-specific depth over variant genotypes (does not include depth of reference samples).
  - `singleton`: Variant is seen once in the callset.
  - `transmitted_singleton`: Variant was a callset-wide doubleton that was transmitted within a family from a parent to a child (i.e., a singleton amongst unrelated samples in cohort).
  - `sibling_singleton`: Variant was a callset-wide doubleton that was present only in two siblings (i.e., a singleton amongst unrelated samples in cohort).
  - Holder for sib singletons
  - `omni`: Variant is present on the Omni 2.5 genotyping array and found in 1000 Genomes data.
  - `mills`: Indel is present in the Mills and Devine data.
  - `monoallelic`: All samples are homozygous alternate for the variant.
  - `only_het`: All samples are heterozygous for the variant (no homozygous reference or alternate genotype calls).
  - `AS_VQSLOD`: Allele-specific log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.
  - `inbreedingcoeff`: Inbreeding coefficient, the excess heterozygosity at a variant site, computed as 1 - (the number of heterozygous genotypes) / (the number of heterozygous genotypes expected under Hardy-Weinberg equilibrium).
  - `vrs`: Struct containing information related to the Global Alliance for Genomic Health (GA4GH) Variant Representation Specification ([VRS](https://vrs.ga4gh.org/en/stable/)) standard.
    - `VRS_Allele_IDS`: The computed identifiers for the GA4GH VRS Alleles corresponding to the values in the alleles column.
    - `VRS_Starts`: Interresidue coordinates used as the location starts for the GA4GH VRS Alleles corresponding to the values in the alleles column.
    - `VRS_Ends`: Interresidue coordinates used as the location ends for the GA4GH VRS Alleles corresponding to the values in the alleles column
    - `VRS_States`: The literal sequence states used for the GA4GH VRS Alleles corresponding to the values in the alleles column.
- `vep`: Consequence annotations from Ensembl VEP. More details about VEP output is described [here](https://ensembl.org/info/docs/tools/vep/vep_formats.html#output). VEP was run using the LOFTEE plugin and information about the additional LOFTEE annotations can be found [here](https://github.com/konradjk/loftee).
- `vqsr_results`: VQSR related variant annotations.
  - `AS_VQSLOD`: Allele-specific log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.
  - `AS_culprit`: Allele-specific worst-performing annotation in the VQSR Gaussian mixture model.
  - `positive_train_site`: Variant was used to build the positive training set of high-quality variants for VQSR.
  - `negative_train_site`: Variant was used to build the negative training set of low-quality variants for VQSR.
- `allele_info`: Allele information.
  - `variant_type`: Variant type (snv, indel, multi-snv, multi-indel, or mixed).
  - `n_alt_alleles`: Total number of alternate alleles observed at variant locus.
  - `has_star`: Variant type included an upstream deletion.
  - `allele_type`: Allele type (snv, insertion, deletion, or mixed).
  - `was_mixed`: Variant type was mixed.
- `region_flags`: Struct containing flags about regions.
  - `non_par`: Variant falls within a non-pseudoautosomal region.
  - `lcr`: Variant falls within a low complexity region.
  - `segdup`: Variant falls within a segmental duplication region.
  - `fail_interval_qc`: Less than 85% of samples meet 20X coverage if variant is in autosomal or PAR region or 10X coverage for non-PAR regions of chromosomes X and Y.
  - `outside_ukb_capture_region`: Variant falls outside of UK Biobank exome capture regions.
  - `outside_broad_capture_region`: Variant falls outside of Broad exome capture regions.
- `histograms`: Variant information histograms.
  - `qual_hists`: Genotype quality metric histograms for high quality genotypes.
    - `gq_hist_all`: Histogram for GQ calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the GQ histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the GQ histogram calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of GQ values falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of GQ values falling above the highest histogram bin edge, calculated on high quality genotypes.
    - `dp_hist_all`: Histogram for DP calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the DP histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the DP histogram calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of DP values falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of DP values falling above the highest histogram bin edge, calculated on high quality genotypes.
    - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of GQ values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of GQ values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
    - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of DP values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on high quality genotypes.
    - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on high quality genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
      - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of AB values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of AB values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
  - `raw_qual_hists`: Genotype quality metric histograms for all genotypes as opposed to high quality genotypes.
    - `gq_hist_all`: Histogram for GQ calculated on all genotypes.
      - `bin_edges`: Bin edges for the GQ histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the GQ histogram calculated on all genotypes. The number of records found in each bin.
      - `n_smaller`: Count of GQ values falling below lowest histogram bin edge, for GQ calculated on all genotypes.
      - `n_larger`: Count of GQ values falling above highest histogram bin edge, for GQ calculated on all genotypes.
    - `dp_hist_all`: Histogram for DP calculated on all genotypes.
      - `bin_edges`: Bin edges for the DP histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `n_smaller`: Count of DP values falling below lowest histogram bin edge, for DP calculated on all genotypes.
      - `n_larger`: Count of DP values falling above highest histogram bin edge, for DP calculated on all genotypes.
    - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on all genotypes.
      - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
      - `n_smaller`: Count of GQ values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
      - `n_larger`: Count of GQ values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
    - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on all genotypes.
      - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
      - `n_smaller`: Count of DP values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
      - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
    - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on all genotypes.
      - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on all genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
      - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
      - `n_smaller`: Count of AB values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
      - `n_larger`: Count of AB values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
  - `age_hists`: Histograms containing age information for release samples.
    - `age_hist_het`: Histogram for age in all heterozygous release samples calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the age histogram.
      - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
      - `n_smaller`: Count of age values falling below lowest histogram bin edge.
      - `n_larger`: Count of age values falling above highest histogram bin edge.
    - `age_hist_hom`: Histogram for age in all homozygous release samples calculated on high quality genotypes. If variant is in the pseudoautosomal regions of chrX or chrY, this histogram also includes age counts of hemizygous samples.
      - `bin_edges`: Bin edges for the age histogram.
      - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
      - `n_smaller`: Count of age values falling below lowest histogram bin edge.
      - `n_larger`: Count of age values falling above highest histogram bin edge.
- `in_silico_predictors`: Variant prediction annotations. Struct contains prediction scores from multiple in silico predictors for variants that are predicted to be missense, impacting protein function, evolutionarily conserved, or splice-altering. We chose scores for either MANE Select or canonical transcripts if a prediction score was available for multiple transcripts.
  - `cadd`: [Score](https://academic.oup.com/nar/article/47/D1/D886/5146191) used to predict deleteriousness of SNVs and indels.
    - `phred`: CADD Phred-like scaled C-scores ranging from 1 to 99 based on the rank of each variant relative to all possible 8.6 billion substitutions in the human reference genome. Larger values indicate increased predicted deleteriousness.
    - `raw_score`: Unscaled CADD scores indicating whether a variant is likely to be "observed" (negative values) vs "simulated" (positive values). Larger values indicate increased predicted deleteriousness.
  - `revel_max`: An ensemble [score](<https://www.cell.com/ajhg/fulltext/S0002-9297(16)30370-6>) for predicting the pathogenicity of missense variants (based on 13 other variant predictors). Score ranges from 0 to 1, and larger values are predicted to be more likely to be deleterious. We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.
  - `splice_ai_ds_max`: Maximum delta [score](https://linkinghub.elsevier.) across 4 splicing consequences, which reflects the probability of the variant being splice-altering. If a variant was predicted to fall within multiple genes, score is across all relevant genes. Score ranges from 0 to 1. In the SpliceAI paper, a detailed characterization of the delta scores is provided for 0.2 (high recall), 0.5 (recommended), and 0.8 (high precision) cutoffs.
  - `pangolin_largest_ds`: Largest delta [score](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-022-02664-4) across 2 splicing consequences, which reflects the probability of the variant being splice-altering. If a variant is predicted to fall within multiple genes, score is across all relevant genes. Note that there is different behavior from spliceAI: splice gain is noted as the increase in splice usage (scores range from 0 to 1) and splice loss as the decrease in splice usage (scores range from 0 to -1). The Pangolin authors proposed a cutoff of >|0.2| for the predicted increase or decrease in splice site usage.
  - `phylop`: Base-wise conservation [score](https://pubmed.ncbi.nlm.nih.gov/37104612/) across the 241 placental mammals in the [Zoonomia](https://zoonomiaproject.org/) project. Score ranges from -20 to 9.28, and reflects acceleration (faster evolution than expected under neutral drift, assigned negative scores) as well as conservation (slower than expected evolution, assigned positive scores).
  - `sift_max`: [Score](https://www.nature.com/articles/nprot.2009.86) reflecting the scaled probability of the amino acid substitution being tolerated, ranging from 0 to 1. Scores below 0.05 are predicted to impact protein function. We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.
  - `polyphen_max`: [Score](https://www.nature.com/articles/nmeth0410-248) that predicts the possible impact of an amino acid substitution on the structure and function of a human protein, ranging from 0.0 (tolerated) to 1.0 (deleterious). We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.

#### gnomAD v4.1 genomes Hail Table annotations

The v4.1 genomes Hail Table annotation schema is the same as the exomes schema, with only a few minor differences:

Global fields

- `interval_qc_parameters`: Only the v4 exomes HT has this global annotation.

Row fields

- `fafmax`: This annotation is stratified by subset in the v4 exomes, but the v4 genomes annotation does not have any subset stratification.
- `region_flags`: The v4 exomes Hail Table has the following fields that are not present in the struct on the v4 genomes Hail Table:
  - `fail_interval_qc`
  - `outside_ukb_capture_region`
  - `outside_broad_capture_region`
- `allele_info`: The v4 exomes Hail Table has an additional field in this struct, 'has_star', that is not present in the struct on the v4 genomes Hail Table.
- `info`: Sibling singletons were used to train the variant QC models for the v4 exomes but were not used in the v4 genomes variant QC.

#### gnomAD v4.1 joint frequency Hail Table annotations

The v4.1 joint (combined exomes + genomes) frequency Hail Table only contains frequencies for the following groupings:
- `group`
- `sex` (`adj`<sup>1</sup> only)
- `gen_anc` (`adj`<sup>1</sup> only)
- `gen_anc` and `sex` (`adj`<sup>1</sup> only)

1. Includes only genotypes with depth >= 10, genotype quality >= 20 and minor allele balance > 0.2 for heterozygous genotypes.

Global fields

- `exomes_globals`: Global fields from the gnomAD exomes.
  - `freq_meta`: Allele frequency metadata for the gnomAD exomes. An ordered list containing the frequency aggregation group for each element of the `exomes.freq` array row annotation.
  - `freq_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, gen_anc: gnomAD inferred genetic ancestry group [adj only], sex: sex karyotype [adj only]), with values describing the corresponding index of each grouping entry in the `exomes.freq` array row annotation. 
  - `freq_meta_sample_count`: A sample count per sample grouping defined in the exomes `exomes.freq_meta` global annotation.
  - `faf_meta`: Filtering allele frequency metadata for the gnomAD exomes. An ordered list containing the frequency aggregation group for each element of the `exomes.faf` array row annotation.
  - `faf_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, gen_anc: gnomAD inferred genetic ancestry group, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the filtering allele frequency (`exomes.faf`) row annotation.
  - `age_distribution`: Callset-wide age histogram calculated on the gnomAD exomes.
    - `bin_edges`: Bin edges for the age histogram.
    - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
    - `n_smaller`: Count of age values falling below lowest histogram bin edge.
    - `n_larger`: Count of age values falling above highest histogram bin edge.
- `genomes_globals`: Global fields from the gnomAD genomes.
  - `freq_meta`: Allele frequency metadata for the gnomAD genomes. An ordered list containing the frequency aggregation group for each element of the `genomes.freq` array row annotation.
  - `freq_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, gen_anc: gnomAD inferred genetic ancestry group [adj only], sex: sex karyotype [adj only]), with values describing the corresponding index of each grouping entry in the `genomes.freq` array row annotation.
  - `freq_meta_sample_count`: A sample count per sample grouping defined in the genomes `genomes.freq_meta` global annotation.
  - `faf_meta`: Filtering allele frequency metadata for the gnomAD genomes. An ordered list containing the frequency aggregation group for each element of the `genomes.faf` array row annotation.
  - `faf_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, gen_anc: gnomAD inferred genetic ancestry group, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the filtering allele frequency (`genomes.faf`) row annotation.
  - `age_distribution`: Callset-wide age histogram calculated on the gnomAD genomes.
    - `bin_edges`: Bin edges for the age histogram.
    - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
    - `n_smaller`: Count of age values falling below lowest histogram bin edge.
    - `n_larger`: Count of age values falling above highest histogram bin edge.
- `joint_globals`: Global fields from the combined (joint) gnomAD exomes and genomes.
  - `freq_meta`: Allele frequency metadata for the joint gnomAD exomes and genomes. An ordered list containing the frequency aggregation group for each element of the `joint.freq` array row annotation.
  - `freq_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, gen_anc: gnomAD inferred genetic ancestry group [adj only], sex: sex karyotype [adj only]), with values describing the corresponding index of each grouping entry in the `joint.freq` array row annotation.
  - `faf_meta`: Filtering allele frequency metadata for the combined gnomAD exomes and genomes. An ordered list containing the frequency aggregation group for each element of the `joint.faf` array row annotation.
  - `faf_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, gen_anc: gnomAD inferred genetic ancestry group, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the filtering allele frequency (`joint.faf`) row annotation.
  - `freq_meta_sample_count`: A sample count per sample grouping defined in the joint `joint.freq_meta` global annotation.
  - `age_distribution`: Callset-wide age histogram calculated on the combined gnomAD exomes and genomes.
    - `bin_edges`: Bin edges for the age histogram.
    - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
    - `n_smaller`: Count of age values falling below lowest histogram bin edge.
    - `n_larger`: Count of age values falling above highest histogram bin edge.

Row fields

- `locus`: Variant locus. Contains contig and position information.
- `alleles`: Variant alleles.
- `region_flags`: Struct containing flags about regions.
  - `fail_interval_qc`: Less than 85% of samples meet 20X coverage if variant is in autosomal or PAR region or 10X coverage for non-PAR regions of chromosomes X and Y.
  - `outside_ukb_capture_region`: Variant falls outside of UK Biobank exome capture regions.
  - `outside_broad_capture_region`: Variant falls outside of Broad exome capture regions.
  - `outside_ukb_calling_region`: Variant falls outside of UK Biobank exome capture regions plus 150 bp padding.
  - `outside_broad_calling_region`: Variant falls outside of Broad exome capture regions plus 150 bp padding.
  - `not_called_in_exomes`: Variant was not called in the gnomAD exomes.
  - `not_called_in_genomes`: Variant was not called in the gnomAD genomes.
- `exomes`: Struct of allele frequency information from the gnomAD exomes.
  - `freq`: Array of allele frequency information (AC, AN, AF, homozygote count) for each frequency aggregation group in the gnomAD exomes.
    - `AC`: Alternate allele count in release.
    - `AF`: Alternate allele frequency, (AC/AN), in release.
    - `AN`: Total number of alleles in release.
    - `homozygote_count`: Count of homozygous alternate individuals in release.
  - `faf`: Filtering allele frequency in the gnomAD exomes.
    - `faf95`: Filtering allele frequency (using Poisson 95% CI).
    - `faf99`: Filtering allele frequency (using Poisson 99% CI).
  - `grpmax`: Allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked genetic ancestry group with maximum allele frequency in the gnomAD exomes. Excludes Ashkenazi Jewish (`asj`), European Finnish (`fin`), and "Remaining individuals" (`remaining`) groups.
    - `AC`: Alternate allele count in the group with the maximum allele frequency.
    - `AF`: Maximum alternate allele frequency, (AC/AN), across groups in gnomAD.
    - `AN`: Total number of alleles in the group with the maximum allele frequency.
    - `homozygote_count`: Count of homozygous individuals in the group with the maximum allele frequency.
    - `gen_anc`: Genetic ancestry group with maximum allele frequency
  - `fafmax`: Information about the genetic ancestry group with the maximum filtering allele frequency.
    - `faf95_max`: Maximum filtering allele frequency (using Poisson 95% CI).
    - `faf95_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (95% CI).
    - `faf99_max`: Maximum filtering allele frequency (using Poisson 99% CI).
    - `faf99_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (99% CI).
  - `histograms`: Variant information histograms from the gnomAD exomes.
    - `qual_hists`: Genotype quality metric histograms for high quality genotypes.
      - `gq_hist_all`: Histogram for GQ calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the GQ histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the GQ histogram calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of GQ values falling above the highest histogram bin edge, calculated on high quality genotypes.
      - `dp_hist_all`: Histogram for DP|70|75|80|85|90|95|100.
        - `bin_edges`: Bin edges for the DP histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the DP histogram calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of DP values falling above the highest histogram bin edge, calculated on high quality genotypes.
      - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of GQ values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
      - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on high quality genotypes.
      - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on high quality genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
        - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of AB values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of AB values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
    - `raw_qual_hists`: Genotype quality metric histograms for all genotypes as opposed to high quality genotypes.
      - `gq_hist_all`: Histogram for GQ calculated on all genotypes.
        - `bin_edges`: Bin edges for the GQ histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the GQ histogram calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values falling below lowest histogram bin edge, for GQ calculated on all genotypes.
        - `n_larger`: Count of GQ values falling above highest histogram bin edge, for GQ calculated on all genotypes.
      - `dp_hist_all`: Histogram for DP calculated on all genotypes.
        - `bin_edges`: Bin edges for the DP histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100
        - `bin_freq`: Bin frequencies for the DP histogram calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values falling below lowest histogram bin edge, for DP calculated on all genotypes.
        - `n_larger`: Count of DP values falling above highest histogram bin edge, for DP calculated on all genotypes.
      - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on all genotypes.
        - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        - `n_larger`: Count of GQ values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
      - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on all genotypes.
        - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
      - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on all genotypes.
        - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on all genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
        - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of AB values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        - `n_larger`: Count of AB values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
    - `age_hists`: Histograms containing age information for release samples.
      - `age_hist_het`: Histogram for age in all heterozygous release samples calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the age histogram.
        - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
        - `n_smaller`: Count of age values falling below lowest histogram bin edge.
        - `n_larger`: Count of age values falling above highest histogram bin edge.
      - `age_hist_hom`: Histogram for age in all homozygous release samples calculated on high quality genotypes. If variant is in the pseudoautosomal regions of chrX or chrY, this histogram also includes age counts of hemizygous samples.
        - `bin_edges`: Bin edges for the age histogram.
        - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
        - `n_smaller`: Count of age values falling below lowest histogram bin edge.
        - `n_larger`: Count of age values falling above highest histogram bin edge.
- `genomes`: Struct of allele frequency information from the gnomAD genomes.
  - `freq`: Array of allele frequency information (AC, AN, AF, homozygote count) for each frequency aggregation group in the gnomAD genomes.
    - `AC`: Alternate allele count in release.
    - `AF`: Alternate allele frequency, (AC/AN), in release.
    - `AN`: Total number of alleles in release.
    - `homozygote_count`: Count of homozygous alternate individuals in release.
  - `faf`: Filtering allele frequency in the gnomAD genomes.
    - `faf95`: Filtering allele frequency (using Poisson 95% CI).
    - `faf99`: Filtering allele frequency (using Poisson 99% CI).
  - `grpmax`: Allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked genetic ancestry group with maximum allele frequency in the gnomAD genomes. Excludes Amish (`ami`), Ashkenazi Jewish (`asj`), European Finnish (`fin`), Middle Eastern (`mid`), and "Remaining individuals" (`remaining`) groups.
    - `AC`: Alternate allele count in the group with the maximum allele frequency.
    - `AF`: Maximum alternate allele frequency, (AC/AN), across groups in gnomAD.
    - `AN`: Total number of alleles in the group with the maximum allele frequency.
    - `homozygote_count`: Count of homozygous individuals in the group with the maximum allele frequency.
    - `gen_anc`: Genetic ancestry group with maximum allele frequency
  - `fafmax`: Information about the genetic ancestry group with the maximum filtering allele frequency.
    - `faf95_max`: Maximum filtering allele frequency (using Poisson 95% CI).
    - `faf95_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (95% CI).
    - `faf99_max`: Maximum filtering allele frequency (using Poisson 99% CI).
    - `faf99_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (99% CI).
  - `histograms`: Variant information histograms from the gnomAD genomes.
    - `qual_hists`: Genotype quality metric histograms for high quality genotypes.
      - `gq_hist_all`: Histogram for GQ calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the GQ histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the GQ histogram calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of GQ values falling above the highest histogram bin edge, calculated on high quality genotypes.
      - `dp_hist_all`: Histogram for DP|70|75|80|85|90|95|100.
        - `bin_edges`: Bin edges for the DP histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the DP histogram calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of DP values falling above the highest histogram bin edge, calculated on high quality genotypes.
      - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of GQ values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
      - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on high quality genotypes.
      - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on high quality genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
        - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of AB values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of AB values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
    - `raw_qual_hists`: Genotype quality metric histograms for all genotypes as opposed to high quality genotypes.
      - `gq_hist_all`: Histogram for GQ calculated on all genotypes.
        - `bin_edges`: Bin edges for the GQ histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the GQ histogram calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values falling below lowest histogram bin edge, for GQ calculated on all genotypes.
        - `n_larger`: Count of GQ values falling above highest histogram bin edge, for GQ calculated on all genotypes.
      - `dp_hist_all`: Histogram for DP calculated on all genotypes.
        - `bin_edges`: Bin edges for the DP histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100
        - `bin_freq`: Bin frequencies for the DP histogram calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values falling below lowest histogram bin edge, for DP calculated on all genotypes.
        - `n_larger`: Count of DP values falling above highest histogram bin edge, for DP calculated on all genotypes.
      - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on all genotypes.
        - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        - `n_larger`: Count of GQ values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
      - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on all genotypes.
        - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
      - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on all genotypes.
        - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on all genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
        - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of AB values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        - `n_larger`: Count of AB values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
    - `age_hists`: Histograms containing age information for release samples.
      - `age_hist_het`: Histogram for age in all heterozygous release samples calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the age histogram.
        - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
        - `n_smaller`: Count of age values falling below lowest histogram bin edge.
        - `n_larger`: Count of age values falling above highest histogram bin edge.
      - `age_hist_hom`: Histogram for age in all homozygous release samples calculated on high quality genotypes. If variant is in the pseudoautosomal regions of chrX or chrY, this histogram also includes age counts of hemizygous samples.
        - `bin_edges`: Bin edges for the age histogram.
        - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
        - `n_smaller`: Count of age values falling below lowest histogram bin edge.
        - `n_larger`: Count of age values falling above highest histogram bin edge.
- `joint`: Struct of combined (joint) exomes and genomes allele frequency information.
  - `freq`: Array of allele frequency information (AC, AN, AF, homozygote count) across the combined (joint) gnomAD exomes and genomes and for each genetic ancestry group.
    - `AC`: Combined (exomes + genomes) alternate allele count in release.
    - `AF`: Combined (exomes + genomes) alternate allele frequency, (AC/AN), in release.
    - `AN`: Total number of alleles across exomes and genomes in release.
    - `homozygote_count`: Count of homozygous alternate individuals across exomes and genomes in release.
  - `grpmax`: Allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked genetic ancestry group with maximum allele frequency across both exomes and genomes. Excludes Amish (`ami`), Ashkenazi Jewish (`asj`), European Finnish (`fin`), and "Remaining individuals" (`remaining`) groups.
    - `AC`: Alternate allele count in the group with the maximum allele frequency.
    - `AF`: Maximum alternate allele frequency, (AC/AN), across groups in gnomAD.
    - `AN`: Total number of alleles in the group with the maximum allele frequency.
    - `homozygote_count`: Count of homozygous individuals in the group with the maximum allele frequency.
    - `gen_anc`: Genetic ancestry group with maximum allele frequency.
  - `faf`: Array of combined exomes and genomes filtering allele frequency information (AC, AN, AF, homozygote count). Note that the values in array will correspond to the joint or combined value if the variant had a defined filtering allele frequency in both data types, otherwise this array will contain filtering allele frequencies only for the data type associated with the Hail Table (in this case, exomes).
    - `faf95`: Combined exomes and genomes filtering allele frequency (using Poisson 95% CI).
    - `faf99`: Combined exomes and genomes filtering allele frequency (using Poisson 99% CI).
  - `histograms`: Variant information histograms of the combined (joint) gnomAD exomes and genomes.
    - `qual_hists`: Genotype quality metric histograms for high quality genotypes.
      - `gq_hist_all`: Histogram for GQ calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the GQ histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the GQ histogram calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of GQ values falling above the highest histogram bin edge, calculated on high quality genotypes.
      - `dp_hist_all`: Histogram for DP|70|75|80|85|90|95|100.
        - `bin_edges`: Bin edges for the DP histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the DP histogram calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of DP values falling above the highest histogram bin edge, calculated on high quality genotypes.
      - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of GQ values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
      - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on high quality genotypes.
      - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on high quality genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
        - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
        - `n_smaller`: Count of AB values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
        - `n_larger`: Count of AB values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
    - `raw_qual_hists`: Genotype quality metric histograms for all genotypes as opposed to high quality genotypes.
      - `gq_hist_all`: Histogram for GQ calculated on all genotypes.
        - `bin_edges`: Bin edges for the GQ histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the GQ histogram calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values falling below lowest histogram bin edge, for GQ calculated on all genotypes.
        - `n_larger`: Count of GQ values falling above highest histogram bin edge, for GQ calculated on all genotypes.
      - `dp_hist_all`: Histogram for DP calculated on all genotypes.
        - `bin_edges`: Bin edges for the DP histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100
        - `bin_freq`: Bin frequencies for the DP histogram calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values falling below lowest histogram bin edge, for DP calculated on all genotypes.
        - `n_larger`: Count of DP values falling above highest histogram bin edge, for DP calculated on all genotypes.
      - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on all genotypes.
        - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of GQ values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        - `n_larger`: Count of GQ values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
      - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on all genotypes.
        - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
        - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of DP values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
      - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on all genotypes.
        - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on all genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
        - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
        - `n_smaller`: Count of AB values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
        - `n_larger`: Count of AB values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
    - `age_hists`: Histograms containing age information for release samples.
      - `age_hist_het`: Histogram for age in all heterozygous release samples calculated on high quality genotypes.
        - `bin_edges`: Bin edges for the age histogram.
        - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
        - `n_smaller`: Count of age values falling below lowest histogram bin edge.
        - `n_larger`: Count of age values falling above highest histogram bin edge.
      - `age_hist_hom`: Histogram for age in all homozygous release samples calculated on high quality genotypes. If variant is in the pseudoautosomal regions of chrX or chrY, this histogram also includes age counts of hemizygous samples.
        - `bin_edges`: Bin edges for the age histogram.
        - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
        - `n_smaller`: Count of age values falling below lowest histogram bin edge.
        - `n_larger`: Count of age values falling above highest histogram bin edge.
- `freq_comparison_stats`: Struct containing results from contingency table and Cochran-Mantel-Haenszel tests comparing allele frequencies between the gnomAD exomes and genomes.
  - `contingency_table_test`: Array of results from Hail's [`contingency_table_test`](https://hail.is/docs/0.2/functions/stats.html#hail.expr.functions.contingency_table_test) with `min_cell_count=100` comparing allele frequencies between exomes and genomes. Each element in the array corresponds to the comparasion of a specific frequency aggregation group defined by the `joint.freq_meta` global field.
    - `odds_ratio`: Odds ratio from the contingency table test.
    - `p_value`: P-value from the contingency table test.
  - `cochran_mantel_haenszel_test`: Results from Hail's [`cochran_mantel_haenszel_test`](https://hail.is/docs/0.2/functions/stats.html#hail.expr.functions.cochran_mantel_haenszel_test) comparing allele frequencies between exomes and genomes stratified by genetic ancestry group `gen_anc`, excluding Amish (`ami`), Ashkenazi Jewish (`asj`), European Finnish (`fin`), and "Remaining individuals" (`remaining`) groups. The test is performed using the Cochran-Mantel-Haenszel test, a stratified test of independence for 2x2xK contingency tables.
    - `chisq`: Chi-squared test statistic from the Cochran-Mantel-Haenszel test.
    - `p_value`: P-value from the Cochran-Mantel-Haenszel test.
  - `stat_union`: Struct containing the selected results from the contingency table and Cochran-Mantel-Haenszel tests comparing allele frequencies between exomes and genomes. When the variant is observed in only one inferred genetic ancestry group, the results from `contingency_table_test` are used. When there are multiple genetic ancestry groups, the results from `cochran_mantel_haenszel_test` are used. Excludes Amish (`ami`), Ashkenazi Jewish (`asj`), European Finnish (`fin`), and "Remaining individuals" (`remaining`) groups. If `stat_test_name` in the `stat_union` struct is `contingency_table_test`, the value of `p_value` in the `stat_union` struct is equal to `freq_comparison_stats.contingency_table_test`[`joint_globals.freq_meta`.index(`gen_ancs`[0])].`p_value`.  If `stat_test_name` is `cochran_mantel_haenszel_test`, the value of `p_value` in the `stat_union` struct is equal to `freq_comparison_stats.cochran_mantel_haenszel_test`. 
    - `p_value`: p-value from the contingency table or Cochran-Mantel-Haenszel tests.
    - `stat_test_name`: Name of the test used to compare allele frequencies between exomes and genomes. Options are `contingency_table_test` and `cochran_mantel_haenszel_test`.
    - `gen_ancs`: List of genetic ancestry groups included in the test. If `stat_test_name` is `contingency_table_test`, the length of `gen_ancs` is one and if `stat_test_name` is `cochran_mantel_haenszel_test`, the length of `gen_ancs` is greater than one.

<br/><br/>

<details>

<summary>Expand to see details for past versions</summary>

### <a id="annotation-descriptions"></a>gnomAD v4.0 Hail Table annotation descriptions

#### gnomAD v4.0 exomes Hail Table annotations

Note that joint frequency, including filtering allele frequency, is available on this table. However, for the most up to date version of joint frequencies, please see our [new resource](https://gnomad.broadinstitute/downloads#v4-standalone-joint-faf)

Global fields:

- `freq_meta`: Allele frequency metadata. An ordered list containing the frequency aggregation group for each element of the ‘freq’ array row annotation.
- `freq_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: gnomAD inferred global population, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the ‘freq’ array row annotation.
- `freq_meta_sample_count`: A sample count per sample grouping defined in the '`freq_meta`' global annotation.
- `faf_meta`: Filtering allele frequency metadata. An ordered list containing the frequency aggregation group for each element of the ‘faf’ array row annotation.
- `faf_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: gnomAD inferred global population, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the filtering allele frequency (‘faf’) row annotation.
- `joint_freq_meta`: Joint allele frequency across the exomes and genomes metadata. An ordered list containing the frequency aggregation group for each element of the ‘joint_freq’ array row annotation.
- `joint_freq_index_dict`: Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: gnomAD inferred global population, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the ‘joint_freq’ array row annotation.
- `joint_freq_meta_sample_count`: A sample count per sample grouping defined in the 'joint_freq_meta' global annotation.
- `joint_faf_meta`: Joint filtering allele frequency across the exomes and genomes metadata. An ordered list containing the frequency aggregation group for each element of the ‘joint_faf’ array row annotation.
  joint_faf_index_dict: Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: gnomAD inferred global population, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the filtering allele frequency (‘joint_faf’) row annotation.
- `age_distribution`: Callset-wide age histogram calculated on release samples.
  - `bin_edges`: Bin edges for the age histogram.
  - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
  - `n_smaller`: Count of age values falling below lowest histogram bin edge.
  - `n_larger`: Count of age values falling above highest histogram bin edge.
- `downsamplings`: Dictionary keyed by dataset with values corresponding to available downsampled sample counts.
- `filtering_model`: The variant filtering model used and its specific cutoffs.
  - `filter_name`: Variant filtering model name used in the 'filters' row annotation, indicating the variant was filtered by this model during variant QC.
  - `score_name`: Annotation name of the score used for variant filtering.
  - `snv_cutoff`: SNV filtering cutoff information.
    - `bin`: Filtering percentile cutoff for SNVs.
    - `min_score`: Minimum score at SNV filtering percentile cutoff.
  - `indel_cutoff`: Indel filtering cutoff information.
    - `bin`: Filtering percentile cutoff for indels.
    - `min_score`: Minimum score at indel filtering percentile cutoff.
  - `snv_training_variables`: Variant annotations used as features in the SNV filtering model.
  - `indel_training_variables`: Variant annotations used as features in the indel filtering model.
- `inbreeding_coeff_cutoff`: Inbreeding Coefficient threshold used to hard filter variants.
- `interval_qc_parameters`: Thresholds used to determine whether an exome calling interval was high coverage and passed interval QC.
  - `per_platform`: Whether these thresholds were stratified per platform.
  - `all_platforms`: Whether these thresholds were applied uniformly across platforms, as long as a platform had a sample size above `min_platform_size`.
  - `high_qual_cutoffs`: Interval QC thresholds per chromosomal region:
    - `autosome_par`: Contains annotation used to filter high coverage intervals on autosomes and in pseudoautosomal regions and threshold for annotation. Interval was considered high quality only if this annotation was over the specified threshold value.
    - `x_non_par`: Contains annotation used to filter high coverage intervals in non-pseudoautosomal regions of chromosome X and threshold for annotation. Interval was considered high quality only if this annotation was over the specified threshold value.
    - `y_non_par`: Contains annotation used to filter high coverage intervals in non-pseudoautosomal regions of chromosome Y and threshold for annotation. Interval was considered high quality only if this annotation was over the specified threshold value.
  - `min_platform_size`: Sample size required for a platform to be considered.
- `tool_versions`: Versions of in silico predictors used in the callset.
  - `cadd_version`: Combined Annotation Dependent Depletion (CADD) version.
  - `revel_version`: Rare Exome Variant Ensemble Learner (REVEL) version.
  - `spliceai_version`: spliceAI version.
  - `pangolin_version`: Pangolin version.
  - `phylop_version`: phyloP version.
  - `dbsnp_version`: dbSNP version used in the callset.
  - `sift_version`: Sorting Intolerant from Tolerant (SIFT) version.
  - `polyphen_version`: Polymorphism Phenotyping v2 (Polyphen-v2) version.
- `vrs_versions`: The Variant Representation Specification version that was used to compute IDs on the callset.
  - `vrs_schema_version`: The [version](https://github.com/ga4gh/vrs/tags) of the VRS schema that is used to represent variants and compute identifiers.
  - `vrs_python_version`: The [version](https://github.com/ga4gh/vrs-python/tags) of the vrs-python library that was used to compute IDs on the callset.
  - `seqrepo_version`: The [version](https://github.com/biocommons/biocommons.seqrepo) of the SeqRepo database that was used in VRS computations.
- `vep_globals`: Information about VEP annotations.
  - `vep_version`: VEP version that was run on the callset.
  - `vep_help`: Output from `vep --help`.
  - `vep_config`: VEP configuration to run VEP version with [Hail](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.vep). File created using command within VEP init shell script in https://github.com/broadinstitute/gnomad_methods/tree/main.
  - `gencode_version`: GENCODE version used in VEP.
  - `mane_select_version`: MANE select version used in VEP.
- `frequency_README`: Explanation of how to use the 'freq_index_dict' global annotation to extract frequencies from the 'freq' row annotation.
- `date`: Date Hail Table was created.
- `version`: gnomAD data version.

Row fields:

- `locus`: Variant locus. Contains contig and position information.
- `alleles`: Variant alleles.
- `freq`: Array of allele frequency information (AC, AN, AF, homozygote count) for each frequency aggregation group in the gnomAD release.
  - `AC`: Alternate allele count in release.
  - `AF`: Alternate allele frequency, (AC/AN), in release.
  - `AN`: Total number of alleles in release.
  - `homozygote_count`: Count of homozygous alternate individuals in release.
- `grpmax`: Allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked genetic ancestry group with maximum allele frequency. Excludes Ashkenazi Jewish (`asj`), European Finnish (`fin`), Middle Eastern (`mid`), and "Remaining individuals" (`remaining`) groups.
  - `gnomAD`: grpmax information across the full gnomAD release dataset.
    - `AC`: Alternate allele count in the group with the maximum allele frequency.
    - `AF`: Maximum alternate allele frequency, (AC/AN), across groups in gnomAD.
    - `AN`: Total number of alleles in the group with the maximum allele frequency.
    - `homozygote_count`: Count of homozygous individuals in the group with the maximum allele frequency.
    - `gen_anc`: Genetic ancestry group with maximum allele frequency
  - `non_ukb`: grpmax information across the non-UKB subset.
    - `AC`: Alternate allele count in the group with the maximum allele frequency.
    - `AF`: Maximum alternate allele frequency, (AC/AN), across groups in gnomAD.
    - `AN`: Total number of alleles in the group with the maximum allele frequency.
    - `homozygote_count`: Count of homozygous individuals in the group with the maximum allele frequency.
    - `gen_anc`: Genetic ancestry group with maximum allele frequency
- `faf`: Filtering allele frequency.
  - `faf95`: Filtering allele frequency (using Poisson 95% CI).
  - `faf99`: Filtering allele frequency (using Poisson 99% CI).
- `fafmax`: Information about the genetic ancestry group with the maximum filtering allele frequency.
  - `gnomAD`: Information about the genetic ancestry group with the maximum filtering allele frequency across the full gnomAD release dataset.
    - `faf95_max`: Maximum filtering allele frequency (using Poisson 95% CI).
    - `faf95_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (95% CI).
    - `faf99_max`: Maximum filtering allele frequency (using Poisson 99% CI).
    - `faf99_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (99% CI).
  - `non_ukb`: Information about the genetic ancestry group with the maximum filtering allele frequency in the non-UKB subset.
    - `faf95_max`: Maximum filtering allele frequency (using Poisson 95% CI).
    - `faf95_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (95% CI).
    - `faf99_max`: Maximum filtering allele frequency (using Poisson 99% CI).
    - `faf99_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (99% CI).
- `joint_freq`: Array of combined exomes and genomes allele frequency information (AC, AN, AF, homozygote count) for the full gnomAD release and for each genetic ancestry group. Note that the values in array will correspond to combined or joint value if the variant was present in both data types, otherwise this array will contain frequencies only for the data type associated with the Hail Table (in this case, exomes).
  - `AC`: Combined (exomes + genomes) alternate allele count in release.
  - `AF`: Combined (exomes + genomes) alternate allele frequency, (AC/AN), in release.
  - `AN`: Total number of alleles across exomes and genomes in release.
  - `homozygote_count`: Count of homozygous alternate individuals across exomes and genomes in release.
- `joint_grpmax`: Allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked genetic ancestry group with maximum allele frequency across both exomes and genomes. Excludes Amish (ami), Ashkenazi Jewish (asj), European Finnish (fin), Middle Eastern (mid), and "Remaining individuals" (remaining) groups.
  - `AC`: Alternate allele count in the group with the maximum allele frequency.
  - `AF`: Maximum alternate allele frequency, (AC/AN), across groups in gnomAD.
  - `AN`: Total number of alleles in the group with the maximum allele frequency.
  - `homozygote_count`: Count of homozygous individuals in the group with the maximum allele frequency.
  - `gen_anc`: Genetic ancestry group with maximum allele frequency.
- `joint_faf`: Array of combined exomes and genomes filtering allele frequency information (AC, AN, AF, homozygote count). Note that the values in array will correspond to the joint or combined value if the variant had a defined filtering allele frequency in both data types, otherwise this array will contain filtering allele frequencies only for the data type associated with the Hail Table (in this case, exomes).
  - `faf95`: Combined exomes and genomes filtering allele frequency (using Poisson 95% CI).
  - `faf99`: Combined exomes and genomes filtering allele frequency (using Poisson 99% CI).
- `joint_fafmax`: Information about the genetic ancestry group with the maximum filtering allele frequency across both exomes and genomes. Note that the values in array will correspond to the joint or combined value if the variant had a defined filtering allele frequency in both data types, otherwise this array will contain filtering allele frequencies only for the data type associated with the Hail Table (in this case, exomes).
  - `faf95_max`: Maximum filtering allele frequency (using Poisson 95% CI) across both exomes and genomes.
  - `faf95_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (95% CI) across both exomes and genomes.
  - `faf99_max`: Maximum filtering allele frequency (using Poisson 99% CI) across both exomes and genomes.
  - `faf99_max_gen_anc`: Genetic ancestry group with the maximum filtering allele frequency (99% CI) across both exomes and genomes.
  - `joint_fafmax_data_type`: Data type associated with joint FAF information. Value will be "both" if variant had a defined FAF in both the exomes and genomes, otherwise will be either "exomes" or "genomes".
- `a_index`: The original index of this alternate allele in the multiallelic representation (1 is the first alternate allele or the only alternate allele in a biallelic variant).
- `was_split`: True if this variant was originally multiallelic, otherwise False.
- `rsid`: dbSNP reference SNP identification (rsID) numbers.
- `filters`: Variant filters; AC0: Allele count is zero after filtering out low-confidence genotypes (GQ < 20; DP < 10; and AB < 0.2 for het calls), AS_VQSR: Failed allele-specific VQSR filtering thresholds of -4.0598 for SNPs and 0.1078 for indels, InbreedingCoeff: GATK InbreedingCoeff < -0.3. An empty set in this field indicates that the variant passed all variant filters.
- `info`: Struct containing typical GATK allele-specific (AS) info fields and additional variant QC fields.
  - `FS`: Phred-scaled p-value of Fisher's exact test for strand bias.
  - `MQ`: Root mean square of the mapping quality of reads across all samples.
  - `MQRankSum`: Z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
  - `QUALapprox`: Sum of PL[0] values; used to approximate the QUAL score.
  - `QD`: Variant call confidence normalized by depth of sample reads supporting a variant.
  - `ReadPosRankSum`: Z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
  - `SB`: Aggregate counts of strand depth across all non-homozygous-reference calls. The values are the of the depth of reference allele on forward strand, depth of the reference allele on reverse strand, depth of all alternate alleles on forward strand, depth of all alternate alleles on reverse strand.
  - `SOR`: Strand bias estimated by the symmetric odds ratio test.
  - `VarDP`: Depth over variant genotypes (does not include depth of reference samples).
  - `AS_FS`: Allele-specific phred-scaled p-value of Fisher's exact test for strand bias.
  - `AS_MQ`: Allele-specific root mean square of the mapping quality of reads across all samples.
  - `AS_MQRankSum`: Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
  - `AS_pab_max`: Maximum p-value over callset for binomial test of observed allele balance for a heterozygous genotype, given expectation of 0.5.
  - `AS_QUALapprox`: Allele-specific sum of PL[0] values; used to approximate the QUAL score.
  - `AS_QD`: Allele-specific variant call confidence normalized by depth of sample reads supporting a - variant.
  - `AS_ReadPosRankSum`: Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
  - `AS_SB_TABLE`: Allele-specific forward/reverse read counts for strand bias tests.
  - `AS_SOR`: Allele-specific strand bias estimated by the symmetric odds ratio test.
  - `AS_VarDP`: Allele-specific depth over variant genotypes (does not include depth of reference samples).
  - `singleton`: Variant is seen once in the callset.
  - `transmitted_singleton`: Variant was a callset-wide doubleton that was transmitted within a family from a parent to a child (i.e., a singleton amongst unrelated samples in cohort).
  - `sibling_singleton`: Variant was a callset-wide doubleton that was present only in two siblings (i.e., a singleton amongst unrelated samples in cohort).
  - Holder for sib singletons
  - `omni`: Variant is present on the Omni 2.5 genotyping array and found in 1000 Genomes data.
  - `mills`: Indel is present in the Mills and Devine data.
  - `monoallelic`: All samples are homozygous alternate for the variant.
  - `only_het`: All samples are heterozygous for the variant (no homozygous reference or alternate genotype calls).
  - `AS_VQSLOD`: Allele-specific log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.
  - `inbreedingcoeff`: Inbreeding coefficient, the excess heterozygosity at a variant site, computed as 1 - (the number of heterozygous genotypes) / (the number of heterozygous genotypes expected under Hardy-Weinberg equilibrium).
  - `vrs`: Struct containing information related to the Global Alliance for Genomic Health (GA4GH) Variant Representation Specification ([VRS](https://vrs.ga4gh.org/en/stable/)) standard.
    - `VRS_Allele_IDS`: The computed identifiers for the GA4GH VRS Alleles corresponding to the values in the alleles column.
    - `VRS_Starts`: Interresidue coordinates used as the location starts for the GA4GH VRS Alleles corresponding to the values in the alleles column.
    - `VRS_Ends`: Interresidue coordinates used as the location ends for the GA4GH VRS Alleles corresponding to the values in the alleles column
    - `VRS_States`: The literal sequence states used for the GA4GH VRS Alleles corresponding to the values in the alleles column.
- `vep`: Consequence annotations from Ensembl VEP. More details about VEP output is described [here](https://ensembl.org/info/docs/tools/vep/vep_formats.html#output). VEP was run using the LOFTEE plugin and information about the additional LOFTEE annotations can be found [here](https://github.com/konradjk/loftee).
- `vqsr_results`: VQSR related variant annotations.
  - `AS_VQSLOD`: Allele-specific log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.
  - `AS_culprit`: Allele-specific worst-performing annotation in the VQSR Gaussian mixture model.
  - `positive_train_site`: Variant was used to build the positive training set of high-quality variants for VQSR.
  - `negative_train_site`: Variant was used to build the negative training set of low-quality variants for VQSR.
- `allele_info`: Allele information.
  - `variant_type`: Variant type (snv, indel, multi-snv, multi-indel, or mixed).
  - `n_alt_alleles`: Total number of alternate alleles observed at variant locus.
  - `has_star`: Variant type included an upstream deletion.
  - `allele_type`: Allele type (snv, insertion, deletion, or mixed).
  - `was_mixed`: Variant type was mixed.
- `region_flags`: Struct containing flags about regions.
  - `non_par`: Variant falls within a non-pseudoautosomal region.
  - `lcr`: Variant falls within a low complexity region.
  - `segdup`: Variant falls within a segmental duplication region.
  - `fail_interval_qc`: Less than 85% of samples meet 20X coverage if variant is in autosomal or PAR region or 10X coverage for non-PAR regions of chromosomes X and Y.
  - `outside_ukb_capture_region`: Variant falls outside of UK Biobank exome capture regions.
  - `outside_broad_capture_region`: Variant falls outside of Broad exome capture regions.
- `histograms`: Variant information histograms.
  - `qual_hists`: Genotype quality metric histograms for high quality genotypes.
    - `gq_hist_all`: Histogram for GQ calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the GQ histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the GQ histogram calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of GQ values falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of GQ values falling above the highest histogram bin edge, calculated on high quality genotypes.
    - `dp_hist_all`: Histogram for DP calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the DP histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the DP histogram calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of DP values falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of DP values falling above the highest histogram bin edge, calculated on high quality genotypes.
    - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of GQ values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of GQ values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
    - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of DP values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on high quality genotypes.
    - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on high quality genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
      - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
      - `n_smaller`: Count of AB values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
      - `n_larger`: Count of AB values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
  - `raw_qual_hists`: Genotype quality metric histograms for all genotypes as opposed to high quality genotypes.
    - `gq_hist_all`: Histogram for GQ calculated on all genotypes.
      - `bin_edges`: Bin edges for the GQ histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the GQ histogram calculated on all genotypes. The number of records found in each bin.
      - `n_smaller`: Count of GQ values falling below lowest histogram bin edge, for GQ calculated on all genotypes.
      - `n_larger`: Count of GQ values falling above highest histogram bin edge, for GQ calculated on all genotypes.
    - dp_hist_all: Histogram for DP calculated on all genotypes.
      - bin_edges: Bin edges for the DP histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100
      - `bin_freq`: Bin frequencies for the DP histogram calculated on all genotypes. The number of records found in each bin.
      - `n_smaller`: Count of DP values falling below lowest histogram bin edge, for DP calculated on all genotypes.
      - `n_larger`: Count of DP values falling above highest histogram bin edge, for DP calculated on all genotypes.
    - `gq_hist_alt`: Histogram for GQ in heterozygous individuals calculated on all genotypes.
      - `bin_edges`: Bin edges for the histogram of GQ in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
      - `n_smaller`: Count of GQ values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
      - `n_larger`: Count of GQ values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
    - `dp_hist_alt`: Histogram for DP in heterozygous individuals calculated on all genotypes.
      - `bin_edges`: Bin edges for the histogram of DP in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
      - `bin_freq`: Bin frequencies for the histogram of DP in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
      - `n_smaller`: Count of DP values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
      - `n_larger`: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
    - `ab_hist_alt`: Histogram for AB in heterozygous individuals calculated on all genotypes.
      - `bin_edges`: Bin edges for the histogram of AB in heterozygous individuals calculated on all genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
      - `bin_freq`: Bin frequencies for the histogram of AB in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
      - `n_smaller`: Count of AB values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
      - `n_larger`: Count of AB values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
  - `age_hists`: Histograms containing age information for release samples.
    - `age_hist_het`: Histogram for age in all heterozygous release samples calculated on high quality genotypes.
      - `bin_edges`: Bin edges for the age histogram.
      - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
      - `n_smaller`: Count of age values falling below lowest histogram bin edge.
      - `n_larger`: Count of age values falling above highest histogram bin edge.
    - `age_hist_hom`: Histogram for age in all homozygous release samples calculated on high quality genotypes. If variant is in the pseudoautosomal regions of chrX or chrY, this histogram also includes age counts of hemizygous samples.
      - `bin_edges`: Bin edges for the age histogram.
      - `bin_freq`: Bin frequencies for the age histogram. This is the number of records found in each bin.
      - `n_smaller`: Count of age values falling below lowest histogram bin edge.
      - `n_larger`: Count of age values falling above highest histogram bin edge.
- `in_silico_predictors`: Variant prediction annotations. Struct contains prediction scores from multiple in silico predictors for variants that are predicted to be missense, impacting protein function, evolutionarily conserved, or splice-altering. We chose scores for either MANE Select or canonical transcripts if a prediction score was available for multiple transcripts.
  - `cadd`: [Score](https://academic.oup.com/nar/article/47/D1/D886/5146191) used to predict deleteriousness of SNVs and indels.
    - `phred`: CADD Phred-like scaled C-scores ranging from 1 to 99 based on the rank of each variant relative to all possible 8.6 billion substitutions in the human reference genome. Larger values indicate increased predicted deleteriousness.
    - `raw_score`: Unscaled CADD scores indicating whether a variant is likely to be "observed" (negative values) vs "simulated" (positive values). Larger values indicate increased predicted deleteriousness.
  - `revel_max`: An ensemble [score](<https://www.cell.com/ajhg/fulltext/S0002-9297(16)30370-6>) for predicting the pathogenicity of missense variants (based on 13 other variant predictors). Score ranges from 0 to 1, and larger values are predicted to be more likely to be deleterious. We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.
  - `splice_ai_ds_max`: Maximum delta [score](https://linkinghub.elsevier.) across 4 splicing consequences, which reflects the probability of the variant being splice-altering. If a variant was predicted to fall within multiple genes, score is across all relevant genes. Score ranges from 0 to 1. In the SpliceAI paper, a detailed characterization of the delta scores is provided for 0.2 (high recall), 0.5 (recommended), and 0.8 (high precision) cutoffs.
  - `pangolin_largest_ds`: Largest delta [score](https://genomebiology.biomedcentral.com/articles/10.1186/s13059-022-02664-4) across 2 splicing consequences, which reflects the probability of the variant being splice-altering. If a variant is predicted to fall within multiple genes, score is across all relevant genes. Note that there is different behavior from spliceAI: splice gain is noted as the increase in splice usage (scores range from 0 to 1) and splice loss as the decrease in splice usage (scores range from 0 to -1). The Pangolin authors proposed a cutoff of >|0.2| for the predicted increase or decrease in splice site usage.
  - `phylop`: Base-wise conservation [score](https://pubmed.ncbi.nlm.nih.gov/37104612/) across the 241 placental mammals in the [Zoonomia](https://zoonomiaproject.org/) project. Score ranges from -20 to 9.28, and reflects acceleration (faster evolution than expected under neutral drift, assigned negative scores) as well as conservation (slower than expected evolution, assigned positive scores).
  - `sift_max`: [Score](https://www.nature.com/articles/nprot.2009.86) reflecting the scaled probability of the amino acid substitution being tolerated, ranging from 0 to 1. Scores below 0.05 are predicted to impact protein function. We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.
  - `polyphen_max`: [Score](https://www.nature.com/articles/nmeth0410-248) that predicts the possible impact of an amino acid substitution on the structure and function of a human protein, ranging from 0.0 (tolerated) to 1.0 (deleterious). We prioritize max scores for MANE Select transcripts where possible and otherwise report a score for the canonical transcript.

#### gnomAD v4.0 genomes Hail Table annotations

The v4 genomes Hail Table annotation schema is the same as the exomes schema, with only a few minor differences:

Global fields

- `interval_qc_parameters`: Only the v4 exomes HT has this global annotation

Row fields

- `fafmax`: This annotation is stratified by subset in the v4 exomes, but the v4 genomes annotation does not have any subset stratification
- joint `frequency` fields: These annotations will have the joint or combined exome and genome annotations on both release Hail Tables if the variant was present in both data types. If the variant was only present in one data type, then the annotation will contain the frequency information for just that data type (e.g., the 'joint_freq' will contain frequency information for genomes only on the v4 genomes Hail Table if that variant was only seen in the genomes
- `region_flags`: The v4 exomes Hail Table has the following fields that are not present in the struct on the v4 genomes Hail Table:
  - `fail_interval_qc`
  - `outside_ukb_capture_region`
  - `outside_broad_capture_region`
- `allele_info`: The v4 exomes Hail Table has an additional field in this struct, 'has_star', that is not present in the struct on the v4 genomes Hail Table
- `info`: Sibling singletons were used to train the variant QC models for the v4 exomes but were not used in the v4 genomes variant QC

| Category                 | Definition                                 | 2.1 Options                                                                                                                                                                              | 3.1 Options                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group`                  | Genotype's filter                          | raw                                                                                                                                                                                      | adj<sup>1</sup>, raw                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `sex`                    | Inferred sex/sex karyotype<sub>2</sub>     | female, male                                                                                                                                                                             | XX, XY                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `subset`                 | Sample subsets within release              | `gnomad`, `controls`, `non_neuro`, `non_topmed`, `non_cancer` (exomes only)                                                                                                              | `non_v2`, non_topmed, `non_neuro`, `non_cancer`, `controls_and_biobanks`                                                                                                                                                                                                                                                                                                                                                                          |
| `pop`                    | gnomAD inferred global ancestry            | `afr`, `ami`, `amr`, `asj`, `eas`, `fin`, `nfe`, `oth`, `sas`                                                                                                                            | `afr`, `ami`, `amr`, `asj`, `eas`, `fin`, `mid`, `nfe`, `oth`, `sas`                                                                                                                                                                                                                                                                                                                                                                              |
| `subpops`                | gnomAD inferred sub-continental ancestries | **Exomes**: </br>_nfe options_: `bgr`, `est`, `nwe`, `onf`, `seu`, `swe` <br/> _eas options_: `kor`, `jpn`, `oea` </br></br>**Genomes**: </br> _nfe options_: `est`, `nwe`, `seu`, `onf` | N/A                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `pop` (1KG subset only)  | The 1KG project's population labels        | N/A                                                                                                                                                                                      | `acb`, `asw`, `beb`, `cdx`, `ceu`, `chb`, `chs`, `clm`, `esn`, `fin`, `gbr`, `gih`, `gwd`, `ibs`, `itu`, `jpt`, `khv`, `lwk`, `msl`, `mxl`, `pel`, `pjl`, `pur`, `stu`, `tsi`, `yri`                                                                                                                                                                                                                                                              |
| `pop` (HGDP subset only) | The HGDP's population labels               | N/A                                                                                                                                                                                      | adygei, balochi, bantukenya, bantusafrica, basque, bedouin, biakapygmy, brahui, burusho, cambodian, colombian, dai, daur, druze, french, han, hazara, hezhen, italian, japanese, kalash, karitiana, lahu, makrani, mandenka, maya, mbutipygmy, melanesian, miaozu, mongola, mozabite, naxi, orcadian, oroqen, palestinian, papuan, pathan, pima, russian, san, sardinian, she, sindhi, surui, tu, tujia, tuscan, uygur, xibo, yakut, yizu, yoruba |
| `downsampling`           | Downsampled sample counts                  | N/A                                                                                                                                                                                      | 10, 20, 50, 100, 158, 200, 456, 500, 1000, 1047, 1736, 2000, 2419, 2604, 5000, 5316, 7647, 10000, 15000, 20000, 25000, 30000, 34029 40000, 50000, 60000, 70000, 75000                                                                                                                                                                                                                                                                             |

<br/>

#### Version 2.1 sample grouping combinations and `freq` array access

The available v2.1 grouping combinations within the '`freq`' array annotation are listed below. To access the full callset's data, use “`gnomad`” as the subset. Raw frequency information is only available for subsets; adj<sub>1</sub> frequency information is provided for all other combinations and does not need to be specified.

- `subset`, e.g. “`gnomad`”
- `subset_group`, e.g. “`controls_raw`”
- `subset_pop`, e.g. “`gnomad_afr`”
- `subset_pop_subpop`, e.g. “`non_topmed_eas_jpn`”
- `subset_pop_sex`, e.g. “`non_neuro_nfe_female`”

To access the 'freq' array using the '`freq_index_dict`', you need to retrieve the value of your desired label combination key. The example below accesses the entry of the high quality genotypes of XX individuals (sex: female2) labeled as `AFR` (pop: `AFR`) in the entire callset (subset: gnomad) for gnomAD v2.1.1 genomes:

```
# Load the v2.1.1 public release HT
from gnomad.resources.grch37.gnomad import public_release
ht = public_release(“genomes”).ht()

# Use the key 'gnomad_afr_female' to retrieve the index of this group's frequency data in 'freq'
ht = ht.annotate(afr_XX_freq=ht.freq[ht.freq_index_dict['gnomad_afr_female']])
```

The above example will retrieve the entire frequency struct for each variant. To grab a certain statistic, such as AC, specify the statistic after the value:

```
 ht = ht.annotate(afr_XX_AC=ht.freq[ht.freq_index_dict['gnomad_afr_female']].AC)
```

This same approach can be applied to the filtering allele frequency (FAF) array, '`faf`', by using the '`faf_index_dict`'.

#### Version 3.1 sample grouping combinations and `freq` array access

The available v3 grouping combinations within the 'freq' array annotation are listed below. Unlike v2.1, adj1 must be provided as the “group” for all combinations except when requesting raw frequency information, which is only available for the main callset and subsets.

- `group`, e.g. “`adj`”, “`raw`”
- `sex-group`, e.g. “`XX-adj`”
- `subset-group`, e.g. “`non_v2-raw`”
- `pop-group`, e.g. “`afr-adj`”
- `pop-sex-group`, e.g. “`ami-XX-adj`”
- `downsampling<sub>3</sub>-group-pop`, e.g. “`200-adj-eas`”,
- `subset-pop<sub>4</sub>-group`, e.g. “`non_topmed-sas-adj`”
- `subset-sex-group`, e.g. “`non_cancer-XY-adj`”
- `subset-pop4-sex-group`, e.g. “`controls_and_biobanks-mid-XX-adj`”,

To access the '`freq`' array using the '`freq_index_dict`', you need to retrieve the value of your desired label combination key. The example below accesses the entry of the high quality genotypes (group: adj) of XX individuals (sex: XX) labeled as AFR (pop: AFR) in gnomAD v3.1.2:

```
# Load the v3.1.2 public release HT
from gnomad.resources.grch38.gnomad import public_release
ht = public_release(“genomes”).ht()

# Use the key 'afr-XX-adj' to retrieve the index of this groups frequency data in 'freq'
ht = ht.annotate(afr_XX_freq=ht.freq[ht.freq_index_dict['afr-XX-adj']])
```

The above example will retrieve the entire frequency struct for each variant. To grab a certain statistic, such as AC, specify the statistic after the value:

```
ht = ht.annotate(afr_XX_AC=ht.freq[ht.freq_index_dict['afr-XX-adj']].AC)
```

This same approach can be applied to the filtering allele frequency (FAF) array, '`faf`', by using the '`faf_index_dict`'.

1. Includes only genotypes with depth >= 10, genotype quality >= 20 and minor allele balance > 0.2 for heterozygous genotypes.
2. The labels we use to classify individuals by chromosomal sex changed from “male” and “female” to “XY” and “XX.” More details available in this [blog post](https://gnomad.broadinstitute.org/news/2020-10-gnomad-v3-1-new-content-methods-annotations-and-data-availability/#tweaks-and-updates).
3. Some downsamplings exceed population counts and thus are not available for those populations.
4. For HGDP and 1KG subsets, project specified populations are available in place of gnomAD inferred global populations. The HGDP populations are detailed [here](https://science.sciencemag.org/content/367/6484/eaay5012). The 1KG populations are described [here](https://www.internationalgenome.org/category/population).

### Hail Table annotation descriptions

The gnomAD v3 Hail Table annotations are defined below:

**Global fields**:

- **freq_meta**: Allele frequency metadata. An ordered list containing the frequency aggregation group for each element of the ‘freq’ array row annotation.
- **freq_index_dict**: Dictionary keyed by specified label grouping combinations (group: adj/raw, gen_anc: gnomAD inferred global population, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the ‘freq’ array row annotation.
- **faf_index_dict**: Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: gnomAD inferred global population, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the filtering allele frequency (‘faf’) row annotation.
- **faf_meta**: Filtering allele frequency metadata. An ordered list containing the frequency aggregation group for each element of the ‘faf’ array row annotation.
- **VEP version**: VEP version that was run on the callset.
- **vep_csq_header**: VEP header for VCF export.
- **dbsnp_version**: dbSNP version used in the callset.
- **filtering_model**: The variant filtering model used and its specific cutoffs.
  - **model_name**: Variant filtering model name used in the 'filters' row annotation, indicating the variant was filtered by this model during variant QC.
  - **score_name**: Annotation name of the score used for variant filtering.
  - **snv_cutoff**: SNV filtering cutoff information.
    - **bin**: Filtering percentile cutoff for SNVs.
    - **min_score**: Minimum score at SNV filtering percentile cutoff.
  - **indel_cutoff**: Indel filtering cutoff information.
    - **bin**: Filtering percentile cutoff for indels.
    - **min_score**: Minimum score at indel filtering percentile cutoff.
  - **model_id**: Variant filtering model ID for score data (used for internal specification of the model).
  - **snv_training_variables**: Variant annotations used as features in the SNV filtering model.
  - **indel_training_variables**: Variant annotations used as features in the indel filtering model.
- **age_distribution**: Callset-wide age histogram calculated on release samples.
  - **bin_edges**: Bin edges for the age histogram.
  - **bin_freq**: Bin frequencies for the age histogram. This is the number of records found in each bin.
  - **n_smaller**: Count of age values falling below lowest histogram bin edge.
  - **n_larger**: Count of age values falling above highest histogram bin edge.
- **freq_sample_count**: A sample count per sample grouping defined in the 'freq_meta' global annotation.

**Row fields**:

- **locus**: Variant locus. Contains contig and position information.
- **alleles**: Variant alleles.
- **freq**: Array of allele frequency information (AC, AN, AF, homozygote count) for each frequency aggregation group in the gnomAD release.
  - **AC**: Alternate allele count in release.
  - **AF**: Alternate allele frequency, (AC/AN), in release.
  - **AN**: Total number of alleles in release.
  - **homozygote_count**: Count of homozygous alternate individuals in release.
- **raw_qual_hists**: Genotype quality metric histograms for all genotypes as opposed to high quality genotypes.
  - **gq_hist_all**: Histogram for GQ calculated on all genotypes.
    - **bin_edges**: Bin edges for the GQ histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    - **bin_freq**: Bin frequencies for the GQ histogram calculated on all genotypes. The number of records found in each bin.
    - **n_smaller**: Count of GQ values falling below lowest histogram bin edge, for GQ calculated on all genotypes.
    - **n_larger**: Count of GQ values falling above highest histogram bin edge, for GQ calculated on all genotypes.
  - **dp_hist_all**: Histogram for DP calculated on all genotypes.
    - **bin_edges**: Bin edges for the DP histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100
    - **bin_freq**: Bin frequencies for the DP histogram calculated on all genotypes. The number of records found in each bin.
    - **n_smaller**: Count of DP values falling below lowest histogram bin edge, for DP calculated on all genotypes.
    - **n_larger**: Count of DP values falling above highest histogram bin edge, for DP calculated on all genotypes.
  - **gq_hist_alt**: Histogram for GQ in heterozygous individuals calculated on all genotypes.
    - **bin_edges**: Bin edges for the histogram of GQ in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    - **bin_freq**: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
    - **n_smaller**: Count of GQ values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
    - **n_larger**: Count of GQ values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
  - **dp_hist_alt**: Histogram for DP in heterozygous individuals calculated on all genotypes.
    - **bin_edges**: Bin edges for the histogram of DP in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    - **bin_freq**: Bin frequencies for the histogram of DP in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
    - **n_smaller**: Count of DP values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
    - **n_larger**: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
  - **ab_hist_alt**: Histogram for AB in heterozygous individuals calculated on all genotypes.
    - **bin_edges**: Bin edges for the histogram of AB in heterozygous individuals calculated on all genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
    - **bin_freq**: Bin frequencies for the histogram of AB in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
    - **n_smaller**: Count of AB values in heterozygous individuals falling below lowest histogram bin edge, calculated on all genotypes.
    - **n_larger**: Count of AB values in heterozygous individuals falling above highest histogram bin edge, calculated on all genotypes.
- **grpmax**: Allele frequency information (AC, AN, AF, homozygote count) for the non-bottlenecked genetic ancestry group with maximum allele frequency. Excludes Amish (ami), Ashkenazi Jewish (asj), European Finnish (fin), Middle Eastern (mid), and "Other" (oth) group.
  - **AC**: Alternate allele count in the population with the maximum allele frequency.
  - **AF**: Maximum alternate allele frequency, (AC/AN), across populations in gnomAD.
  - **AN**: Total number of alleles in the population with the maximum allele frequency.
  - **homozygote_count**: Count of homozygous individuals in the population with the maximum allele frequency.
  - **pop**: Population with maximum allele frequency
  - **faf95**: Filtering allele frequency (using Poisson 95% CI) for the population with the maximum allele frequency.
- **qual_hists**: Genotype quality metric histograms for high quality genotypes.
  - **gq_hist_all**: Histogram for GQ calculated on high quality genotypes.
    - **bin_edges**: Bin edges for the GQ histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    - **bin_freq**: Bin frequencies for the GQ histogram calculated on high quality genotypes. The number of records found in each bin.
    - **n_smaller**: Count of GQ values falling below the lowest histogram bin edge, calculated on high quality genotypes.
    - **n_larger**: Count of GQ values falling above the highest histogram bin edge, calculated on high quality genotypes.
  - **dp_hist_all**: Histogram for DP calculated on high quality genotypes.
    - **bin_edges**: Bin edges for the DP histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    - **bin_freq**: Bin frequencies for the DP histogram calculated on high quality genotypes. The number of records found in each bin.
    - **n_smaller**: Count of DP values falling below the lowest histogram bin edge, calculated on high quality genotypes.
    - **n_larger**: Count of DP values falling above the highest histogram bin edge, calculated on high quality genotypes.
  - **gq_hist_alt**: Histogram for GQ in heterozygous individuals calculated on high quality genotypes.
    - **bin_edges**: Bin edges for the histogram of GQ in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    - **bin_freq**: Bin frequencies for the histogram of GQ in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
    - **n_smaller**: Count of GQ values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
    - **n_larger**: Count of GQ values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
  - **dp_hist_alt**: Histogram for DP in heterozygous individuals calculated on high quality genotypes.
    - **bin_edges**: Bin edges for the histogram of DP in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    - **bin_freq**: Bin frequencies for the histogram of DP in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
    - **n_smaller**: Count of DP values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
    - **n_larger**: Count of DP values in heterozygous individuals falling above highest histogram bin edge, calculated on high quality genotypes.
  - **ab_hist_alt**: Histogram for AB in heterozygous individuals calculated on high quality genotypes.
    - **bin_edges**: Bin edges for the histogram of AB in heterozygous individuals calculated on high quality genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
    - **bin_freq**: Bin frequencies for the histogram of AB in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
    - **n_smaller**: Count of AB values in heterozygous individuals falling below the lowest histogram bin edge, calculated on high quality genotypes.
    - **n_larger**: Count of AB values in heterozygous individuals falling above the highest histogram bin edge, calculated on high quality genotypes.
- **faf**: Filtering allele frequency.
  - **faf95**: Filtering allele frequency (using Poisson 95% CI).
  - **faf99**: Filtering allele frequency (using Poisson 99% CI).
- **a_index**: The original index of this alternate allele in the multiallelic representation (1 is the first alternate allele or the only alternate allele in a biallelic variant).
- **was_split**: True if this variant was originally multiallelic, otherwise False.
- **rsid**: dbSNP reference SNP identification (rsID) numbers.
- **filters**: Variant filters; AC0: Allele count is zero after filtering out low-confidence genotypes (GQ &lt; 20; DP &lt; 10; and AB &lt; 0.2 for het calls), AS_VQSR: Failed allele-specific VQSR filtering thresholds of -2.7739 for SNPs and -1.0606 for indels, InbreedingCoeff: GATK InbreedingCoeff &lt; -0.3, PASS: Passed all variant filters.
- **info**: Struct containing typical GATK allele-specific (AS) info fields and additional variant QC fields.
  - **QUALapprox**: Sum of PL[0] values; used to approximate the QUAL score.
  - **SB**: Per-sample component statistics which comprise the Fisher's exact test to detect strand bias. Values are: depth of reference allele on forward strand, depth of reference allele on reverse strand, depth of alternate allele on forward strand, depth of alternate allele on reverse strand.
  - **MQ**: Root mean square of the mapping quality of reads across all samples.
  - **MQRankSum**: Z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
  - **VarDP**: Depth over variant genotypes (does not include depth of reference samples).
  - **AS_ReadPosRankSum**: Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
  - **AS_pab_max**: Maximum p-value over callset for binomial test of observed allele balance for a heterozygous genotype, given expectation of 0.5.
  - **AS_QD**: Allele-specific variant call confidence normalized by depth of sample reads supporting a variant.
  - **AS_MQ**: Allele-specific root mean square of the mapping quality of reads across all samples.
  - **QD**: Variant call confidence normalized by depth of sample reads supporting a variant.
  - **AS_MQRankSum**: Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
  - **FS**: Phred-scaled p-value of Fisher's exact test for strand bias.
  - **AS_FS**: Allele-specific phred-scaled p-value of Fisher's exact test for strand bias.
  - **ReadPosRankSum**: Z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
  - **AS_QUALapprox**: Allele-specific sum of PL[0] values; used to approximate the QUAL score.
  - **AS_SB_TABLE**: Allele-specific forward/reverse read counts for strand bias tests.
  - **AS_VarDP**: Allele-specific depth over variant genotypes (does not include depth of reference samples).
  - **AS_SOR**: Allele-specific strand bias estimated by the symmetric odds ratio test.
  - **SOR**: Strand bias estimated by the symmetric odds ratio test.
  - **singleton**: Variant is seen once in the callset.
  - **transmitted_singleton**: Variant was a callset-wide doubleton that was transmitted within a family from a parent to a child (i.e., a singleton amongst unrelated samples in cohort).
  - **omni**: Variant is present on the Omni 2.5 genotyping array and found in 1000 Genomes data.
  - **mills**: Indel is present in the Mills and Devine data.
  - **monoallelic**: All samples are homozygous alternate for the variant.
  - **AS_VQSLOD**: Allele-specific log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.
  - **InbreedingCoeff**: Inbreeding coefficient, the excess heterozygosity at a variant site, computed as 1 - (the number of heterozygous genotypes) / (the number of heterozygous genotypes expected under Hardy-Weinberg equilibrium).
- **vep**: Consequence annotations from Ensembl VEP. More details about VEP output is described [here](https://ensembl.org/info/docs/tools/vep/vep_formats.html#output). VEP was run using the LOFTEE plugin and information about the additional LOFTEE annotations can be found [here](https://github.com/konradjk/loftee).
- **vqsr**: VQSR related variant annotations.
  - **AS_VQSLOD**: Allele-specific log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.
  - **AS_culprit**: Allele-specific worst-performing annotation in the VQSR Gaussian mixture model.
  - **NEGATIVE_TRAIN_SITE**: Variant was used to build the negative training set of low-quality variants for VQSR.
  - **POSITIVE_TRAIN_SITE**: Variant was used to build the positive training set of high-quality variants for VQSR.
- **region_flag**: Struct containing flags for problematic regions.
  - **lcr**: Variant falls within a low complexity region.
  - **segdup**: Variant falls within a segmental duplication region.
- **allele_info**: Allele information.
  - **variant_type**: Variant type (snv, indel, multi-snv, multi-indel, or mixed).
  - **allele_type**: Allele type (snv, insertion, deletion, or mixed).
  - **n_alt_alleles**: Total number of alternate alleles observed at variant locus.
  - **was_mixed**: Variant type was mixed.
- **age_hist_het**: Histogram for age in all heterozygous release samples calculated on high quality genotypes.
  - **bin_edges**: Bin edges for the age histogram.
  - **bin_freq**: Bin frequencies for the age histogram. This is the number of records found in each bin.
  - **n_smaller**: Count of age values falling below lowest histogram bin edge.
  - **n_larger**: Count of age values falling above highest histogram bin edge.
- **age_hist_hom**: Histogram for age in all homozygous release samples calculated on high quality genotypes.
  - **bin_edges**: Bin edges for the age histogram.
  - **bin_freq**: Bin frequencies for the age histogram. This is the number of records found in each bin.
  - **n_smaller**: Count of age values falling below lowest histogram bin edge.
  - **n_larger**: Count of age values falling above highest histogram bin edge.
- **cadd**:
  - **phred**: Cadd Phred-like scores ('scaled C-scores') ranging from 1 to 99, based on the rank of each variant relative to all possible 8.6 billion substitutions in the human reference genome. Larger values are more deleterious.
  - **raw_score**: Raw CADD scores are interpretable as the extent to which the annotation profile for a given variant suggests that the variant is likely to be 'observed' (negative values) vs 'simulated' (positive values). Larger values are more deleterious.
  - **has_duplicate**:Whether the variant has more than one CADD score associated with it.
- **revel**:
  - **revel_score**: dbNSFP's Revel score from 0 to 1. Variants with higher scores are predicted to be more likely to be deleterious.
  - **has_duplicate**: Whether the variant has more than one revel_score associated with it.
- **splice_ai**:
  - **splice_ai**: The maximum delta score, interpreted as the probability of the variant being splice-altering.
  - **splice_consequence**: The consequence term associated with the max delta score in 'splice_ai_max_ds'.
  - **has_duplicate**: Whether the variant has more than one splice_ai score associated with it.
- **primate_ai**:
  - **primate_ai_score**: PrimateAI's deleteriousness score from 0 (less deleterious) to 1 (more deleterious).
  - **has_duplicate**: Whether the variant has more than one primate_ai_score associated with it.

</details>
