---
index: gnomad_help
title: 'Ancestry'
---
# Ancestry in gnomAD
In gnomAD we provide two levels of ancestry. First, we provide global ancestry for 7 super-populations: African/African American (`afr`), American Admixed/Latino  (`amr`), Ashkenazi Jewish (`asj`), East Asian (`eas`), Finnish (`fin`), Non-Finnish European (`nfe`) and South Asian (`sas`). We then provide sub-continental information for the East Asian (Koreans (`kor`) and Japanes (`jpn`)) and Non-Finnish Euopean(Bulgarian (`bgr`, Estonian (`est`), North-Western European (`nwe`), Southern European (`seu`) and Swedish (`swe`)) populations.

## Global ancestry assignment
Using the [`hwe_normalized_pca` function in Hail](https://hail.is/docs/devel/methods/genetics.html?highlight=hwe#hail.methods.hwe_normalized_pca), we computed the 10 first principal components (PCs) on our 94,176 well-behaved bi-allelic autosomal QC SNVs on all unrelated samples (exomes and genomes combined). We then leveraged a set of 52,768 samples for which we knew the ancestry to train a random forests classifier using the PCs as features. We assigned ancestry to all samples for which the probability of that ancestry was > 90% according to the random forest model. All other samples were assigned the other ancestry (`oth`). In addition, the 34 South Asian (`sas`) samples among the genomes were assigned to other as well due to their low number.

## Sub-continental ancestry assignment
Sub-continental ancestry was computed for European and East Asian samples using PCA. The reason for computing for these two global ancestry groups only was (1) the presence of reliable labels of known sub-population for large enough samples of the data, and (2) the resulting PCA was convincingly splitting the data into separate clusters that matched our known labels. The following steps were taken for the non-Finnish European and East Asian samples separately:
1. High-quality sites (same used for relatedness) were extracted for all samples of that global ancestry.
2. Sites were further filtered to exclude
    - Sites where the allele frequency in that global population was < 0.1%
    - Sites where any platform had > 0.1% missingness (or more than 1 missing sample if there were less than 1,000 samples for a given platform)
3. Remaining sites were LD-pruned in that population down to r<sup>2</sup> = 0.1
4. PCs were computed using [`hwe_normalized_pca` in Hail](https://hail.is/docs/devel/methods/genetics.html?highlight=hwe#hail.methods.hwe_normalized_pca).
5. A random forest (RF) model was created using:
    - European samples: 3 first PCs as features and known sub-continental population labels for 17,102 samples
    - East Asian samples: first 2 PCs as features and known sub-continental population labels for 2,067 samples.
6. All samples with a random forest prediction probability > 90% according to the random forest were assigned a sub-continental populations. Other samples were assigned the other non-Finnish European (`onf`) or other East Asian (`oea`) ancestry depending on their global ancestry.

## gnomAD population breakdown

<table>
  <tr>
    <th>Population</th>
    <th>Description</th>
    <th>Genomes</th>
    <th>Exomes</th>
    <th>Total</th>
  </tr>
  <tr>
    <td>afr</td>
    <td>African/African-American</td>
    <td>4,359</td>
    <td>8,128</td>
    <td>12,487</td>
  </tr>
  <tr>
    <td>amr</td>
    <td>Latino/Admixed American</td>
    <td>424</td>
    <td>17,296</td>
    <td>17,720</td>
  </tr>
  <tr>
    <td>asj</td>
    <td>Ashkenazi Jewish</td>
    <td>145</td>
    <td>5,040</td>
    <td>5,185</td>
  </tr>
  <tr>
    <td>eas</td>
    <td>East Asian</td>
    <td>(780)</td>
    <td>(9,197)</td>
    <td>(9,977)</td>
  </tr>
  <tr>
    <td>&nbsp;&nbsp;&nbsp;&nbsp;kor</td>
    <td>Koreans</td>
    <td>0</td>
    <td>1,909</td>
    <td>1,909</td>
  </tr>
  <tr>
    <td>&nbsp;&nbsp;&nbsp;&nbsp;jpn</td>
    <td>Japanese</td>
    <td>0</td>
    <td>76</td>
    <td>76</td>
  </tr>
  <tr>
    <td>&nbsp;&nbsp;&nbsp;&nbsp;oea</td>
    <td>Other East Asian</td>
    <td>780</td>
    <td>7,212</td>
    <td>7,992</td>
  </tr>
  <tr>
    <td>fin</td>
    <td>Finnish</td>
    <td>1,738</td>
    <td>10,874</td>
    <td>12,526</td>
  </tr>
  <tr>
    <td>nfe</td>
    <td>Non-Finnish European</td>
    <td>(7,718)</td>
    <td>(56,885)</td>
    <td>(64,603)</td>
  </tr>
  <tr>
    <td>&nbsp;&nbsp;&nbsp;&nbsp;bgr</td>
    <td>Bulgarian</td>
    <td>0</td>
    <td>1,335</td>
    <td>1,335</td>
  </tr>
  <tr>
    <td>&nbsp;&nbsp;&nbsp;&nbsp;est</td>
    <td>Estonian</td>
    <td>2,297</td>
    <td>121</td>
    <td>2,418</td>
  </tr>
  <tr>
    <td>&nbsp;&nbsp;&nbsp;&nbsp;nwe</td>
    <td>North-Western European</td>
    <td>4,299</td>
    <td>21,111</td>
    <td>25,410</td>
  </tr>
  <tr>
    <td>&nbsp;&nbsp;&nbsp;&nbsp;seu</td>
    <td>Southern European</td>
    <td>53</td>
    <td>5,752</td>
    <td>5,805</td>
  </tr>
  <tr>
    <td>&nbsp;&nbsp;&nbsp;&nbsp;swe</td>
    <td>Swedish</td>
    <td>0</td>
    <td>13,067</td>
    <td>13,067</td>
  </tr>
  <tr>
    <td>&nbsp;&nbsp;&nbsp;&nbsp;onf</td>
    <td>Other non-Finnish European</td>
    <td>1,069</td>
    <td>15,499</td>
    <td>16,568</td>
  </tr>
  <tr>
    <td>sas</td>
    <td>South Asian</td>
    <td>0</td>
    <td>15,308</td>
    <td>15,308</td>
  </tr>
  <tr>
    <td>oth</td>
    <td>Other (population not assigned)</td>
    <td>544</td>
    <td>3,070</td>
    <td>3,614</td>
  </tr>
  <tr>
    <td>Total</td>
    <td></td>
    <td>15,708</td>
    <td>125,748</td>
    <td>141,456</td>
  </tr>
</table>

What ethnicities are represented in the "other" population?

Individuals were classified as "other" if they did not unambiguously cluster with the major populations in a principal component analysis (PCA).
