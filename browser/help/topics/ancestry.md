---
id: ancestry
title: 'Ancestry in gnomAD'
---

In gnomAD we provide two levels of ancestry. First, we provide global ancestry for super-populations: African/African American (`afr`),Amish (`ami`), American Admixed/Latino  (`amr`), Ashkenazi Jewish (`asj`), East Asian (`eas`), Finnish (`fin`), Non-Finnish European (`nfe`) and South Asian (`sas`). Individuals were classified as "other" (`oth`) if they did not unambiguously cluster with the major populations in a principal component analysis (PCA).

For gnomAD v2, we also provide sub-continental information for the East Asian (Koreans (`kor`) and Japanes (`jpn`)) and Non-Finnish Euopean(Bulgarian (`bgr`, Estonian (`est`), North-Western European (`nwe`), Southern European (`seu`) and Swedish (`swe`)) populations.

### Global ancestry assignment
Using the [`hwe_normalized_pca` function in Hail](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.hwe_normalized_pca) we computed the 10 first principal components (PCs) on well-behaved bi-allelic autosomal QC SNVs on all unrelated samples. For each release, PCA is run on the entire dataset (combining exomes and genomes for gnomAD v2) at once, excluding first and second degree relatives. We then train a random forest classifier on samples with previously known population labels using the PCs as features. We assign ancestry to all samples for which the probability of that ancestry is > 90% according to the random forest model. All other samples are assigned the other ancestry (`oth`). Detailed numbers for gnomAD v2 and v3 are given below.

#### gnomAD v3.1

To select the variants for PCA (hwe_normalized_pca function in Hail), we lifted-over the high-quality variants used for gnomAD v2, as well as a set of 5k
variants widely used for quality control of GWAS data defined by Shaun Purcell. We then took these variants and applied our quality threshold, leading to76,419 high quality variants for PCA.

We then trained a random forest classifier using 17,906 samples with known ancestry in gnomAD v3 and 14,949 samples for which we had a population label from gnomAD v2. Many of the additional samples in v3.1 have known ancestry, increasing the total population labels used for training to 36,882. We used 16 PCs as features and assigned ancestry to all samples for which the probability of that ancestry was > 75% according to the random forest model.

Sub-continental population assignment has not been performed for gnomAD v3.1 at this time.

#### gnomAD v2
For gnomAD v2, we used 94,176 training sites that were shared by exomes and genomes and passed our high quality thresholds for PCA.
The random forest model was trained using a set of 52,768 samples for which we knew the ancestry. Because there were only 31 South Asian (sas) samples among the genomes, we manually assigned these to other (oth) ancestry as well due to their low number.

### Sub-continental ancestry assignment (gnomAD v2 only)
Sub-continental ancestry was computed for European and East Asian samples using PCA. The reason for computing for these two global ancestry groups only was (1) the presence of reliable labels of known sub-population for large enough samples of the data, and (2) the resulting PCA was convincingly splitting the data into separate clusters that matched our known labels. The following steps were taken for the non-Finnish European and East Asian samples separately:
1. High-quality sites (same used for relatedness) were extracted for all samples of that global ancestry.
2. Sites were further filtered to exclude
    - Sites where the allele frequency in that global population was < 0.1%
    - Sites where any platform had > 0.1% missingness (or more than 1 missing sample if there were less than 1,000 samples for a given platform)
3. Remaining sites were LD-pruned in that population down to r<sup>2</sup> = 0.1
4. PCs were computed using [`hwe_normalized_pca` in Hail](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.hwe_normalized_pca).
5. A random forest (RF) model was created using:
    - European samples: 3 first PCs as features and known sub-continental population labels for 17,102 samples
    - East Asian samples: first 2 PCs as features and known sub-continental population labels for 2,067 samples.
6. All samples with a random forest prediction probability > 90% according to the random forest were assigned a sub-continental populations. Other samples were assigned the other non-Finnish European (`onf`) or other East Asian (`oea`) ancestry depending on their global ancestry.

### gnomAD population breakdown

See the FAQ ["What populations are represented in the gnomAD data?"](/help/what-populations-are-represented-in-the-gnomad-data).
