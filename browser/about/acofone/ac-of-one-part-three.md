<br />

## Rare variants also tend to have the largest effect sizes

Biologically, the process of negative selection tends to decrease the frequency of functional damaging variants, which means that variants with the largest effect sizes are more likely to be rare. In other words, it is often the very rare variants that are of most scientific interest to researchers.

<br />

## Obfuscation of data harms downstream science

In theory, if one obfuscates or randomizes the counts/frequencies of variants, it could help protect against certain risks to participants in a study. However, changing the allele frequency values can drastically impact associations with health outcomes, thus presenting misleading data. Purposely limiting visibility of rare variation disrupts the facilitation of scientific discoveries. Requiring researchers to request an exemption adds an extra barrier and additional time to publishing or other forms of data sharing.

<br />

## Precedents through NIH and global initiatives

It is standard in the genomics field to display exact allele counts on public browsers as seen in gnomAD ([gnomad.broadinstitute.org](https://gnomad.broadinstitute.org)), _All of Us_ ([https://databrowser.researchallofus.org/snvsindels](https://databrowser.researchallofus.org/snvsindels)) and UK Biobank ([genebass.org](https://genebass.org)), as it
presents a very low risk to re-identification. Ultimately, the analysis and reporting of rare variants in research manuscripts presents minimal added risk once those variants and their frequencies are already present in a public browser (see below). And there is precedent for allowing such analysis in numerous scientific programs (many of which are NIH-funded). For example, the NHGRI-funded Clinical Genome Resource (ClinGen), working closely with policy leaders at NIH and the GA4GH, published [guidance](https://pubmed.ncbi.nlm.nih.gov/29437798/) to laboratories stating that submission of classified variants, associated with phenotype, were allowable without consent and even if limited to a single observation given low risk to individuals and large benefit to science and medicine<sup>5</sup>. This approach was endorsed by leaders in the UK in a [publication](https://pubmed.ncbi.nlm.nih.gov/31886409/)<sup>6</sup> documenting agreement with these principles and noting allowance under General Data Protection Regulation (GDPR). Furthermore, the ability to publish results of rare variant associations has also been adopted by the UK Biobank leading to widespread benefit to science and medicine without any demonstrated risk. Hundreds of studies of rare variant associations have been published in the past decade based on data released by the UK Biobank without barriers to analysis and publication.

<br />

## Re-identification risks

A handful of well cited publications have shown that, in theory, information about genomic variants is vulnerable to several types of attacks. For instance, it has been shown that the presence/absence of a set of alleles over the genome could allow for a user to probabilistically claim that an individual’s record is in a database (or what is often referred to as a membership inference attack)<sup>7</sup> or that their relative is in the database.<sup>8</sup> Another risk to participants in the case where a rare variant is published along with its associated phenotype, is that it could allow for direct linkage to a known genomic record<sup>9</sup> thus providing the data user with novel information about a participant. However, these types of attacks all assume worst case adversarial situations, which **is not likely to be the case in a well-governed setting**. It is worth adding that in most of the attack scenarios, the user would learn only that a certain individual is a participant in a large biobank, a fact unlikely to lead to harm. Furthermore, the multi-stage attack described in [9] required having access to linked databases that are not even available anymore.

In addition to new papers<sup>10</sup> arguing that most genomic data can effectively be shared with minimal re-identification risk, we can see in practice that this is indeed the case: countless rare variants have been published in high profile scientific journals and public databases like [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/), and the only known “attacks” have come from the handful of theoretical publications referenced here. For example, over 3.5 million unique variants, classified for pathogenicity towards a specific disease, have been submitted to ClinVar, for which over 75% of these variants have only been identified by a single laboratory. In NIH-funded studies of Mendelian disorders, autism, schizophrenia, cardiovascular disease, and many other human disease phenotypes, there have been millions of rare variants identified from genome sequencing and published as novel disease and trait associations that have set these fields in new directions toward understanding disease etiology and the pursuit of targeted therapeutics. To the best of our knowledge, no participants or patients were harmed whereas trailblazing science and genetic diagnoses have been achieved.

As such, we firmly believe that a policy against sharing low allele counts is protecting against situations that aren’t practical and really only serves to hinder scientific advances.

<br />
