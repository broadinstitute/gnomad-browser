---
id: hgdp-1kg-annotations
title: 'HGDP + 1KG dense MatrixTable annotation descriptions'
---

This dataset includes genomes from the Human Genome Diversity Project (HGDP) and the 1000 Genomes Project (1KG). We have added sample QC and variant QC annotations performed on the full gnomAD dataset as well as sample QC annotations specific to this unique and diverse subset. This MatrixTable also includes a [synthetic-diploid](https://www.nature.com/articles/s41592-018-0054-7?WT.feed_name=subjects_standards) (syndip) sample (a mixture of DNA from two haploid CHM cell lines).

### Global annotations:
* **gnomad_sex_imputation_ploidy_cutoffs:** Contains sex chromosome ploidy cutoffs used when determining sex chromosome karyotypes for the gnomAD sex imputation. Format: (upper cutoff for single X, (lower cutoff for double X, upper cutoff for double X), lower cutoff for triple X) and (lower cutoff for single Y, upper cutoff for single Y), lower cutoff for double Y).
* **gnomad_population_inference_pca_metrics:** Contains the number of principal components (PCs) used when running PC-project and the minimum cutoff probability of belonging to a given population for the gnomAD population inference.
* **sample_hard_filter_cutoffs:** Contains the cutoffs used for hard-filtering samples prior to sample QC. Sample QC metrics are computed using the Hail sample_qc module on all autosomal bi-allelic SNVs. Samples are removed if they are clear outliers for any of the following metrics: number of snps (n_snp), ratio of heterozygous variants to homozygous variants (r_het_hom_var), number of singletons (n_singleton), and mean coverage on chromosome 20 (cov). Additionally, we filter based on outliers of the following BAM/CRAM-derived metrics: % contamination (freemix), % chimera, and median insert size.
* **gnomad_sample_qc_metric_outlier_cutoffs:** Contains the cutoffs used for filtering outlier samples based on QC metrics (reported in the sample_qc and gnomad_sample_qc_residuals annotations). The first eight PCs computed during the gnomAD ancestry assignment were regressed out and the sample filter cutoffs were determined based on the residuals for each of the sample QC metrics. Samples were filtered if they fell outside four median absolute deviations (MADs) from the median for the following sample QC metrics: n_snp, r_ti_tv, r_insertion_deletion, n_insertion, n_deletion, n_het, n_hom_var, n_transition, and n_transversion. Samples over 8 MADs above the median n_singleton metric and over 4 MADs above the median r_het_hom_var metric were also filtered.
* **gnomad_age_distribution:** gnomAD callset-wide age histogram calculated on release samples.
  * **bin_edges:** Bin edges for the age histogram.
  * **bin_freq:** Bin frequencies for the age histogram. This is the number of records found in each bin.
  * **n_smaller:** Count of age values falling below lowest histogram bin edge.
  * **n_larger:** Count of age values falling above highest histogram bin edge.
* **hgdp_tgp_freq_meta:** HGDP and 1KG frequency metadata. An ordered list containing the frequency aggregation group for each element of the hgdp_tgp_freq array row annotation.
* **gnomad_freq_meta:** gnomAD frequency metadata. An ordered list containing the frequency aggregation group for each element of the gnomad_freq array row annotation.
* **hgdp_tgp_freq_index_dict:** Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: HGDP or 1KG subpopulation, sex: sex karyotype), with values describing the corresponding index of each grouping entry in the HGDP + 1KG frequency array annotation.
* **gnomad_freq_index_dict:** Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: gnomAD inferred global population sex: sex karyotype), with values describing the corresponding index of each grouping entry in the gnomAD frequency array annotation.
* **gnomad_faf_meta:** gnomAD filtering allele frequency metadata. An ordered list containing the frequency aggregation group for each element of the gnomad_faf array row annotation.
* **gnomad_faf_index_dict:** Dictionary keyed by specified label grouping combinations (group: adj/raw, pop: gnomAD inferred global population sex: sex karyotype), with values describing the corresponding index of each grouping entry in the filtering allele frequency (using Poisson 99% CI) annotation.
* **variant_filtering_model:** The variant filtering model used and its specific cutoffs.
  * **model_name:** Variant filtering model name used in the 'filters' row annotation to indicate the variant was filtered by the model during variant QC.
  * **score_name:** Name of score used for variant filtering.
  * **snv_cutoff:** SNV filtering cutoff information.
    * **bin:** Filtering percentile cutoff for SNVs.
    * **min_score:** Minimum score at SNV filtering percentile cutoff.
  * **indel_cutoff:** Information about cutoff used for indel filtering.
    * **bin:** Filtering percentile cutoff for indels.
    * **min_score:** Minimum score at indel filtering percentile cutoff.
  * **snv_training_variables:** Variant annotations used as features in SNV filtering model.
  * **indel_training_variables:** Variant annotations used as features in indel filtering model.
