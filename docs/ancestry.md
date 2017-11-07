---
index: gnomad_help
vcfkey: null
topic: 'Ancestry'
---

# Ancestry in gnomAD

We computed principal components (PCs) on the same well-behaved bi-allelic autosomal SNVs as described above on all unrelated samples (both exomes and genomes). We then leveraged a set of 53,044 samples for which we knew the ancestry to train a random forests classifier using the PCs as features. We then assigned ancestry to all samples for which the probability of that ancestry was > 90% according to the random forest model.  All other samples, were assigned the other ancestry (OTH). In addition, the 34 south asian (SAS) samples among the genomes were assigned to other as well due to their low number.

<iframe max-width="100%%" src="https://www.youtube.com/embed/_uRuFZv4JaU" frameborder="0" allowfullscreen></iframe>

## gnomAD population breakdown

| Population                     	| Exomes  	| Genomes 	| Total   	|
|--------------------------------	|---------	|---------	|---------	|
| African/African American (AFR) 	| 7,652   	| 4,368   	| 12,020  	|
| Latino (AMR)                   	| 16,791  	| 419     	| 17,210  	|
| Ashkenazi Jewish (ASJ)         	| 4,925   	| 151     	| 5,076   	|
| East Asian (EAS)               	| 8,624   	| 811     	| 9,435   	|
| Finnish (FIN)                  	| 11,150  	| 1,747   	| 12,897  	|
| Non-Finnish European (NFE)     	| 55,860  	| 7,509   	| 63,369  	|
| South Asian (SAS)              	| 15,391  	| 0       	| 15,391  	|
| Other (OTH)                    	| 2,743   	| 491     	| 3,234   	|
| Total                          	| 123,136 	| 15,496  	| 138,632 	|
