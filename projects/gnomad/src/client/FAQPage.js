import React from 'react'
import styled from 'styled-components'

import { ExternalLink, List, ListItem, PageHeading } from '@broad/ui'

import ageDistribution from './ageDistribution'
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
      <Question id="how-should-i-cite-discoveries-made-using-gnomad-data">
        How should I cite discoveries made using gnomAD data?
      </Question>
      <Answer>
        <p>
          Please cite the{' '}
          <ExternalLink href="https://www.biorxiv.org/content/10.1101/531210v2">
            gnomAD flagship paper
          </ExternalLink>
          .
        </p>

        <p>
          There&apos;s no need to include us as authors on your manuscript, unless we contributed
          specific advice or analysis for your work. However, we ask that the Consortium be
          acknowledged in publications as follows:
        </p>
        <blockquote>
          <p>
            The authors would like to thank the Genome Aggregation Database (gnomAD) and the groups
            that provided exome and genome variant data to this resource. A full list of
            contributing groups can be found at{' '}
            <Link preserveSelectedDataset={false} to="/about">
              https://gnomad.broadinstitute.org/about
            </Link>
            .
          </p>
        </blockquote>
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
          data from the database as a whole. Making this possible would require a truly staggering
          amount of paperwork, and we&apos;d rather spend that time generating larger data sets for
          the community to use.
        </p>
      </Answer>

      <Question id="what-are-the-restrictions-on-data-usage">
        What are the restrictions on data usage?
      </Question>
      <Answer>
        <p>
          There are no restrictions or embargoes on the publication of results derived from the
          gnomAD database. However, we encourage people to{' '}
          <ExternalLink href="mailto:exomeconsortium@gmail.com">
            check with the consortium
          </ExternalLink>{' '}
          before embarking on large-scale analyses, to see if we already have something currently
          underway that overlaps with your plans; generally, we prefer to collaborate with users
          rather than compete with them. The data are available under the{' '}
          <ExternalLink href="https://opendatacommons.org/licenses/odbl/1.0/">
            ODC Open Database License (ODbL)
          </ExternalLink>{' '}
          (summary available{' '}
          <ExternalLink href="https://www.opendatacommons.org/licenses/odbl/1-0/summary/">
            here
          </ExternalLink>
          ): you are free to share and modify the gnomAD data so long as you attribute any public
          use of the database, or works produced from the database; keep the resulting data-sets
          open; and offer your shared or adapted version of the dataset under the same ODbL license.
        </p>
      </Answer>

      <Question id="why-is-a-particular-variant-found-in-exac-but-not-in-gnomad">
        Why is a particular variant found in ExAC but not in gnomAD?
      </Question>
      <Answer>
        <p>Likely because of differences between the two projects in sample and variant QC.</p>

        <p>
          Sample QC: Not all ExAC data is included in gnomAD. Most of the samples in ExAC were
          included during the initial joint calling. However, we made changes in our sample QC
          process and added more recently-sequenced/high-quality samples, which has resulted in the
          removal of some samples that were present in ExAC. Approximately 10% of the samples in
          ExAC are missing from gnomAD, so we expect some variants in ExAC, particularly those that
          were found at low frequencies, to be absent in gnomAD.
        </p>

        <p>
          Variant QC: Some variants present in ExAC may now be filtered in gnomAD because we used a
          combination of a random forest classifier and hard filters for gnomAD rather than the
          standard GATK Variant Quality Score Recalibration (VQSR), which we used for ExAC.
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
          </ExternalLink>{' '}
          and{' '}
          <ExternalLink href="https://macarthurlab.org/2018/10/17/gnomad-v2-1/">
            &quot;gnomAD v2.1&quot;
          </ExternalLink>
          .
        </p>
      </Answer>

      <Question id="should-i-switch-from-using-exac-to-using-gnomad">
        Should I switch from using ExAC to using gnomAD?
      </Question>
      <Answer>
        <p>
          We use gnomAD in our own rare disease work and believe that we have made considerable
          improvements to our sample and variant QC process. We have also greatly increased our
          number of samples (gnomAD consists of 125,748 exomes and 15,708 genomes, whereas ExAC has
          60,706 exomes). However, no variant QC pipeline is perfect, and it is possible that real
          variants in ExAC have now been filtered plus there are some samples in ExAC that are not
          included in gnomAD. If a variant is not in gnomAD, then it is often still worthwhile to
          check if it is present in ExAC (or if it has been filtered in gnomAD - with the
          understanding that most filtered variants have questionable reliability).
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
          variant counts. More details can be found in section 4.1 of the supplement in{' '}
          <ExternalLink href="https://www.nature.com/nature/journal/v536/n7616/full/nature19057.html">
            Lek et al
          </ExternalLink>
          . Note that the expected variant counts for bases with a median depth &lt;1 were removed
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
          &ge;1. The counts represent the number of unique variants and not the allele count of said
          variants.
        </p>
      </Answer>

      <Question id="why-are-there-fewer-variants-in-the-constraint-table-than-on-the-gene-page">
        Why are there fewer variants in the constraint table than depicted on the gene page?
      </Question>
      <Answer>
        <p>
          We only included variants that were found in the canonical transcript of the gene. On the
          gene page, variants found in all transcripts are depicted. Additionally, both observed and
          expected variant counts were removed for sites with a median depth &lt;1.
        </p>
      </Answer>

      <Question id="what-is-included-in-lof">What is included in LoF?</Question>
      <Answer>
        <p>
          Nonsense, splice acceptor, and splice donor variants caused by single nucleotide changes.
        </p>
      </Answer>

      <Question id="why-are-constraint-metrics-missing-for-this-gene">
        Why are constraint metrics missing for this gene?
      </Question>
      <Answer>
        <p>
          Genes that were outliers in certain assessments will not have constraint metrics. Please
          note that these assessments were applied to the canonical transcripts of the genes. If a
          gene was not annotated as a protein-coding gene in Gencode v19, we did not calculate
          constraint. In addition, if a canonical transcript was missing a &quot;Met&quot; at the
          start, it was considered malformed and not evaluated for constraint metrics.
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
          All data are based on{' '}
          <ExternalLink href="ftp://ftp.broadinstitute.org/pub/seq/references/Homo_sapiens_assembly19.fasta">
            GRCh37/hg19
          </ExternalLink>
          .
        </p>
      </Answer>

      <Question id="what-version-of-gencode-was-used-to-annotate-variants">
        What version of Gencode was used to annotate variants?
      </Question>
      <Answer>
        <p>Version 19 (annotated with VEP version 85).</p>
      </Answer>

      <Question id="are-all-the-individuals-in-1000-genomes-included">
        Are all the individuals in 1000 Genomes included?
      </Question>
      <Answer>
        <p>
          The majority of samples from the 1000 Genomes Project for which <em>exome sequencing</em>{' '}
          is available were included (the only currently available whole genome data is low-coverage
          sequencing, and as such, not included).
        </p>
      </Answer>

      <Question id="are-all-the-individuals-in-the-exome-variant-server-included">
        Are all the individuals in the{' '}
        <ExternalLink href="https://evs.gs.washington.edu/EVS/">Exome Variant Server</ExternalLink>{' '}
        included?
      </Question>
      <Answer>
        <p>
          No. We were not given permission from dbGaP to include individuals from several of the
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
          with the major populations (i.e. afr, asj, amr, eas, fin, nfe, sas) in a principal
          component analysis (PCA).
        </p>
      </Answer>

      <Question id="what-is-the-age-distribution-in-gnomad">
        What is the age distribution in gnomAD?
      </Question>
      <Answer>
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
          We used X-chromosome homozygosity (F-stat,{' '}
          <ExternalLink href="https://hail.is/docs/0.2/methods/genetics.html?highlight=impute_sex#hail.methods.impute_sex">
            impute_sex function in Hail
          </ExternalLink>
          ) and normalized Y-chromosome coverage (exomes only) to assign sex for each gnomAD sample.
          The F-stat was computed for each sample using high-confidence QC SNVs (bi-allelic SNVs,
          LD-pruned to r<sup>2</sup> &lt; 0.1, with allele frequency &gt; 0.1% and call rate &gt;
          99%) on non-pseudoautosomal regions (non-PAR) of the X chromosome. The normalized coverage
          was only computed in exomes and was computed as the mean coverage on chromosome Y / mean
          coverage on chromosome 20. The threshold used for sex assignment were as follows:
        </p>
        <List>
          <ListItem>
            Exomes:
            <List style={{ marginTop: '0.5em' }}>
              <ListItem>
                Males: chromosome X (non-PAR) F-stat &gt; 0.6 & normalized Y chromosome coverage
                &ge; 0.1
              </ListItem>
              <ListItem>
                Females: chromosome X (non-PAR) F-stat &lt; 0.5 & normalized Y chromosome coverage
                &lt; 0.1
              </ListItem>
            </List>
          </ListItem>
          <ListItem>
            Genomes:
            <List style={{ marginTop: '0.5em' }}>
              <ListItem>Male: chromosome X (non-PAR) F-stat &gt; 0.8</ListItem>
              <ListItem>Female: chromosome X (non-PAR) F-stat &lt; 0.5</ListItem>
            </List>
          </ListItem>
        </List>
      </Answer>

      <Question id="how-is-ancestry-determined-for-gnomad-samples">
        How is ancestry determined for gnomAD samples?
      </Question>
      <Answer>
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
          minimize inflation of rare variant frequencies. This was done on exomes and genomes
          combined. We prioritized genomes over exomes and then sample quality when selecting which
          individuals to include.
        </p>
      </Answer>

      <Question id="why-doesnt-the-amino-acid-position-and-consequence-on-the-gene-page-match-what-i-expect-for-my-transcript">
        Why doesn&apos;t the amino acid position and consequence on the gene page match what I
        expect for my transcript?
      </Question>
      <Answer>
        <p>
          The gene page summarizes the most severe functional consequence and protein-level change
          regardless of the transcript. A &quot;†&quot; denotes a consequence that is for a
          non-canonical transcript. On the gene page you can select which transcript you would like
          to view (the canonical one is marked by *). Please also note that our transcripts are
          annotated using Gencode v19.
        </p>
      </Answer>

      <Question id="why-is-a-transcript-shown-in-the-browser-not-the-correct-length-and-or-appears-to-be-annotated-incorrectly">
        Why is a transcript shown in the browser not the correct length and/or appears to be
        annotated incorrectly?
      </Question>
      <Answer>
        <p>
          Our transcript annotations are based on Gencode v19. Annotations may have changed
          depending on the version of Gencode used (such as changing from a non-coding to a
          protein-coding gene, or having a different transcript length). We will be updating to a
          more recent Gencode version in a future release.
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
          <ListItem>InbreedingCoeff: The InbreedingCoeff is &lt; -0.3</ListItem>
          <ListItem>
            RF: Failed random forest filtering thresholds of 0.055 for exome SNVs, 0.206 for exome
            indels, 0.263 for genome SNVs, and 0.222 for genome indels
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
            LC LoF: Low-confidence LoF (filtered by{' '}
            <ExternalLink href="https://github.com/konradjk/loftee">LOFTEE</ExternalLink>)
          </ListItem>

          <ListItem>
            LoF Flag: Flagged by{' '}
            <ExternalLink href="https://github.com/konradjk/loftee">LOFTEE</ExternalLink>
          </ListItem>
          <ListItem>
            NC Transcript: Marked as LoF by VEP, but appears on a non-protein-coding transcript
          </ListItem>
        </List>
      </Answer>

      <Question id="why-is-this-variant-linked-to-the-wrong-dbsnp-rsid">
        Why is this variant linked to the wrong dbSNP rsID?
      </Question>
      <Answer>
        <p>
          The ExAC browser supports rsIDs up to dbSNP version 141 and gnomAD supports version 147,
          so there will be some differences between the databases and dbSNP depending on the
          versions being used. We will be updating to a more recent version of dbSNP in a future
          release.
        </p>

        <p>
          Several other classes of problem relates to fundamental issues with dbSNP. dbSNP rsIDs do
          not provide robustly unique identifiers as the rsIDs are based on genomic position and are
          allele-independent. We generally suggest not using these identifiers at all; if a user is
          interested in a particular variant we encourage searching for it by chromosome, position,
          and allele rather than rsID.
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

      <Question id="can-i-filter-out-a-particular-cohort-for-my-analysis">
        Can I filter out a particular cohort for my analysis?
      </Question>
      <Answer>
        <p>
          Unfortunately, for many reasons (including consent and data usage restrictions) we cannot
          provide the information required for such filtering. The only subsets we provide are
          controls, non-cancer, non-neuro, and non-TOPMed.
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

      <Question id="when-are-you-going-to-switch-over-to-grch38">
        When are you going to switch over to GRCh38?
      </Question>
      <Answer>
        <p>
          We are still working on reprocessing our data on GRCh38. Our first native release of
          GRCh38 data is scheduled to be released in the fall. We have lifted-over GRCh38 versions
          of our current datasets available on our{' '}
          <Link to={{ pathname: '/downloads', hash: '#variants-grch38-liftover' }}>
            downloads page
          </Link>
          , but note that these are imperfect and contain a number of known issues.
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
        <p>
          Coverage was calculated separately for exomes and genomes on a ~10% subset of the samples
          using the <ExternalLink href="https://www.htslib.org/">samtools</ExternalLink> depth tool.
          The base quality threshold was set to 10 for the -q option and the mapping quality
          threshold set to 20 for the -Q option. It is calculated per base of the respective calling
          intervals, includes sites with zero depth (-a flag), and is capped at 100x for a given
          sample and base pair. Mean coverage is then plotted on the browser. The numbers in columns
          1, 5, 10, etc of our downloadable coverage files refer to the fraction of samples with a
          depth of coverage of at least 1 read, 5 reads, 10 reads, etc. for the given chromosome and
          position.
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

      <Question id="why-does-a-variant-show-a-large-drop-in-AN-compared-to-surrounding-variants">
        Why does a variant show a large drop in AN compared to surrounding variants?
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
          exome calling intervals were used to generate the genome coding-only files.
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
