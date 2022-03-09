---
question: How do I access the gnomAD Hail Table frequency annotation?
---

All of gnomAD's release Hail Tables have a 'freq' row annotation containing allele frequency information aggregated by certain sample groupings within the dataset. Each element of this 'freq' array annotation contains the alternate allele count (AC), alternate allele frequency (AF), total number of alleles (AN), and the count of homozygous alternate individuals (homozygote_count) per group. 

To access the frequency data contained in the 'freq' array for a specific group of samples, use the 'freq_index_dict' global annotation. The 'freq_index_dict' global annotation is a dictionary keyed by sample grouping combinations (described in the table below), whose values are the combination's index in the 'freq' array. The groupings and their available options by version are listed in the table below.  

<table>
  <tr>
   <td>Category
   </td>
   <td>Definition
   </td>
   <td>2.1 Options
   </td>
   <td>3.1 Options
   </td>
  </tr>
  <tr>
   <td>group
   </td>
   <td>Genotype's filter
   </td>
   <td>raw
   </td>
   <td>adj<sup>1</sup>, raw
   </td>
  </tr>
  <tr>
   <td>sex
   </td>
   <td>Inferred sex/sex karyotype<sup>2</sup>
   </td>
   <td>female, male
   </td>
   <td>XX, XY
   </td>
  </tr>
  <tr>
   <td>subset
   </td>
   <td>Sample subsets within release
   </td>
   <td>gnomad, controls, non_neuro, non_topmed, non_cancer(exomes only)
   </td>
   <td>non_v2, non_topmed, non_neuro, non_cancer, controls_and_biobanks
   </td>
  </tr>
  <tr>
   <td>pop
   </td>
   <td>gnomAD inferred global ancestry
   </td>
   <td>afr, ami, amr, asj, eas, fin, nfe, oth, sas
   </td>
   <td>afr, ami, amr, asj, eas, fin, mid, nfe, oth, sas
   </td>
  </tr>
  <tr>
   <td>subpops
   </td>
   <td>gnomAD inferred sub-continental ancestries
   </td>
   <td><span style="text-decoration:underline;">Exomes</span>
<p>
<em>nfe options</em>: bgr, est, nwe, onf, seu, swe
<p>
<em>eas options</em>: kor, jpn, oea
<p>
<span style="text-decoration:underline;">Genomes</span> 
<p>
<em>nfe options</em>: est, nwe, seu, onf
   </td>
   <td>N/A
   </td>
  </tr>
  <tr>
   <td>pop (1KG subset only)
   </td>
   <td>The 1KG project's population labels
   </td>
   <td>N/A
   </td>
   <td>acb, asw, beb, cdx, ceu, chb, chs, clm, esn, fin, gbr, gih, gwd, ibs, itu, jpt, khv, lwk, msl, mxl, pel, pjl, pur, stu, tsi, yri
   </td>
  </tr>
  <tr>
   <td>pop (HGDP subset only)
   </td>
   <td>The HGDP's population labels
   </td>
   <td>N/A
   </td>
   <td>adygei, balochi, bantukenya, bantusafrica, basque, bedouin, biakapygmy, brahui, burusho, cambodian, colombian, dai, daur, druze, french, han, hazara, hezhen, italian, japanese, kalash, karitiana, lahu, makrani, mandenka, maya, mbutipygmy, melanesian, miaozu, mongola, mozabite, naxi, orcadian, oroqen, palestinian, papuan, pathan, pima, russian, san, sardinian, she, sindhi, surui, tu, tujia, tuscan, uygur, xibo, yakut, yizu, yoruba
   </td>
  </tr>
  <tr>
   <td>downsampling 
   </td>
   <td>Downsampled sample counts
   </td>
   <td>N/A
   </td>
   <td>10, 20, 50, 100, 158, 200, 456, 500, 1000, 1047, 1736, 2000, 2419, 2604, 5000, 5316, 7647, 10000, 15000, 20000, 25000, 30000, 34029 40000, 50000, 60000, 70000, 75000
   </td>
  </tr>
</table>


### **Version 2.1 sample grouping combinations and 'freq' array access**

The available v2.1 grouping combinations within the 'freq' array annotation are listed below. To access the full callset's data, use “gnomad” as the subset. Raw frequency information is only available for subsets; adj<sup>1</sup> frequency information is provided for all other combinations and does not need to be specified.

* subset, e.g. “gnomad”
* subset_group, e.g. “controls_raw”
* subset_pop, e.g. “gnomad_afr”
* subset_pop_subpop, e.g. “non_topmed_eas_jpn”
* subset_pop_sex, e.g. “non_neuro_nfe_female”

To access the 'freq' array using the 'freq_index_dict', you need to retrieve the value of your desired label combination key. The example below accesses the entry of the high quality genotypes of XX individuals (sex: female<sup>2</sup>) labeled as AFR (pop: AFR) in the entire callset (subset: gnomad) for gnomAD v2.1.1 genomes:
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
This same approach can be applied to the filtering allele frequency (FAF) array, 'faf', by using the 'faf_index_dict'. 


### **Version 3.1 sample grouping combinations and 'freq' array access**

The available v3 grouping combinations within the 'freq' array annotation are listed below. Unlike v2.1, adj<sup>1</sup> must be provided as the “group” for all combinations except when requesting raw frequency information, which is only available for the main callset and subsets.

* group, e.g. “adj”, “raw” 
* sex-group, e.g. “XX-adj”
* subset-group, e.g. “non_v2-raw”
* pop-group,  e.g. “afr-adj” 
* pop-sex-group, e.g. “ami-XX-adj”
* downsampling<sup>3</sup>-group-pop, e.g. “200-adj-eas”, 
* subset-pop<sup>4</sup>-group, e.g. “non_topmed-sas-adj” 
* subset-sex-group, e.g. “non_cancer-XY-adj”
* subset-pop<sup>4</sup>-sex-group, e.g. “'controls_and_biobanks-mid-XX-adj”, 

To access the 'freq' array using the 'freq_index_dict', you need to retrieve the value of your desired label combination key. The example below accesses the entry of the high quality genotypes (group: adj) of XX individuals (sex: XX) labeled as AFR (pop: AFR) in gnomAD v3.1.2:

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

This same approach can be applied to the filtering allele frequency (FAF) array, 'faf', by using the 'faf_index_dict'.  
  
  
<sup>1</sup> Includes only genotypes with depth >= 10, genotype quality >= 20 and minor allele balance > 0.2 for heterozygous genotypes.  
<sup>2</sup> The labels we use to classify individuals by chromosomal sex changed from “male” and “female” to “XY” and “XX.” More details available in this [blog post](https://gnomad.broadinstitute.org/news/2020-10-gnomad-v3-1-new-content-methods-annotations-and-data-availability/#tweaks-and-updates).  
<sup>3</sup> Some downsamplings exceed population counts and thus are not available for those populations.  
<sup>4</sup> For HGDP and 1KG subsets, project specified populations are available in place of gnomAD inferred global populations.  The HGDP populations are detailed [here](https://science.sciencemag.org/content/367/6484/eaay5012). The 1KG populations are described [here](https://www.internationalgenome.org/category/population).  