* **variant_inbreeding_coeff_cutoff:** Hard-filter cutoff for InbreedingCoeff on variants.
* **vep_version:** VEP version.
* **vep_csq_header:** VEP header for VCF export.
* **dbsnp_version:** dbSNP version.

### Column annotations (samples):
* **s:** Sample ID.
* **bam_metrics:** Sample level metrics obtained from BAMs/CRAMs.
  * **pct_bases_20x:** The fraction of bases that attained at least 20X sequence coverage in post-filtering bases.
  * **pct_chimeras:** The fraction of reads that map outside of a maximum insert size (usually 100kb) or that have the two ends mapping to different chromosomes.
  * **freemix:** Estimate of contamination (0-100 scale).
  * **mean_coverage:** The mean coverage in bases of the genome territory after all filters are applied; see [here](https://broadinstitute.github.io/picard/picard-metric-definitions.html).
  * **median_coverage:** The median coverage in bases of the genome territory after all filters are applied; see [here](https://broadinstitute.github.io/picard/picard-metric-definitions.html).
  * **mean_insert_size:** The mean insert size of the 'core' of the distribution. Artefactual outliers in the distribution often cause calculation of nonsensical mean and stdev values. To avoid this, the distribution is first trimmed to a 'core' distribution of +/- N median absolute deviations around the median insert size.
  * **median_insert_size:** The median insert size of all paired end reads where both ends mapped to the same chromosome.
  * **pct_bases_10x:** The fraction of bases that attained at least 10X sequence coverage in post-filtering bases.
* **sample_qc:** Struct containing sample QC metrics calculated using hl.sample_qc().
  * **n_deletion:** Number of deletion alternate alleles.
  * **n_het:** Number of heterozygous calls.
  * **n_hom_ref:** Number of homozygous reference calls.
  * **n_hom_var:** Number of homozygous alternate calls.
  * **n_insertion:** Number of insertion alternate alleles.
  * **n_non_ref:** Sum of n_het and n_hom_var.
  * **n_snp:** Number of SNP alternate alleles.
  * **n_transition:** Number of transition (A-G, C-T) alternate alleles.
  * **n_transversion:** Number of transversion alternate alleles.
  * **r_het_hom_var:** Het/HomVar call ratio.
  * **r_insertion_deletion:** Insertion/Deletion allele ratio.
  * **r_ti_tv:** Transition/Transversion ratio.
* **gnomad_sex_imputation:** Struct containing sex imputation information.
  * **chr20_mean_dp:** Sample's mean depth across chromosome 20.
  * **chrX_mean_dp:** Sample's mean depth across chromosome X.
  * **chrY_mean_dp:** Sample's mean depth across chromosome Y.
  * **chrX_ploidy:** Sample's chromosome X ploidy (chrX_mean_dp normalized using chr20_mean_dp).
  * **chrY_ploidy:** Sample's chromosome Y ploidy (chrY_mean_dp normalized using chr20_mean_dp).
  * **X_karyotype:** Sample's chromosome X karyotype.
  * **Y_karyotype:** Sample's chromosome Y karyotype.
  * **sex_karyotype:** Sample's sex karyotype (combined X and Y karyotype).
  * **f_stat:** Inbreeding coefficient (excess heterozygosity) on chromosome X.
  * **n_called:** Number of variants with a genotype call.
  * **expected_homs:** Expected number of homozygotes.
  * **observed_homs:** Observed number of homozygotes.
* **gnomad_population_inference:** Struct containing ancestry information assigned by applying a principal components analysis (PCA) on gnomAD samples and using those PCs in a random forest classifier trained on known gnomAD ancestry labels.
  * **pca_scores:** Sample's scores for each gnomAD population PC.
  * **pop:** Sample's inferred gnomAD population label.
  * **prob_afr:** Random forest probability that the sample is of African/African American ancestry.
  * **prob_ami:** Random forest probability that the sample is of Amish ancestry.
  * **prob_amr:** Random forest probability that the sample is of Latino ancestry.
  * **prob_asj:** Random forest probability that the sample is of Ashkenazi Jewish ancestry.
  * **prob_eas:** Random forest probability that the sample is of East Asian ancestry.
  * **prob_fin:** Random forest probability that the sample is of Finnish ancestry.
  * **prob_mid:** Random forest probability that the sample is of Middle Eastern ancestry.
  * **prob_nfe:** Random forest probability that the sample is of Non-Finnish European ancestry.
  * **prob_oth:** Random forest probability that the sample is of Other ancestry.
  * **prob_sas:** Random forest probability that the sample is of South Asian ancestry.
* **gnomad_sample_qc_residuals:** Struct containing the residuals after regressing out the first eight PCs computed during the gnomAD ancestry assignment from each sample QC metric calculated using hl.sample_qc().
  * **n_snp_residual:** Residuals after regressing out the first eight ancestry PCs from the number of SNP alternate alleles.
  * **r_ti_tv_residual:** Residuals after regressing out the first eight ancestry PCs from the Transition/Transversion ratio.
  * **r_insertion_deletion_residual:** Residuals after regressing out the first eight ancestry PCs from the Insertion/Deletion allele ratio.
  * **n_insertion_residual:** Residuals after regressing out the first eight ancestry PCs from the number of insertion alternate alleles.
  * **n_deletion_residual:** Residuals after regressing out the first eight ancestry PCs from the number of deletion alternate alleles.
  * **r_het_hom_var_residual:** Residuals after regressing out the first eight ancestry PCs from the Het/HomVar call ratio.
  * **n_transition_residual:** Residuals after regressing out the first eight ancestry PCs from the number of transition (A-G, C-T) alternate alleles.
  * **n_transversion_residual:** Residuals after regressing out the first eight ancestry PCs from the number of transversion alternate alleles.
* **gnomad_sample_filters:** Sample QC filter annotations used for the gnomAD release.
  * **hard_filters:** Set of hard filters applied to each sample prior to additional sample QC. Samples are hard filtered if they are extreme outliers for any of the following metrics: number of snps (n_snp), ratio of heterozygous variants to homozygous variants (r_het_hom_var), number of singletons (n_singleton), and mean coverage on chromosome 20 (cov). Additionally, we filter based on outliers of the following Picard metrics: % contamination (freemix), % chimera, and median insert size.
  * **hard_filtered:** Whether a sample was hard filtered. The gnomad_sample_filters.hard_filters set is empty if this annotation is True.
  * **release_related:** Whether a sample had a second-degree or greater relatedness to another sample in the gnomAD release.
  * **qc_metrics_filters:** Set of all sample QC metrics for which each sample was found to be an outlier after computing sample QC metrics using the Hail sample_qc() module and regressing out the first 8 gnomAD ancestry assignment PCs.
* **gnomad_high_quality:** Whether a sample has passed gnomAD sample QC metrics except for relatedness (i.e., gnomad_sample_filters.hard_filters and gnomad_sample_filters.qc_metrics_filters are empty sets).
* **gnomad_release:** Whether the sample was included in the gnomAD release dataset. For the full gnomAD release, relatedness inference is performed on the full dataset, and release samples are chosen in a way that maximizes the number of samples retained while filtering the dataset to include only samples with less than second-degree relatedness. For the HGDP + 1KG subset, samples passing all other sample QC metrics are retained.
* **relatedness_inference:** Information about the sample’s relatedness to other samples within the callset.
  * **related_samples:** Set of all HGDP or 1KG samples that have a kinship estimate (kin) > 0.05 determined using Hail’s [pc_relate](https://hail.is/docs/0.2/methods/relatedness.html#hail.methods.pc_relate) module with this sample. More details on the relatedness inference can be found [here](https://github.com/atgu/hgdp_tgp/blob/master/tutorials/nb2.ipynb). This set is empty if the sample has no such relationships within this HGDP + 1KG subset. Each entry of the set consists of a struct containing the following information about this relationship:
    * **s:** Sample ID.
    * **kin:** Kinship estimate.
    * **ibd0:** IBD0 estimate.
    * **ibd1:** IBD1 estimate.
    * **ibd2:** IBD2 estimate.
  * **related:** Indicates whether this sample is excluded from variant frequency calculations (hgdp_tgp_freq) because of relatedness to other samples. Closely related individuals are pruned from the dataset to enhance the accuracy of population frequency estimates. Pruning using Hail’s [maximal_independent_set](https://hail.is/docs/0.2/methods/misc.html#hail.methods.maximal_independent_set) module maintains the maximal number of individuals in the dataset.
* **hgdp_tgp_meta:** Sample metadata specific to the HGDP + 1KG subset.
  * **project:** Indicates if the sample is part of the Human Genome Diversity Project (‘HGDP’), the ‘1000 Genomes’ project, or is the [synthetic-diploid](https://www.nature.com/articles/s41592-018-0054-7?WT.feed_name=subjects_standard) sample (a mixture of DNA from two haploid CHM cell lines).
  * **study_region:** Study-specific global population labels.
  * **population:** Population label for HGDP or 1KG. The HGDP populations are detailed [here](https://science.sciencemag.org/content/367/6484/eaay5012). 1KG populations are described [here](https://www.internationalgenome.org/category/population).
  * **genetic_region:** Global population labels harmonized across both studies.
  * **latitude:** Approximate latitude of the geographical place of origin of the population.
  * **longitude:** Approximate longitude of the geographical place of origin of the population.
  * **hgdp_technical_meta:** Technical considerations for HGDP detailed [here](https://science.sciencemag.org/content/367/6484/eaay5012). This struct will be missing for 1KG samples and syndip.
    * **source:** Which batch/project these HGDP samples were sequenced in (Sanger vs Simons Genome Diversity Project).
    * **library_type:** Whether library prep was PCR-free or used PCR.
  * **global_pca_scores:** Array of the first 20 principal components analysis (PCA) scores on the full HGDP + 1KG subset. Obtained by first dividing the sample set into relateds and unrelateds (using relatedness_inference.related). PCA was run on the unrelated samples using Hail’s [hwe_normalized_pca](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.hwe_normalized_pca) module, producing a global PCA score for each of the unrelated samples and loadings for each variant. The related samples were then [projected](https://hail.is/docs/0.2/experimental/index.html#hail.experimental.pc_project) onto the predefined PCA space using the variant loadings from the unrelated sample PCA to produce the PC scores for the related samples. Code used to obtain these scores can be found under `global pca` [here](https://github.com/atgu/hgdp_tgp/blob/master/tutorials/nb2.ipynb)
  * **subcontinental_pca:** The subcontinental PCAs were obtained in a similar manner as the global PCA scores (hgdp_tgp_meta.global_pca_scores). The full HGDP + 1KG subset was split by genetic region (hgdp_tgp_meta.genetic_region) prior to performing the same PCA and PC projection steps described for the global PCA scores. These steps were performed for each region separately. The code used to obtain these scores can be found under `subcontinental pca` [here](https://github.com/atgu/hgdp_tgp/blob/master/tutorials/nb2.ipynb)
    * **pca_scores:** Array of the first 20 subcontinental PCA scores for the sample based on its value in the hgdp_tgp_meta.genetic_region annotation (one of: AFR, AMR, CSA, EAS, EUR, MID, or OCE).
    * **pca_scores_outliers_removed:** Array of the first 20 subcontinental PCA scores following the removal of samples labeled as subcontinental PCA outliers (hgdp_tgp_meta.subcontinental_pca.outlier).
  * **outlier:** Whether the sample was an outlier in the subcontinental PCAs.
  * **gnomad_labeled_subpop:** Similar to the `hgdp_tgp_meta.population` annotation, this is the sample's population label supplied by HGDP or 1KG with slight modifications that were used to harmonize labels with other gnomAD samples.
* **high_quality:** Samples that pass all ‘gnomad_sample_filters.hard_filters’ and were not found to be outliers in global population-specific principal component analysis `hgdp_tgp_meta.subcontinental_pca.outlier`.

### Row annotations (variants):
* **locus:** Variant locus. Contains contig and position information.
* **alleles:** Variant alleles.
* **rsid:** dbSNP reference SNP identification (rsID) numbers.
* **a_index:** The original index of this alternate allele in the multiallelic representation (1 is the first alternate allele or the only alternate allele in a biallelic variant).
* **was_split:** True if this variant was originally multiallelic, otherwise False.
* **hgdp_tgp_freq:** Allele frequency information (AC, AN, AF, homozygote count) in HGDP + 1KG samples that pass the high_quality sample annotation and are inferred as unrelated (False in relatedness_inference.related annotation).
  * **AC:** Alternate allele count  in HGDP + 1KG samples that pass the high_quality sample annotation.
  * **AF:** Alternate allele frequency  in HGDP + 1KG samples that pass the high_quality sample annotation.
  * **AN:** Total number of alleles in HGDP + 1KG samples that pass the high_quality sample annotation.
  * **homozygote_count:** Count of homozygous individuals in HGDP + 1KG samples that pass the high_quality sample annotation.
* **gnomad_freq:** Allele frequency information (AC, AN, AF, homozygote count) in gnomAD release.
  * **AC:** Alternate allele count in gnomAD release.
  * **AF:** Alternate allele frequency in gnomAD release.
  * **AN:** Total number of alleles in gnomAD release.
  * **homozygote_count:** Count of homozygous individuals in gnomAD release.
* **gnomad_popmax:** Allele frequency information (AC, AN, AF, homozygote count) for the population with maximum AF in gnomAD.
  * **AC:** Allele count in the population with the maximum AF in gnomAD.
  * **AF:** Maximum allele frequency across populations in gnomAD.
  * **AN:** Total number of alleles in the population with the maximum AF in gnomAD.
  * **homozygote_count:** Count of homozygous individuals in the population with the maximum allele frequency in gnomAD.
  * **pop:** Population with maximum AF in gnomAD.
  * **faf95:** Filtering allele frequency (using Poisson 95% CI) for the population with the maximum allele frequency in gnomAD.
* **gnomad_faf:** Filtering allele frequency in gnomAD release.
  * **faf95:** Filtering allele frequency in gnomAD release (using Poisson 95% CI).
  * **faf99:** Filtering allele frequency in gnomAD release (using Poisson 99% CI).
* **gnomad_qual_hists:** gnomAD genotype quality metric histograms for high quality genotypes.
  * **gq_hist_all:** Histogram for GQ calculated on high quality genotypes.
    * **bin_edges:** Bin edges for the GQ histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100
    * **bin_freq:** Bin frequencies for the GQ histogram calculated on high quality genotypes. The number of records found in each bin.
    * **n_smaller:** Count of GQ values falling below lowest histogram bin edge, for GQ calculated on high quality genotypes
    * **n_larger:** Count of GQ values falling above highest histogram bin edge, for GQ calculated on high quality genotypes
  * **dp_hist_all:** Histogram for DP calculated on high quality genotypes.
    * **bin_edges:** Bin edges for the DP histogram calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    * **bin_freq:** Bin frequencies for the DP histogram calculated on high quality genotypes. The number of records found in each bin.
    * **n_smaller:** Count of DP values falling below lowest histogram bin edge, for DP calculated on high quality genotypes.
    * **n_larger:** Count of DP values falling above highest histogram bin edge, for DP calculated on high quality genotypes.
  * **gq_hist_alt:** Histogram for GQ in heterozygous individuals calculated on high quality genotypes.
    * **bin_edges:** Bin edges for the histogram of GQ in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    * **bin_freq:** Bin frequencies for the histogram of GQ in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
    * **n_smaller:** Count of GQ values falling below lowest histogram bin edge, for GQ in heterozygous individuals calculated on high quality genotypes.
    * **n_larger:** Count of GQ values falling above highest histogram bin edge, for GQ in heterozygous individuals calculated on high quality genotypes.
  * **dp_hist_alt:** Histogram for DP in heterozygous individuals calculated on high quality genotypes.
    * **bin_edges:** Bin edges for the histogram of DP in heterozygous individuals calculated on high quality genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    * **bin_freq:** Bin frequencies for the histogram of DP in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
    * **n_smaller:** Count of DP values falling below lowest histogram bin edge, for DP in heterozygous individuals calculated on high quality genotypes.
    * **n_larger:** Count of DP values falling above highest histogram bin edge, for DP in heterozygous individuals calculated on high quality genotypes.
  * **ab_hist_alt:** Histogram for AB in heterozygous individuals calculated on high quality genotypes.
    * **bin_edges:** Bin edges for the histogram of AB in heterozygous individuals calculated on high quality genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
    * **bin_freq:** Bin frequencies for the histogram of AB in heterozygous individuals calculated on high quality genotypes. The number of records found in each bin.
    * **n_smaller:** Count of AB values falling below lowest histogram bin edge, for AB in heterozygous individuals calculated on high quality genotypes.
    * **n_larger:** Count of AB values falling above highest histogram bin edge, for AB in heterozygous individuals calculated on high quality genotypes.
 * **gnomad_raw_qual_hists:** gnomAD genotype quality metric histograms.
  * **gq_hist_all:** Histogram for GQ calculated on all genotypes.
    * **bin_edges:** Bin edges for the GQ histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    * **bin_freq:** Bin frequencies for the GQ histogram calculated on all genotypes. The number of records found in each bin.
    * **n_smaller:** Count of GQ values falling below lowest histogram bin edge, for GQ calculated on all genotypes.
    * **n_larger:** Count of GQ values falling above highest histogram bin edge, for GQ calculated on all genotypes.
  * **dp_hist_all:** Histogram for DP calculated on all genotypes.
    * **bin_edges:** Bin edges for the DP histogram calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100
    * **bin_freq:** Bin frequencies for the DP histogram calculated on all genotypes. The number of records found in each bin.
    * **n_smaller:** Count of DP values falling below lowest histogram bin edge, for DP calculated on all genotypes.
    * **n_larger:** Count of DP values falling above highest histogram bin edge, for DP calculated on all genotypes.
  * **gq_hist_alt:** Histogram for GQ in heterozygous individuals calculated on all genotypes.
    * **bin_edges:** Bin edges for the histogram of GQ in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    * **bin_freq:** Bin frequencies for the histogram of GQ in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
    * **n_smaller:** Count of GQ values falling below lowest histogram bin edge, for GQ in heterozygous individuals calculated on all genotypes.
    * **n_larger:** Count of GQ values falling above highest histogram bin edge, for GQ in heterozygous individuals calculated on all genotypes.
  * **dp_hist_alt:** Histogram for DP in heterozygous individuals calculated on all genotypes.
    * **bin_edges:** Bin edges for the histogram of DP in heterozygous individuals calculated on all genotypes are: 0|5|10|15|20|25|30|35|40|45|50|55|60|65|70|75|80|85|90|95|100.
    * **bin_freq:** Bin frequencies for the histogram of DP in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
    * **n_smaller:** Count of DP values falling below lowest histogram bin edge, for DP in heterozygous individuals calculated on all genotypes.
    * **n_larger:** Count of DP values falling above highest histogram bin edge, for DP in heterozygous individuals calculated on all genotypes.
  * **ab_hist_alt:** Histogram for AB in heterozygous individuals calculated on all genotypes.
    * **bin_edges:** Bin edges for the histogram of AB in heterozygous individuals calculated on all genotypes are: 0.00|0.05|0.10|0.15|0.20|0.25|0.30|0.35|0.40|0.45|0.50|0.55|0.60|0.65|0.70|0.75|0.80|0.85|0.90|0.95|1.00.
    * **bin_freq:** Bin frequencies for the histogram of AB in heterozygous individuals calculated on all genotypes. The number of records found in each bin.
    * **n_smaller:** Count of AB values falling below lowest histogram bin edge, for AB in heterozygous individuals calculated on all genotypes.
    * **n_larger:** Count of AB values falling above highest histogram bin edge, for AB in heterozygous individuals calculated on all genotypes.
* **gnomad_age_hist_het:** Histogram for age in all heterozygous gnomAD release samples calculated on high quality genotypes.
  * **bin_edges:** Bin edges for the age histogram.
  * **bin_freq:** Bin frequencies for the age histogram. This is the number of records found in each bin.
  * **n_smaller:** Count of age values falling below lowest histogram bin edge.
  * **n_larger:** Count of age values falling above highest histogram bin edge.
* **gnomad_age_hist_hom:** Histogram for age in all homozygous gnomAD release samples calculated on high quality genotypes.
  * **bin_edges:** Bin edges for the age histogram.
  * **bin_freq:** Bin frequencies for the age histogram. This is the number of records found in each bin.
  * **n_smaller:** Count of age values falling below lowest histogram bin edge.
  * **n_larger:** Count of age values falling above highest histogram bin edge.
* **filters:** Variant filters; AC0: Allele count is zero after filtering out low-confidence genotypes (GQ < 20; DP < 10; and AB < 0.2 for het calls), AS_VQSR: Failed VQSR filtering thresholds of -2.7739 for SNPs and -1.0606 for indels, InbreedingCoeff: GATK InbreedingCoeff < -0.3, PASS: Passed all variant filters.
* **info:** Struct containing typical GATK allele-specific (AS) info fields and additional variant QC fields.
  * **QUALapprox:** Sum of PL[0] values; used to approximate the QUAL score.
  * **SB:** Per-sample component statistics which comprise the Fisher's exact test to detect strand bias. Values are: depth of reference allele on forward strand, depth of reference allele on reverse strand, depth of alternate allele on forward strand, depth of alternate allele on reverse strand.
  * **MQ:** Root mean square of the mapping quality of reads across all samples.
  * **MQRankSum:** Z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
  * **VarDP:** Depth over variant genotypes (does not include depth of reference samples).
  * **AS_ReadPosRankSum:** Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
  * **AS_pab_max:** Maximum p-value over callset for binomial test of observed allele balance for a heterozygous genotype, given expectation of 0.5.
  * **AS_QD:** Allele-specific variant call confidence normalized by depth of sample reads supporting a variant.
  * **AS_MQ:** Allele-specific root mean square of the mapping quality of reads across all samples.
  * **QD:** Variant call confidence normalized by depth of sample reads supporting a variant.
  * **AS_MQRankSum:** Allele-specific z-score from Wilcoxon rank sum test of alternate vs. reference read mapping qualities.
  * **FS:** Phred-scaled p-value of Fisher's exact test for strand bias.
  * **AS_FS:** Allele-specific phred-scaled p-value of Fisher's exact test for strand bias.
  * **ReadPosRankSum:** Z-score from Wilcoxon rank sum test of alternate vs. reference read position bias.
  * **AS_QUALapprox:** Allele-specific sum of PL[0] values; used to approximate the QUAL score.
  * **AS_SB_TABLE:** Allele-specific forward/reverse read counts for strand bias tests.
  * **AS_VarDP:** Allele-specific depth over variant genotypes (does not include depth of reference samples).
  * **AS_SOR:** Allele-specific strand bias estimated by the symmetric odds ratio test.
  * **SOR:** Strand bias estimated by the symmetric odds ratio test.
  * **transmitted_singleton:** Variant was a callset-wide doubleton that was transmitted within a family from a parent to a child (i.e., a singleton amongst unrelated samples in cohort).
  * **omni:** Variant is present on the Omni 2.5 genotyping array and found in 1000 Genomes data.
  * **mills:** Indel is present in the Mills and Devine data.
  * **monoallelic:** All samples are homozygous alternate for the variant.
  * **InbreedingCoeff:** Inbreeding coefficient, the excess heterozygosity at a variant site, computed as 1 - (the number of heterozygous genotypes)/(the number of heterozygous genotypes expected under Hardy-Weinberg equilibrium).
* **vep:** Consequence annotations from Ensembl VEP. More details about VEP output is described [here](https://ensembl.org/info/docs/tools/vep/vep_formats.html#output). VEP was run using the LOFTEE plugin and information about the additional LOFTEE annotations can be found [here](https://github.com/konradjk/loftee).
* **vqsr:** VQSR related variant annotations.
  * **AS_VQSLOD:** Allele-specific log-odds ratio of being a true variant versus being a false positive under the trained VQSR Gaussian mixture model.
  * **AS_culprit:** Allele-specific worst-performing annotation in the VQSR Gaussian mixture model.
  * **NEGATIVE_TRAIN_SITE:** Variant was used to build the negative training set of low-quality variants for VQSR.
  * **POSITIVE_TRAIN_SITE:** Variant was used to build the positive training set of high-quality variants for VQSR.
* **region_flag:** Struct containing flags for problematic regions.
  * **lcr:** Variant falls within a low complexity region.
  * **segdup:** Variant falls within a segmental duplication region.
* **allele_info:** Allele information.
  * **variant_type:** Variant type (snv, indel, multi-snv, multi-indel, or mixed).
  * **allele_type:** Allele type (snv, insertion, deletion, or mixed).
  * **n_alt_alleles:** Total number of alternate alleles observed at variant locus.
  * **was_mixed:** Variant type was mixed.
* **cadd:**
  * **raw_score:** Raw CADD scores are interpretable as the extent to which the annotation profile for a given variant suggests that the variant is likely to be 'observed' (negative values) vs 'simulated' (positive values); higher values indicate that a variant is more likely to be simulated (or "not observed") and therefore more likely to have deleterious effects. More information can be found on the [CADD website](https://cadd.gs.washington.edu/info).
  * **phred:** CADD Phred-like scores ('scaled C-scores') ranging from 1 to 99, based on the rank of each variant relative to all possible 8.6 billion substitutions in the human reference genome. Larger values are more deleterious. More information can be found on the [CADD website](https://cadd.gs.washington.edu/info).
  * **has_duplicate:** a True/False flag that indicates whether the variant has more than one CADD score associated with it\*.
* **revel:** dbNSFP's Revel score, ranging from 0 to 1. Variants with higher scores are predicted to be more likely to be deleterious.
  * **revel_score:** Revel’s numerical score from 0 to 1.
  * **has_duplicate:** a True/False flag that indicates whether the variant has more than one revel_score associated with it\*.
* **splice_ai:**
  * **splice_ai:** The maximum delta score, interpreted as the probability of the variant being splice-altering.
  * **splice_consequence:** The consequence term associated with the max delta score in 'splice_ai’.
  * **has_duplicate:** a True/False flag that indicates whether the variant has more than one splice_ai score associated with it\*.
* **primate_ai:**
  * **primate_ai_score:** PrimateAI's deleteriousness score from 0 (less deleterious) to 1 (more deleterious).
  * **has_duplicate:** a True/False flag that indicates whether the variant has more than one primate_ai_score associated with it\*.

\* For a small set of variants, the in silico predictors calculated multiple scores per variant based on additional information. For example, if a variant is found in multiple transcripts or if it has multiple trinucleotide contexts, an in silico predictor may report scores for multiple scenarios. The highest score was taken for each variant in the cases where the in silico predictor calculates multiple scores, and we flag variants with multiple scores.


### Additional annotations found on the variant annotation HT:
These annotations are not present on the dense MT because all LowQual variants and variants in centromeres and telomeres are filtered.

* **AS_lowqual:** Whether the variant falls below a low quality threshold and was excluded from the gnomAD dataset. We recommend filtering all such variants. This is similar to the GATK LowQual filter, but is allele-specific. GATK computes this annotation at the site level, which uses the least stringent prior for mixed sites.
* **telomere_or_centromere:** Whether the variant falls within a telomere or centromere region. These variants were excluded from the gnomAD dataset. We recommend filtering all such variants.
