import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem, PageHeading } from '@gnomad/ui'

import ageDistribution from './dataset-constants/gnomad_r2_1_1/ageDistribution.json'
import { withAnchor } from './AnchorLink'
import DocumentTitle from './DocumentTitle'
import Histogram from './Histogram'
import InfoPage from './InfoPage'
import Link from './Link'
import SampleCountTable from './SampleCountTable'

const FAQSectionHeading = withAnchor(styled.h2``)

const Question = withAnchor(
  styled.dt`
    font-weight: bold;
  `
)

const Answer = styled.dd`
  margin: 0;
`

const ColumnsWrapper = styled.div`
  display: flex;
  flex-direction: row;

  @media (max-width: 700px) {
    flex-direction: column;
  }
`

const Column = styled.div`
  width: calc(50% - 15px);

  @media (max-width: 700px) {
    width: 100%;
  }
`

export default () => (
  <InfoPage>
    <DocumentTitle title="FAQ" />
    <PageHeading>Frequently Asked Questions</PageHeading>

    <FAQSectionHeading id="general">General</FAQSectionHeading>
    <dl>
      <Question id="whats-the-difference-between-gnomad-v2-and-v3">
        What&apos;s the difference between gnomAD v2 and v3?
      </Question>
      <Answer>
        <p>
          The gnomAD v2 data set contains data from 125,748 exomes and 15,708 whole genomes, all
          mapped to the GRCh37/hg19 reference sequence. The gnomAD v3 data set contains 71,702 whole
          genomes (and no exomes), all mapped to the GRCh38 reference sequence. Most of the genomes
          from v2 are included in v3.
        </p>
      </Answer>

      <Question id="what-are-the-restrictions-on-data-usage">
        What are the restrictions on data usage?
      </Question>
      <Answer>
        <p>
          These usage guidelines are based on goodwill. They are not a legal contract, but we
          request that you follow these guidelines if you use our data.
        </p>
        <p>
          There are no restrictions or embargoes on the publication of results derived from the
          gnomAD database. However, we encourage people to{' '}
          <ExternalLink href="mailto:exomeconsortium@gmail.com">
            check with the consortium
          </ExternalLink>{' '}
          before embarking on large-scale analyses, to see if we already have something currently
          underway that overlaps with your plans.
        </p>
        <p>
          The data released by gnomAD are available free of restrictions under the{' '}
          <ExternalLink href="https://creativecommons.org/publicdomain/zero/1.0/">
            Creative Commons Zero Public Domain Dedication
          </ExternalLink>
          . This means that you can use it for any purpose without legally having to give
          attribution. However, we request that you actively acknowledge and give attribution to the
          gnomAD project, and link back to the relevant page, wherever possible. Attribution
          supports future efforts to release other data. It also reduces the amount of
          &quot;orphaned data&quot;, helping retain links to authoritative sources.
        </p>
      </Answer>

      <Question id="how-should-i-cite-discoveries-made-using-gnomad-data">
        How should I cite discoveries made using gnomAD data?
      </Question>
      <Answer>
        <p>
          Please cite the{' '}
          <ExternalLink href="https://broad.io/gnomad_lof">gnomAD flagship paper</ExternalLink> in
          papers that make use of gnomAD data, and provide a link to the browser if you build online
          resources that include the data set.
        </p>

        <p>
          There is no need to include us as authors on your manuscript, unless we contributed
          specific advice or analysis for your work.
        </p>
      </Answer>

      <Question id="i-have-identified-a-rare-variant-what-phenotype-data-are-available">
        I have identified a rare variant in gnomAD that I believe is associated with a specific
        clinical phenotype. What phenotype data are available for these individuals?
      </Question>
      <Answer>
        <p>
          Most of the individuals who have contributed data to gnomAD were not fully consented for
          phenotype data sharing, and unfortunately at this time we are typically unable to provide
          any information about the clinical status of variant carriers. We have made every effort
          to exclude individuals with severe pediatric diseases from the gnomAD data set, and
          certainly do not expect our data set to be <em>enriched</em> for such individuals, but we
          typically cannot rule out the possibility that some of our participants do actually suffer
          from your disease of interest.
        </p>
      </Answer>

      <Question id="can-i-get-access-to-individual-level-genotype-data-from-gnomad">
        Can I get access to individual-level genotype data from gnomAD?
      </Question>
      <Answer>
        <p>
          Many of the samples in gnomAD have individual-level sequencing data deposited in{' '}
          <ExternalLink href="https://www.ncbi.nlm.nih.gov/gap">dbGaP</ExternalLink>, and these can
          be accessed by{' '}
          <ExternalLink href="https://dbgap.ncbi.nlm.nih.gov/aa/wga.cgi?page=login">
            applying through that repository
          </ExternalLink>
          . However, many other samples come from unpublished cohorts or from samples not in dbGaP.
          There is not currently any mechanism to systematically obtain individual-level genotype
          data from the database as a whole.
        </p>
      </Answer>

      <Question id="why-is-a-particular-variant-found-in-some-versions-of-exac-gnomad-but-not-others">
        Why is a particular variant found in some versions of ExAC/gnomAD but not others?
      </Question>
      <Answer>
        <p>
          Likely because of differences between the projects in sample inclusion and variant quality
          control.
        </p>

        <p>
          Sample QC: Not all data from previous call sets is included in each gnomAD release. Most
          of the samples from prior releases are included during the initial joint calling; however,
          we make changes to our sample QC process in each release, which always results in the
          removal of some samples that previously passed. For instance, approximately 10% of the
          samples in ExAC are missing from gnomAD v2, so we expect some variants in ExAC,
          particularly those that were found at low frequencies, to be absent in gnomAD v2.
        </p>

        <p>
          Variant QC: Some variants present in previous releases may now be filtered because we used
          new filtering strategies. In particular, starting with gnomAD, we filter each allele
          separately whereas variant QC was done at the site-level (chromosome, position) in ExAC.
          We also continuously work on improving our filtering strategy: for instance, we used a
          combination of a random forest classifier and hard filters (only high-confidence
          genotypes, inbreeding coefficient &ge; 0.3) for gnomAD v2 rather than the standard GATK
          site-level Variant Quality Score Recalibration (VQSR) used for ExAC.
        </p>
      </Answer>

      <Question id="where-can-i-find-more-details-on-the-qc-pipeline">
        Where can I find more details on the QC pipeline?
      </Question>
      <Answer>
        <p>
          More details on our QC process can be found in our blog posts:{' '}
          <ExternalLink href="https://macarthurlab.org/2017/02/27/the-genome-aggregation-database-gnomad/">
            &quot;The genome Aggregation Database (gnomAD)&quot;
          </ExternalLink>
          ,{' '}
          <ExternalLink href="https://macarthurlab.org/2018/10/17/gnomad-v2-1/">
            &quot;gnomAD v2.1&quot;
          </ExternalLink>
          , and{' '}
          <ExternalLink href="https://macarthurlab.org/2019/10/16/gnomad-v3-0/">
            &quot;gnomAD v3.0&quot;
          </ExternalLink>
          .
        </p>
      </Answer>

      <Question id="should-i-switch-to-the-latest-version-of-gnomad">
        Should I switch to the latest version of gnomAD?
      </Question>
      <Answer>
        <p>
          The gnomAD v2 call set contains fewer whole genomes than v3, but also contains a very
          large number of exomes that substantially increase its power as a reference in coding
          regions. Therefore gnomAD v2 is still our recommended dataset for most coding regions
          analyses. However, gnomAD v3 represents a very large increase in the number of genomes,
          and will therefore be a much better resource if your primary interest is in non-coding
          regions or if your coding region of interest is poorly captured in the gnomAD exomes (this
          can be assessed from the coverage plots in the browser). Most of the genomes from v2.1.1
          are included in v3 and therefore these should not be considered as independent sample
          sets.
        </p>

        <p>
          Another consideration when choosing which dataset to use is the ancestry of the samples
          you are interested in. gnomAD v3 contains a substantially larger number of African
          American samples than v2 (exomes and genomes combined) and provides allele frequencies in
          the Amish population for the first time.
        </p>

        <p>
          Finally, gnomAD v3 was mapped to GRCh38, so if your data is also on this build it then it
          probably makes sense to switch to v3. There is also a{' '}
          <Link to={{ pathname: '/downloads', hash: 'v2-liftover-variants' }}>
            liftover version of gnomAD v2
          </Link>{' '}
          onto GRCh38 available. We plan to produce a larger GRCh38 aligned exome callset in 2021.
        </p>
      </Answer>

      <Question id="how-do-evaluate-variants-in-a-gene-that-has-a-pseudogene">
        How do I evaluate variants in a gene that has a pseudogene? Were any steps taken to
        distinguish the gene from the pseudogene?
      </Question>
      <Answer>
        <p>
          Short read sequencing can produce mapping issues when a gene has a highly homologous
          pseudogene. Many variants in such genes (e.g. <Link to="/gene/PRSS1">PRSS1</Link>) will be
          filtered due to low mapping quality or deviation from Hardy-Weinberg equilibrium; the
          remaining variants should be interpreted with caution. The gnomAD pipeline does not apply
          any special filters to regions with a highly similar pseudogene.
        </p>
      </Answer>

      <Question id="how-do-you-pronounce-gnomad">How do you pronounce gnomAD?</Question>
      <Answer>
        <p>ˈnōˌmad</p>

        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls>
          <source src="https://ssl.gstatic.com/dictionary/static/sounds/20160317/nomad--_us_1.mp3" />
          Your browser does not support the audio element.
        </audio>
      </Answer>
    </dl>

    <FAQSectionHeading id="constraint">Constraint</FAQSectionHeading>
    <dl>
      <Question id="how-was-the-expected-number-of-variants-determined">
        How was the expected number of variants determined?
      </Question>
      <Answer>
        <p>
          We used a depth corrected probability of mutation for each gene to predict the expected
          variant counts. More details can be found in the{' '}
          <ExternalLink href="https://broad.io/gnomad_lof">gnomAD flagship paper</ExternalLink>.
          Note that the expected variant counts for bases with a median depth &lt;1 were removed
          from the totals.
        </p>
      </Answer>

      <Question id="which-variants-are-included-in-the-observed-counts">
        Which variants are included in the observed counts?
      </Question>
      <Answer>
        <p>
          We included single nucleotide changes that occurred in the canonical transcript that were
          found at a frequency of &lt;0.1%, passed all filters, and at sites with a median depth
          &ge;1. The counts represent the number of unique variants and not the allele count of
          these variants.
        </p>
      </Answer>

      <Question id="why-are-there-fewer-variants-in-the-constraint-table-than-on-the-gene-page">
        Why are there fewer variants in the constraint table than displayed on the gene page?
      </Question>
      <Answer>
        <p>
          We only included variants that were found in the canonical transcript of the gene. On the
          gene page, variants found in all transcripts are displayed. Additionally, both observed
          and expected variant counts were removed for sites with a median depth &lt;1.
        </p>
      </Answer>

      <Question id="what-is-included-in-lof">What is included in pLoF?</Question>
      <Answer>
        <p>
          Nonsense, splice acceptor, and splice donor variants caused by single nucleotide changes.
        </p>
      </Answer>

      <Question id="why-are-constraint-metrics-missing-for-this-gene-or-annotated-with-a-note">
        Why are constraint metrics missing for this gene or annotated with a note?
      </Question>
      <Answer>
        <p>
          Genes that were outliers in certain assessments will not have constraint metrics or will
          be flagged with a note warning of various error modes. Please note that these assessments
          were applied to the canonical transcripts of the genes. If a gene was not annotated as a
          protein-coding gene in Gencode v19, we did not calculate constraint. The following list
          describes the reason names given in the constraint_flag column of the{' '}
          <Link to={{ pathname: '/downloads', hash: '#v2-constraint' }}>constraint files</Link>:
        </p>
        <List>
          <ListItem>no_variants: Zero observed synonymous, missense, pLoF variants</ListItem>
          <ListItem>no_exp_lof: Zero expected pLoF variants</ListItem>
          <ListItem>lof_too_many: More pLoF variants than expected</ListItem>
          <ListItem>no_exp_mis: Zero expected missense variants</ListItem>
          <ListItem>mis_too_many: More missense variants than expected</ListItem>
          <ListItem>no_exp_syn: Zero expected synonymous variants</ListItem>
          <ListItem>syn_outlier: More or fewer synonymous variants than expected</ListItem>
        </List>
        <p>
          Possible reasons that one might observe the deviations listed above include mismapped
          reads due to homologous regions or poor quality sequencing data.
        </p>
      </Answer>

      <Question id="what-is-a-loeuf-score">What is a LOEUF score?</Question>
      <Answer>
        <p>
          LOEUF stands for the &quot;loss-of-function observed/expected upper bound fraction.&quot;
          It is a conservative estimate of the observed/expected ratio, based on the upper bound of
          a Poisson-derived confidence interval around the ratio. Low LOEUF scores indicate strong
          selection against predicted loss-of-function (pLoF) variation in a given gene, while high
          LOEUF scores suggest a relatively higher tolerance to inactivation. Its advantage over pLI
          is that it can be used as a continuous value rather than a dichotomous scale (e.g. pLI
          &gt; 0.9) - if such a single cutoff is still desired, pLI is a perfectly fine metric to
          use. At large sample sizes, the observed/expected ratio will be a more appropriate measure
          for selection, but at the moment, LOEUF provides a good compromise of point estimate and
          significance measure.
        </p>
      </Answer>

      <Question id="how-do-you-pronounce-loeuf">How do you pronounce LOEUF?</Question>
      <Answer>
        <p>
          LOEUF is pronounced like its French-inspired name &quot;l&apos;œuf&quot;. Another accepted
          pronunciation is &quot;luff&quot;.
        </p>
      </Answer>
    </dl>

    <FAQSectionHeading id="technical-details">Technical details</FAQSectionHeading>
    <dl>
      <Question id="what-genome-build-is-the-gnomad-data-based-on">
        What genome build is the gnomAD data based on?
      </Question>
      <Answer>
        <p>
          gnomAD v2 is based on{' '}
          <ExternalLink href="ftp://ftp.broadinstitute.org/pub/seq/references/Homo_sapiens_assembly19.fasta">
            GRCh37/hg19
          </ExternalLink>
          . gnomAD v3 is based on GRCh38.
        </p>
      </Answer>

      <Question id="what-version-of-gencode-was-used-to-annotate-variants">
        What version of Gencode was used to annotate variants?
      </Question>
      <Answer>
        <p>
          For gnomAD v3, version 29 (annotated with VEP version 95). For v2, version 19 (annotated
          with VEP version 85).
        </p>
      </Answer>

      <Question id="are-all-the-individuals-in-1000-genomes-included">
        Are all the individuals in 1000 Genomes included?
      </Question>
      <Answer>
        <p>
          The majority of samples from the 1000 Genomes Project for which <em>exome sequencing</em>{' '}
          is available were included (until recently, the only available whole genome data was
          low-coverage sequencing, and as such, was not included).
        </p>
      </Answer>

      <Question id="are-all-the-individuals-in-the-exome-variant-server-included">
        Are all the individuals in the{' '}
        <ExternalLink href="https://evs.gs.washington.edu/EVS/">Exome Variant Server</ExternalLink>{' '}
        included?
      </Question>
      <Answer>
        <p>
          No. We were not given permission from NHLBI to include individuals from several of the
          cohorts included in the NHLBI&apos;s Exome Sequencing Project. As a result, genuine rare
          variants that are present in the EVS may not be observed in gnomAD.
        </p>
      </Answer>

      <Question id="do-the-cancer-samples-in-the-database-include-tumor-exomes">
        Do the cancer samples in the database include tumor exomes, or is this from germline samples
        only?
      </Question>
      <Answer>
        <p>
          All of the &quot;cancer&quot; samples in the current release of ExAC are blood
          (&quot;germline&quot;) samples from TCGA. We excluded any sample labeled as tumor.
          However, note that some sample/label swaps may have occurred in TCGA; in addition, it is
          possible that in some patients the blood samples are contaminated by circulating tumor
          cells.
        </p>
      </Answer>

      <Question id="what-populations-are-represented-in-the-gnomad-data">
        What populations are represented in the gnomAD data?
      </Question>
      <Answer>
        <SampleCountTable />
      </Answer>

      <Question id="what-ethnicities-are-represented-in-the-other-population">
        What ethnicities are represented in the &quot;other&quot; population?
      </Question>
      <Answer>
        <p>
          Individuals were classified as &quot;other&quot; if they did not unambiguously cluster
          with the major populations (i.e. afr, ami, amr, asj, eas, fin, nfe, sas) in a principal
          component analysis (PCA).
        </p>
      </Answer>

      <Question id="what-is-the-age-distribution-in-gnomad">
        What is the age distribution in gnomAD?
      </Question>
      <Answer>
        <p>Age data is not available for gnomAD v3.</p>

        <p>For gnomAD v2, the age distribution is:</p>

        <ColumnsWrapper>
          <Column>
            <p>Exomes</p>
            <Histogram
              binEdges={ageDistribution.exome.bin_edges}
              binValues={ageDistribution.exome.bin_freq}
              nSmaller={ageDistribution.exome.n_smaller}
              nLarger={ageDistribution.exome.n_larger}
              barColor="#428bca"
              xLabel="Age"
              yLabel="Individuals"
              formatTooltip={bin => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
            />
          </Column>
          <Column>
            <p>Genomes</p>
            <Histogram
              binEdges={ageDistribution.genome.bin_edges}
              binValues={ageDistribution.genome.bin_freq}
              nSmaller={ageDistribution.genome.n_smaller}
              nLarger={ageDistribution.genome.n_larger}
              barColor="#73ab3d"
              xLabel="Age"
              yLabel="Individuals"
              formatTooltip={bin => `${bin.label}: ${bin.value.toLocaleString()} individuals`}
            />
          </Column>
        </ColumnsWrapper>

        <p>
          Please note that cohorts vary in how they report age (some report the age at diagnosis,
          others report the age of last visit, etc), so the ages associated with the gnomAD data can
          be thought of as the last known age of the individual. Information on age was not
          available for all samples. We have age data for 85,462 exome samples and 11,242 genome
          samples.
        </p>
      </Answer>

      <Question id="how-is-sex-determined-for-gnomad-samples">
        How is sex determined for gnomAD samples?
      </Question>
      <Answer>
        <p>
          We used a combination of X-chromosome homozygosity (F-stat,{' '}
          <ExternalLink href="https://hail.is/docs/0.2/methods/genetics.html?highlight=impute_sex#hail.methods.impute_sex">
            impute_sex function in Hail
          </ExternalLink>
          ) and X and Y chromosomes normalized coverage to assign sex for each gnomAD sample. Note
          that we used different combination of metrics (mostly due to their availability) for the
          different gnomAD datasets (see below for details). The F-stat was computed for each sample
          using high-confidence QC SNVs (bi-allelic SNVs, LD-pruned to r<sup>2</sup> &lt; 0.1, with
          allele frequency &gt; 0.1% and call rate &gt; 99%) on non-pseudoautosomal regions
          (non-PAR) of the X chromosome. The normalized coverage was computed as the mean coverage
          on sex chromosomes / mean coverage on chromosome 20. The exact metrics and threshold used
          for sex assignment were as follows:
        </p>

        <List>
          <ListItem>
            Genomes (gnomAD v3):
            <List style={{ marginTop: '0.5em' }}>
              <ListItem>
                Males: chromosome X (non-PAR) F-stat &gt; 0.2 &amp; 0.5 &lt; normalized X coverage
                &gt; 1.4 &amp; 1.2 &lt; normalized Y coverage &gt; 0.15
              </ListItem>
              <ListItem>
                Females: chromosome X (non-PAR) F-stat &lt; -0.2 &amp; 1.4 &lt; normalized X
                coverage &gt; 2.25 &amp; normalized X coverage &lt; 0.1
              </ListItem>
            </List>
          </ListItem>
          <ListItem>
            Exomes (gnomAD v2):
            <List style={{ marginTop: '0.5em' }}>
              <ListItem>
                Males: chromosome X (non-PAR) F-stat &gt; 0.6 &amp; normalized Y chromosome coverage
                &ge; 0.1
              </ListItem>
              <ListItem>
                Females: chromosome X (non-PAR) F-stat &lt; 0.5 &amp; normalized Y chromosome
                coverage &lt; 0.1
              </ListItem>
            </List>
          </ListItem>
          <ListItem>
            Genomes (gnomAD v2):
            <List style={{ marginTop: '0.5em' }}>
              <ListItem>Males: chromosome X (non-PAR) F-stat &gt; 0.8</ListItem>
              <ListItem>Females: chromosome X (non-PAR) F-stat &lt; 0.5</ListItem>
            </List>
          </ListItem>
        </List>
      </Answer>

      <Question id="how-is-ancestry-determined-for-gnomad-samples">
        How is ancestry determined for gnomAD samples?
      </Question>
      <Answer>
        <p>
          We use principal components analysis (PCA,{' '}
          <ExternalLink href="https://hail.is/docs/0.2/methods/genetics.html#hail.methods.hwe_normalized_pca">
            hwe_normalized_pca function in Hail
          </ExternalLink>
          ) on a set of high quality variants (LD-pruned (r2 &lt; 0.1), autosomal, bi-allelic SNVs
          with allele frequency &gt; 0.1% and call rate &gt; 99%) to determine the ancestry of the
          samples. For each release, PCA is run on the entire dataset (combining exomes and genomes
          for gnomAD v2) at once, excluding first and second degree relatives. We then train a
          random forest classifier on samples with previously known population labels using the PCs
          as features. We assign ancestry to all samples for which the probability of that ancestry
          is &gt; 90% according to the random forest model. All other samples are assigned the other
          ancestry (oth). Detailed numbers for gnomAD v2 and v3 are given below.
        </p>

        <h4>gnomAD v2</h4>

        <p>
          For gnomAD v2, we used 94,176 training sites that were shared by exomes and genomes and
          passed our high quality thresholds for PCA.
        </p>

        <p>
          The random forest model was trained using a set of 52,768 samples for which we knew the
          ancestry. Because there were only 31 South Asian (sas) samples among the genomes, we
          manually assigned these to other (oth) ancestry as well due to their low number.
        </p>

        <p>
          Sub-continental ancestry was computed for European and East Asian samples using the same
          strategy. The reason for computing sub-continental labels for these two global ancestry
          groups only was (1) the presence of reliable labels of known sub-population for large
          enough samples of the data, and (2) the resulting PCA was convincingly splitting the data
          into separate clusters that matched our known labels.
        </p>

        <h4>gnomAD v3</h4>

        <p>
          To select the variants for PCA, we lifted-over the high-quality variants used for gnomAD
          v2, as well as a set of 5k variants widely used for quality control of GWAS data defined
          by Shaun Purcell. We then took these variants and applied our quality threshold, leading
          to 94,148 high quality variants for PCA.
        </p>

        <p>
          The random forest model was trained based on 17,906 samples with known ancestry and 14,949
          samples for which we had a population label from gnomAD v2.
        </p>

        <p>
          Sub-continental population assignment has not been performed for gnomAD v3 at this time.
        </p>

        <p>
          We used principal components analysis (PCA,{' '}
          <ExternalLink href="https://hail.is/docs/0.2/methods/genetics.html#hail.methods.hwe_normalized_pca">
            hwe_normalized_pca function in Hail
          </ExternalLink>
          ) to determine the ancestry of the samples. First, a set 94k LD-pruned (r2 &lt; 0.1),
          autosomal, bi-allelic SNVs with allele frequency &gt; 0.1% and call rate &gt; 99% in both
          exomes and genomes was extracted. Then PCA was run on both exomes and genomes excluding
          first and second degree relatives. We then trained a random forest classifier using 52k
          samples with previously known population labels. We then leveraged a set of 52,768 samples
          for which we knew the ancestry to train a random forests classifier using the PCs as
          features. We assigned ancestry to all samples for which the probability of that ancestry
          was &gt; 90% according to the random forest model. All other samples were assigned the
          other ancestry (oth). In addition, the 31 South Asian (sas) samples among the genomes were
          assigned to other as well due to their low number. Sub-continental ancestry was computed
          for European and East Asian samples using the same strategy. The reason for computing for
          these two global ancestry groups only was (1) the presence of reliable labels of known
          sub-population for large enough samples of the data, and (2) the resulting PCA was
          convincingly splitting the data into separate clusters that matched our known labels.
        </p>
      </Answer>

      <Question id="how-many-males-females-have-this-variant-can-it-be-assumed-that-hemizygous-variants-come-only-from-males">
        How many males/females have this variant? Can it be assumed that hemizygous variants come
        only from males?
      </Question>
      <Answer>
        <p>
          Sex for genomes was determined by X heterozygosity. Sex for exomes was based on both X
          heterozygosity and Y coverage. Information on allele frequency for males and females for
          each variant is provided in the population frequencies table on the browser and in the
          INFO fields of our VCF files (example: AC_male, AC_female, AF_female, AC_fin_male). If a
          variant is on the X chromosome, it can be assumed that hemizygous variants come from males
          and homozygous variants in non-PAR regions come from females.
        </p>
      </Answer>

      <Question id="are-there-related-individuals-in-gnomad">
        Are there related individuals in gnomAD?
      </Question>
      <Answer>
        <p>
          Pairwise relatedness between samples was determined using{' '}
          <ExternalLink href="https://hail.is/docs/0.2/methods/genetics.html?highlight=pc_relate#hail.methods.pc_relate">
            Hail&apos;s pc_relate
          </ExternalLink>
          . We removed duplicate samples, first degree relatives, and second degree relatives to
          minimize inflation of rare variant frequencies. We always prioritize samples with higher
          quality metrics. In gnomAD v2, this was done on exomes and genomes combined, prioritizing
          genomes over exomes when selecting which individuals to include.
        </p>
      </Answer>

      <Question id="why-doesnt-the-amino-acid-position-and-consequence-on-the-gene-page-match-what-i-expect-for-my-transcript">
        Why doesn&apos;t the amino acid position and consequence on the gene page match what I
        expect for my transcript and how does gnomAD choose which transcript to use for annotating
        variants?
      </Question>
      <Answer>
        <p>
          The gene page summarizes the most severe functional consequence and protein-level change
          regardless of the transcript. gnomAD v3 uses the MANE Select transcript as the primary
          transcript for annotating HGVS nomenclature/consequence, if the severity of the functional
          consequences are equivalent across transcripts. MANE stands for Matched Annotation from
          NCBI and EMBL-EBI and MANE Select identifies one high-quality representative transcript
          per protein-coding gene that is well-supported by experimental data and represents the
          biology of the gene. More background on the MANE project can be found{' '}
          <ExternalLink href="https://www.ncbi.nlm.nih.gov/refseq/MANE/">here</ExternalLink>. If no
          MANE Select transcript exists, the Ensembl canonical transcript is selected. A
          &quot;†&quot; denotes a consequence that is for a non-MANE Select transcript (or
          non-canonical transcript if no MANE Select exists). On the gene page you can select which
          transcript you would like to view. The MANE Select transcript (or canonical if no MANE
          Select exists) is marked by &quot;*&quot;. Please note that v2 still uses the canonical
          transcript because MANE Select transcripts are derived from GRCh38. Also, our transcripts
          are annotated using Gencode v29 for gnomAD v3 and Gencode v19 for v2. Please note, the
          browser represents transcript versions from Gencode v29, which may differ from more recent
          versions selected by the MANE Select project. Please check the version number listed by
          the &quot;MANE Select transcript&quot; attribute at the top of the gene summary page and
          check if it is the same or different from the version listed in the browser&apos;s
          &quot;Show Transcript&quot; list to be warned of possible discrepancies. These issues will
          be fixed in gnomAD v4 which will be a larger exome dataset on GRCh38 and MANE Select,
          sourced by Ensembl directly, will be used throughout the database where available.
        </p>
      </Answer>

      <Question id="why-is-a-transcript-shown-in-the-browser-not-the-correct-length-and-or-appears-to-be-annotated-incorrectly">
        Why is a transcript shown in the browser not the correct length and/or appears to be
        annotated incorrectly?
      </Question>
      <Answer>
        <p>
          Our transcript annotations are based on Gencode v29 for gnomAD v3 and Gencode v19 for v2.
          Annotations may have changed depending on the version of Gencode used (such as changing
          from a non-coding to a protein-coding gene, or having a different transcript length).
        </p>
      </Answer>

      <Question id="what-do-the-flags-on-the-browser-mean">
        What do the flags on the browser mean?
      </Question>
      <Answer>
        <p>Flags that will appear on variant pages:</p>

        <List>
          <ListItem>
            AC0: The allele count is zero after filtering out low-confidence genotypes (GQ &lt; 20;
            DP &lt; 10; and AB &lt; 0.2 for het calls)
          </ListItem>
          <ListItem>
            AS-VQSR (gnomAD v3 only): Failed GATK Allele-Specific Variant Quality Recalibration
            (AS-VQSR)
          </ListItem>
          <ListItem>InbreedingCoeff: The Inbreeding Coefficient is &lt; -0.3</ListItem>
          <ListItem>
            RF (gnomAD v2 only): Failed random forest filtering thresholds of 0.055 for exome SNVs,
            0.206 for exome indels, 0.263 for genome SNVs, and 0.222 for genome indels
          </ListItem>
        </List>

        <p>Flags that will appear in the variant table on gene/region pages:</p>

        <List>
          <ListItem>
            MNV: Multinucleotide variant: the variant is found in phase with another variant,
            altering its functional interpretation
          </ListItem>
          <ListItem>
            LCR: Found in a low complexity region: these regions were identified with the{' '}
            <ExternalLink href="https://www.ncbi.nlm.nih.gov/pubmed/16796549">
              symmetric DUST algorithm
            </ExternalLink>{' '}
            at a score threshold of 30 and provided by Heng Li
          </ListItem>
          <ListItem>
            LC pLoF: Low-confidence pLoF, variant determined by{' '}
            <ExternalLink href="https://github.com/konradjk/loftee">LOFTEE</ExternalLink> to be
            likely not LoF for the transcript
          </ListItem>

          <ListItem>
            pLoF Flag: Flagged by{' '}
            <ExternalLink href="https://github.com/konradjk/loftee">LOFTEE</ExternalLink>, a warning
            provided by LOFTEE to use caution when interpreting the transcript or variant
          </ListItem>
          <ListItem>
            NC Transcript: Marked in a putative LoF category by VEP (essential splice, stop-gained,
            or frameshift) but appears on a non-protein-coding transcript
          </ListItem>
        </List>
      </Answer>

      <Question id="why-is-this-variant-linked-to-the-wrong-dbsnp-rsid">
        Why is this variant linked to the wrong dbSNP rsID?
      </Question>
      <Answer>
        <p>
          First, we do not continuously update the dbSNP rsIDs displayed in the browser, so there
          will be some differences the databases and dbSNP depending on versions been used. The
          dbSNP version used are:
        </p>

        <List>
          <ListItem>ExAC: dbSNP version 141</ListItem>
          <ListItem>gnomAD v2: dbSNP version 147</ListItem>
          <ListItem>gnomAD v3: dbSNP version 151</ListItem>
        </List>

        <p>
          Several other classes of problem relates to fundamental issues with dbSNP. We generally
          suggest not using these identifiers at all; if a user is interested in a particular
          variant we encourage searching for it by chromosome, position, and allele rather than
          rsID.
        </p>
      </Answer>

      <Question id="i-can-find-my-variant-of-interest-by-searching-for-the-particular-variant-but-why-doesnt-it-show-up-in-the-variant-table-when-I-type-the-gene-into-the-search-bar">
        I can find my variant of interest by searching for the particular variant, but why
        doesn&apos;t it show up in the variant table when I type the gene into the search bar?
      </Question>
      <Answer>
        <p>
          A gene search in the new browser will return variants in the CDS regions of the gene or
          within 75 base pairs of a CDS region. This behavior means that not all intronic or UTR
          variants will appear when doing a gene search or downloading the CSV tables, leading to
          fewer variants being displayed on the browser than what is present in the downloadable
          VCFs (which will contain all variants). You can also do a region search (example:{' '}
          <Link to="/region/1-55510000-55512000">
            https://gnomad.broadinstitute.org/region/1-55510000-55512000
          </Link>
          ) to bring up intronic variants. We are working on an option to include UTR variants in
          the results.
        </p>
      </Answer>

      <Question id="why-are-some-variants-depleted-for-homozygotes-out-of-hardy-weinberg-equilibrium">
        Why are some variants depleted for homozygotes/out of Hardy-Weinberg Equilibrium (HWE)?
      </Question>
      <Answer>
        <p>
          It has recently come to our attention that a number of genotypes with a high proportion of
          alternate allele reads (Allele Balance; AB &ge; 90%) are being called as heterozygous when
          they may be homozygous. This deflates the number of reported homozygotes, and is
          especially apparent at common variants and more so for long insertions and deletions. This
          will affect frequency estimates and especially the calculation of Hardy-Weinberg
          Equilibrium. Use caution when interpreting the frequencies of these variants. We are
          currently flagging these variants in the gnomAD browser, and working on a longer-term fix.
          See our <ExternalLink href="https://doi.org/10.1101/784157">preprint</ExternalLink> for
          more details.
        </p>
      </Answer>

      <Question id="can-i-filter-out-a-particular-cohort-for-my-analysis">
        Can I filter out a particular cohort for my analysis?
      </Question>
      <Answer>
        <p>
          Unfortunately, for many reasons (including consent and data usage restrictions) we cannot
          provide the information required for such filtering. The only subsets we provide are
          controls, non-cancer, non-neuro, and non-TOPMed. At this time, subsets are only available
          in gnomAD v2.
        </p>
      </Answer>

      <Question id="how-do-i-query-a-batch-of-variants-do-you-have-an-api">
        How do I query a batch of variants? Do you have an API?
      </Question>
      <Answer>
        <p>
          We currently do not have a way to submit batch queries on the browser, but we are actively
          working on developing an API for ExAC/gnomAD. If you would like to learn about GraphQL,
          which we will use to work with the API, an overview can be found at{' '}
          <ExternalLink href="https://graphql.org">https://graphql.org</ExternalLink>.You can also
          obtain information on all variants from the VCFs and Hail Tables available on our{' '}
          <Link to="/downloads">downloads page</Link>.
        </p>
      </Answer>

      <Question id="when-are-exomes-going-to-be-available-on-grch38">
        When are exomes going to be available on GRCh38?
      </Question>
      <Answer>
        <p>
          This is to come in 2021 with gnomAD v4! At this time, we have GRCh38 lifted-over versions
          of the gnomAD v2 datasets available on our downloads page. However, note that these are
          imperfect and contain a number of known issues. For example, some variants cannot be
          lifted-over and in some cases, multiple variants map to the same position in GRCh38.
        </p>
      </Answer>

      <Question id="how-do-i-download-the-data">How do I download the data?</Question>
      <Answer>
        <p>
          Please visit our <Link to="/downloads">downloads page</Link>. These files (as well as
          several additional files) are available through our{' '}
          <ExternalLink href="https://console.cloud.google.com/storage/browser/gnomad-public">
            Google Cloud Storage bucket
          </ExternalLink>
          .
        </p>
      </Answer>
    </dl>

    <FAQSectionHeading id="Coverage">Coverage</FAQSectionHeading>
    <dl>
      <Question id="how-was-coverage-calculated">How was coverage calculated?</Question>
      <Answer>
        <h4>gnomAD v3</h4>

        <p>
          Coverage was computed using all 71,702 gnomAD v3 samples from their GVCFs . The gVCFs were
          produced using a 3-bin blocking scheme:
        </p>

        <List>
          <ListItem>No coverage</ListItem>
          <ListItem>Reference genotype quality &lt; Q20</ListItem>
          <ListItem>Reference genotype quality &ge; Q20</ListItem>
        </List>

        <p>
          The coverage was binned by quality using the thresholds above and the median coverage
          value for each of the resulting coverage blocks was used to compute the coverage metrics
          presented in the browser.
        </p>

        <p>
          Coverage was computed for all callable bases in the genome (all non-N bases, minus
          telomeres and centromeres).
        </p>

        <h4>gnomAD v2</h4>

        <p>
          Coverage was calculated separately for exomes and genomes on a ~10% subset of the samples
          using the <ExternalLink href="https://www.htslib.org/">samtools</ExternalLink> depth tool.
          The base quality threshold was set to 10 for the -q option and the mapping quality
          threshold set to 20 for the -Q option. It is calculated per base of the respective calling
          intervals, includes sites with zero depth (-a flag), and is capped at 100x for a given
          sample and base pair. Mean coverage is then plotted on the browser. The numbers in columns
          over_1, over_5, over_10, etc of our downloadable coverage files refer to the fraction of
          samples with a depth of coverage of at least 1 read, 5 reads, 10 reads, etc. for the given
          chromosome and position.
        </p>
      </Answer>

      <Question id="is-my-variant-missing-because-it-was-not-called-in-any-of-the-samples-or-did-the-site-just-lack-coverage">
        Is my variant missing because it was not called in any of the samples or did the site just
        lack coverage?
      </Question>
      <Answer>
        <p>
          The best way to tell if a variant is missing because of a lack of coverage vs missing
          because it is actually absent in all gnomAD samples is to check the coverage at that base
          position. You can obtain coverage files from our downloads page. If you are using the
          browser, a region search will still display coverage plots for zero-variant sites, which
          can help distinguish between sites that lack variants and sites that could not be called
          because of a lack of coverage.
        </p>
      </Answer>

      <Question id="why-does-a-variant-show-a-large-drop-in-an-compared-to-surrounding-variants-in-gnomad-v2">
        Why does a variant show a large drop in AN compared to surrounding variants in gnomAD v2?
      </Question>
      <Answer>
        <p>
          Sometimes a large apparent drop in AN can occur because a variant was called in only
          genome samples. If surrounding variants were called in exomes or both exomes and genomes,
          the AN values for these variants are higher, making it appear that there is a sudden drop
          and rise in AN. Although the AN is likely consistently high across the given region for
          exomes, if we only have explicit variant calls for the genome data, we can only speak to
          our reference confidence for those samples.
        </p>
      </Answer>

      <Question id="what-are-your-calling-intervals-what-intervals-are-used-for-the-genomes-coding-only-files">
        What are your calling intervals? What intervals are used for the genomes coding-only files?
      </Question>
      <Answer>
        <p>
          The calling intervals for our exomes include the bait-covered regions &plusmn;50 bp. The
          following exome calling intervals were used to generate the genome coding-only files in
          gnomAD v2.
        </p>

        <List>
          <ListItem>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/intervals/exome_calling_regions.v1.interval_list">
              Exome calling regions
            </ExternalLink>
          </ListItem>
          <ListItem>
            <ExternalLink href="https://storage.googleapis.com/gnomad-public/intervals/hg19-v0-wgs_evaluation_regions.v1.interval_list">
              Genome calling regions
            </ExternalLink>
          </ListItem>
        </List>
      </Answer>
    </dl>
  </InfoPage>
)
