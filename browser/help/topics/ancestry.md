---
id: ancestry
title: 'Genetic Ancestry in gnomAD'
---

See our [blog post](https://gnomad.broadinstitute.org/news/2023-11-genetic-ancestry) on genetic ancestry for more details on our process and additional commentary on the benefits and limitations of using genetically-derived ancestry.

In gnomAD we provide the following genetic ancestry groups: African/African American (`afr`), Amish (`ami`), Admixed American (`amr`), Ashkenazi Jewish (`asj`), East Asian (`eas`), Finnish (`fin`), Non-Finnish European (`nfe`) and South Asian (`sas`). Individuals were classified as "remaining individuals" (`rmi`) if they did not unambiguously cluster with these groups in a principal component analysis (PCA).

### Genetic ancestry identification

Using the [`hwe_normalized_pca` function in Hail](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.hwe_normalized_pca) we computed the 20 first principal components (PCs) on well-behaved bi-allelic autosomal QC SNVs on all unrelated samples. For each release, PCA is run on the entire dataset at once, excluding first and second degree relatives. We then train a random forest classifier on samples with provided ancestry labels using the PCs as features. Samples with the following probability of group assignments were assigned to the relevant labels:

- `AFR`: 0.93
- `AMR`: 0.86
- `ASJ`: 0.88
- `EAS`: 0.96
- `FIN`: 0.91
- `MID`: 0.56
- `NFE`: 0.78
- `SAS`: 0.96

Any samples that we were unable to cluster using these probabilities were grouped into "Remaining individuals". Genetic ancestry sub-group clustering has not been performed for gnomAD v4 at this time.

#### gnomAD v4.1 genomes (previously v3.1)

To select the variants for PCA ([`hwe_normalized_pca` function in Hail](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.hwe_normalized_pca)) from the gnomAD v3.1 dataset, which were incorporated into gnomAD v4.1, we lifted-over the high-quality variants used for gnomAD v2, as well as a set of 5k variants widely used for quality control of GWAS data [defined by Shaun Purcell](https://www.nature.com/articles/nature12975). We then took these variants and applied our quality threshold, leading to 76,215 high quality variants for PCA.

We then trained a random forest classifier using 17,906 samples with known ancestry in gnomAD v3 and 14,949 samples for which we had a genetic ancestry group label from gnomAD v2. Many of the additional genomes in v3.1 have ancestry information, increasing the total ancestry labels used for training to 36,882. We used 16 PCs as features and assigned ancestry to all samples for which the probability of that ancestry was > 75% according to the random forest model.

<br/><br/>

<details>

<summary>Expand to see details for past versions</summary>

#### gnomAD v2

For gnomAD v2, we used 94,176 training sites that were shared by exomes and genomes and passed our high quality thresholds for PCA. The random forest model was trained using a set of 52,768 samples for which we knew the genetic ancestry. Because there were only 31 South Asian (`sas`) samples among the genomes, we manually assigned these to other (`oth`) genetic ancestry as well, due to their low number.

### Genetic ancestry sub-group assignment (gnomAD v2 only)

Genetic ancestry sub-groups were computed for European and East Asian samples using PCA. The reason for computing for these two genetic ancestry groups only was (1) the presence of reliable labels of known sub-population for large enough samples of the data, and (2) the resulting PCA was convincingly splitting the data into separate clusters that matched our known labels. The following steps were taken for the non-Finnish European and East Asian samples separately:

1. High-quality sites (same used for relatedness) were extracted for all samples of that genetic ancestry group.
2. Sites were further filtered to exclude
   - Sites where the allele frequency in that group was < 0.1%
   - Sites where any platform had > 0.1% missingness (or more than 1 missing sample if there were less than 1,000 samples for a given platform)
3. Remaining sites were LD-pruned in that population down to r<sup>2</sup> = 0.1
4. PCs were computed using [`hwe_normalized_pca` in Hail](https://hail.is/docs/0.2/methods/genetics.html#hail.methods.hwe_normalized_pca).
5. A random forest (RF) model was created using:
   - European samples: 3 first PCs as features and known genetic ancestry sub-group labels for 17,102 samples
   - East Asian samples: first 2 PCs as features and known sub-continental population labels for 2,067 samples.
6. All samples with a random forest prediction probability > 90% according to the random forest were assigned a genetic ancestry sub-group. Other samples were labeled with the other non-Finnish European (`onf`) or other East Asian (`oea`) ancestry depending on their genetic ancestry group label.

For gnomAD v2, we also provide genetic ancestry sub-groups sub-continental information for the East Asian (Koreans (`kor`) and Japanese (`jpn`)) and Non-Finnish European (Bulgarian (`bgr`), Estonian (`est`), North-Western European (`nwe`), Southern European (`seu`) and Swedish (`swe`)) populations.

</details>
