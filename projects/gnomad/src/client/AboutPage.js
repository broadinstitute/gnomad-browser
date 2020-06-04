import React from 'react'
import styled from 'styled-components'
import { ExternalLink, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

const Credits = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  font-size: 13px;

  @media (max-width: 992px) {
    flex-direction: column;
    font-size: 16px;
  }
`

const CreditsSection = styled.div`
  width: calc(${props => props.width} - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const ContributorList = styled.ul`
  list-style-type: none;
  padding-left: 0;
  line-height: 1.5;

  ul {
    padding-left: 20px;
    margin: 0.5em 0;
    list-style-type: none;
  }
`

const PrincipalInvestigatorList = styled(ContributorList)`
  columns: 2;

  @media (max-width: 992px) {
    columns: 1;
  }
`

const FundingSourceList = styled(ContributorList)`
  li {
    margin-bottom: 1em;
  }
`

export default () => (
  <InfoPage>
    <DocumentTitle title="About gnomAD" />
    <PageHeading id="about-gnomad">About gnomAD</PageHeading>
    <p>
      The Genome Aggregation Database (gnomAD), is a coalition of investigators seeking to aggregate
      and harmonize exome and genome sequencing data from a variety of large-scale sequencing
      projects, and to make summary data available for the wider scientific community. The project
      is overseen by co-directors Heidi Rehm and Mark Daly, and council members Daniel MacArthur,
      Benjamin Neale, Michael Talkowski, Anne O&apos;Donnell-Luria, Grace Tiao, Matthew Solomonson,
      and Kat Tarasova. In its first release, which contained exclusively exome data, it was known
      as the Exome Aggregation Consortium (ExAC).
    </p>
    <p>
      The v3 short variant data set provided on this website spans 71,702 genomes from unrelated
      individuals sequenced as part of various disease-specific and population genetic studies, and
      is aligned against the GRCh38 reference. See the{' '}
      <ExternalLink href="https://macarthurlab.org/2019/10/16/gnomad-v3-0/">
        gnomAD v3.0 blog post
      </ExternalLink>{' '}
      for details of the latest release. The v2 short variant data set provided on this website
      spans 125,748 exomes and 15,708 genomes from unrelated individuals sequenced as part of
      various disease-specific and population genetic studies, totalling 141,456 individuals, and is
      aligned against the GRCh37 reference. See the{' '}
      <ExternalLink href="https://macarthurlab.org/2018/10/17/gnomad-v2-1/">
        gnomAD v2.1 blog post
      </ExternalLink>{' '}
      for details of the v2.1 release. We have removed individuals known to be affected by severe
      pediatric disease, as well as their first-degree relatives, so these data sets should serve as
      useful reference sets of allele frequencies for severe pediatric disease studies - however,
      note that some individuals with severe disease may still be included in the data sets, albeit
      likely at a frequency equivalent to or lower than that seen in the general population.
    </p>
    <p>
      All of the raw data from these projects have been reprocessed through equivalent pipelines,
      and jointly variant-called to increase consistency across projects. The processing pipelines
      were written in the{' '}
      <ExternalLink href="https://software.broadinstitute.org/wdl/">
        WDL workflow definition language
      </ExternalLink>{' '}
      and executed using the{' '}
      <ExternalLink href="https://github.com/broadinstitute/cromwell">
        Cromwell execution engine
      </ExternalLink>
      , open-source projects for defining and executing genomic workflows at massive scale on
      multiple platforms. The gnomAD data set contains individuals sequenced using multiple exome
      capture methods and sequencing chemistries, so coverage varies between individuals and across
      sites. This variation in coverage is incorporated into the variant frequency calculations for
      each variant.
    </p>
    <p>
      gnomAD was QCed and analysed using the{' '}
      <ExternalLink href="https://hail.is/">Hail</ExternalLink> open-source framework for scalable
      genetic analysis.
    </p>
    <p>
      A list of gnomAD Principal Investigators and groups that have contributed data and analysis to
      the current release is available below.
    </p>
    <p>
      The generation of this call set was funded primarily by the Broad Institute, and the data here
      are released publicly for the benefit of the wider biomedical community. There are no
      publication restrictions or embargoes on these data. Please cite the{' '}
      <ExternalLink href="https://broad.io/gnomad_lof">flagship gnomAD paper</ExternalLink> for any
      use of these data.
    </p>
    <p>
      The gnomAD structural variant (SV) v2.1 data set provided on this website spans 10,847 genomes
      from unrelated individuals sequenced as part of various disease-specific and population
      genetic studies, and is aligned against the GRCh37 reference. It mostly (but not entirely)
      overlaps with the genome set used for the gnomAD short variant release. See the{' '}
      <ExternalLink href="https://macarthurlab.org/2019/03/20/structural-variants-in-gnomad/">
        Structural variants in gnomAD blog post
      </ExternalLink>{' '}
      for details of the SV release. As with the gnomAD short variant data set, we have removed
      individuals known to be affected by severe pediatric disease, as well as their first-degree
      relatives, so this data set should serve as a useful reference set of allele frequencies for
      severe pediatric disease studies - however, note that some individuals with severe disease may
      still be included in the data set, albeit likely at a frequency equivalent to or lower than
      that seen in the general population.
    </p>
    <p>
      All of the raw data from these projects have been reprocessed through the same pipeline, and
      jointly variant-called to increase consistency across projects.In brief, we aggregated
      Illumina short-read WGS from population genetic and complex disease-association studies. We
      discovered SVs by integrating four published SV algorithms (
      <ExternalLink href="https://www.ncbi.nlm.nih.gov/pubmed/26647377">Manta</ExternalLink> ,{' '}
      <ExternalLink href="https://www.ncbi.nlm.nih.gov/pubmed/22962449">DELLY</ExternalLink> ,{' '}
      <ExternalLink href="https://www.ncbi.nlm.nih.gov/pubmed/28855259">MELT</ExternalLink> , and{' '}
      <ExternalLink href="https://www.ncbi.nlm.nih.gov/pubmed/22302147">cn.MOPS</ExternalLink>) to
      identify SVs across seven mutational classes, and jointly filtered, genotyped, resolved, and
      annotated these SVs across all genomes. All SV discovery was performed in{' '}
      <ExternalLink href="https://software.broadinstitute.org/firecloud/">FireCloud</ExternalLink>{' '}
      using the{' '}
      <ExternalLink href="https://software.broadinstitute.org/wdl/">
        Workflow Description Language (WDL)
      </ExternalLink>{' '}
      and the{' '}
      <ExternalLink href="https://cromwell.readthedocs.io/en/stable/">
        Cromwell Execution Engine
      </ExternalLink>{' '}
      , where the components of the gnomAD SV discovery pipeline are available as public methods
      with dedicated Docker images. Extensive technical details of this process are provided in the
      supplementary information of the{' '}
      <ExternalLink href="https://broad.io/gnomad_sv">gnomAD SV paper</ExternalLink>; please cite
      this paper for use of the SV data.
    </p>
    <p>
      The data released by gnomAD are available free of restrictions under the{' '}
      <ExternalLink href="https://creativecommons.org/publicdomain/zero/1.0/">
        Creative Commons Zero Public Domain Dedication
      </ExternalLink>
      . This means that you can use it for any purpose without legally having to give attribution.
      However, we request that you actively acknowledge and give attribution to the gnomAD project,
      and link back to the relevant page, wherever possible. Attribution supports future efforts to
      release other data. It also reduces the amount of &quot;orphaned data&quot;, helping retain
      links to authoritative sources.
    </p>
    <p>
      The aggregation and release of summary data from the exomes and genomes collected by the
      Genome Aggregation Database has been approved by the Partners IRB (protocol 2013P001339,
      &quot;Large-scale aggregation of human genomic data&quot;).
    </p>
    <Credits>
      <CreditsSection width="34%">
        <h3 id="principal-investigators">Principal Investigators</h3>
        <PrincipalInvestigatorList aria-labelledby="principal-investigators">
          <li>Maria Abreu</li>
          <li>Carlos A Aguilar Salinas</li>
          <li>Tariq Ahmad</li>
          <li>Christine M. Albert</li>
          <li>Nicholette Allred</li>
          <li>David Altshuler</li>
          <li>Diego Ardissino</li>
          <li>Gil Atzmon</li>
          <li>John Barnard</li>
          <li>Laurent Beaugerie</li>
          <li>Gary Beecham</li>
          <li>Emelia J. Benjamin</li>
          <li>Michael Boehnke</li>
          <li>Lori Bonnycastle</li>
          <li>Erwin Bottinger</li>
          <li>Donald Bowden</li>
          <li>Matthew Bown</li>
          <li>Steven Brant</li>
          <li>Hannia Campos</li>
          <li>John Chambers</li>
          <li>Juliana Chan</li>
          <li>Daniel Chasman</li>
          <li>Rex Chisholm</li>
          <li>Judy Cho</li>
          <li>Rajiv Chowdhury</li>
          <li>Mina Chung</li>
          <li>Wendy Chung</li>
          <li>Bruce Cohen</li>
          <li>Adolfo Correa</li>
          <li>Dana Dabelea</li>
          <li>Mark Daly</li>
          <li>John Danesh</li>
          <li>Dawood Darbar</li>
          <li>Joshua Denny</li>
          <li>Ravindranath Duggirala</li>
          <li>Josée Dupuis</li>
          <li>Patrick T. Ellinor</li>
          <li>Roberto Elosua</li>
          <li>Jeanette Erdmann</li>
          <li>Tõnu Esko</li>
          <li>Martt Färkkilä</li>
          <li>Diane Fatkin</li>
          <li>Jose Florez</li>
          <li>Andre Franke</li>
          <li>Gad Getz</li>
          <li>David Glahn</li>
          <li>Ben Glaser</li>
          <li>Stephen Glatt</li>
          <li>David Goldstein</li>
          <li>Clicerio Gonzalez</li>
          <li>Leif Groop</li>
          <li>Christopher Haiman</li>
          <li>Ira Hall</li>
          <li>Craig Hanis</li>
          <li>Matthew Harms</li>
          <li>Mikko Hiltunen</li>
          <li>Matti Holi</li>
          <li>Christina Hultman</li>
          <li>Chaim Jalas</li>
          <li>Mikko Kallela</li>
          <li>Jaakko Kaprio</li>
          <li>Sekar Kathiresan</li>
          <li>Eimear Kenny</li>
          <li>Bong-Jo Kim</li>
          <li>Young Jin Kim</li>
          <li>George Kirov</li>
          <li>Jaspal Kooner</li>
          <li>Seppo Koskinen</li>
          <li>Harlan M. Krumholz</li>
          <li>Subra Kugathasan</li>
          <li>Soo Heon Kwak</li>
          <li>Markku Laakso</li>
          <li>Terho Lehtimäki</li>
          <li>Ruth Loos</li>
          <li>Steven A. Lubitz</li>
          <li>Ronald Ma</li>
          <li>Daniel MacArthur</li>
          <li>Gregory M. Marcus</li>
          <li>Jaume Marrugat</li>
          <li>Kari Mattila</li>
          <li>Steve McCarroll</li>
          <li>Mark McCarthy</li>
          <li>Jacob McCauley</li>
          <li>Dermot McGovern</li>
          <li>Ruth McPherson</li>
          <li>James Meigs</li>
          <li>Olle Melander</li>
          <li>Deborah Meyers</li>
          <li>Lili Milani</li>
          <li>Braxton Mitchell</li>
          <li>Aliya Naheed</li>
          <li>Saman Nazarian</li>
          <li>Ben Neale</li>
          <li>Peter Nilsson</li>
          <li>Michael O&apos;Donovan</li>
          <li>Dost Ongur</li>
          <li>Lorena Orozco</li>
          <li>Michael Owen</li>
          <li>Colin Palmer</li>
          <li>Aarno Palotie</li>
          <li>Kyong Soo Park</li>
          <li>Carlos Pato</li>
          <li>Ann Pulver</li>
          <li>Dan Rader</li>
          <li>Nazneen Rahman</li>
          <li>Alex Reiner</li>
          <li>Anne Remes</li>
          <li>Stephen Rich</li>
          <li>John D. Rioux</li>
          <li>Samuli Ripatti</li>
          <li>Dan Roden</li>
          <li>Jerome I. Rotter</li>
          <li>Danish Saleheen</li>
          <li>Veikko Salomaa</li>
          <li>Nilesh Samani</li>
          <li>Jeremiah Scharf</li>
          <li>Heribert Schunkert</li>
          <li>Svati Shah</li>
          <li>Moore Shoemaker</li>
          <li>Tai Shyong</li>
          <li>Edwin K. Silverman</li>
          <li>Pamela Sklar</li>
          <li>Gustav Smith</li>
          <li>Hilkka Soininen</li>
          <li>Harry Sokol</li>
          <li>Tim Spector</li>
          <li>Nathan Stitziel</li>
          <li>Patrick Sullivan</li>
          <li>Jaana Suvisaari</li>
          <li>Kent Taylor</li>
          <li>Yik Ying Teo</li>
          <li>Tuomi Tiinamaija</li>
          <li>Ming Tsuang</li>
          <li>Dan Turner</li>
          <li>Teresa Tusie Luna</li>
          <li>Erkki Vartiainen</li>
          <li>James Ware</li>
          <li>Hugh Watkins</li>
          <li>Rinse Weersma</li>
          <li>Maija Wessman</li>
          <li>James Wilson</li>
          <li>Ramnik Xavier</li>
        </PrincipalInvestigatorList>
      </CreditsSection>
      <CreditsSection width="30%">
        <h3 id="contributing-projects">Contributing projects</h3>
        <ContributorList aria-labelledby="contributing-projects">
          <li>1000 Genomes</li>
          <li>1958 Birth Cohort</li>
          <li>African American Coronary Artery Calcification project (AACAC)</li>
          <li>ALSGEN</li>
          <li>Alzheimer&apos;s Disease Sequencing Project (ADSP)</li>
          <li>
            Atrial Fibrillation Genetics Consortium (AFGen)
            <ul>
              <li>Duke Catheterization Genetics (CATHGEN)</li>
            </ul>
          </li>
          <li>Bangladesh Risk of Acute Vascular Events (BRAVE) Study</li>
          <li>BioMe Biobank</li>
          <li>Bulgarian Trios</li>
          <li>COPD-Gene</li>
          <li>Estonian Genome Center, University of Tartu (EGCUT)</li>
          <li>Finland-United States Investigation of NIDDM Genetics (FUSION)</li>
          <li>Finnish Migraine Study</li>
          <li>Finnish Twin Cohort Study</li>
          <li>FINN-ADGEN</li>
          <li>FINRISK</li>
          <li>Framingham Heart Study</li>
          <li>Genetics of Cardiometabolic Health in the Amish</li>
          <li>Génome Québec - Genizon Biobank</li>
          <li>Genomic Psychiatry Cohort</li>
          <li>GoT2D</li>
          <li>Genotype-Tissue Expression Project (GTEx)</li>
          <li>Health2000</li>
          <li>
            Inflammatory Bowel Disease:
            <ul>
              <li>1000IBD project</li>
              <li>Helsinki University Hospital Finland</li>
              <li>NIDDK IBD Genetics Consortium</li>
              <li>Quebec IBD Genetics Consortium</li>
            </ul>
          </li>
          <li>Jackson Heart Study</li>
          <li>Jewish Genome Project - funded by Bonei Olam</li>
          <li>Kuopio Alzheimer Study</li>
          <li>LifeLines Cohort</li>
          <li>Lung Tissue Research Consortium (LTRC)</li>
          <li>McLean Program for Neuropsychiatric Research, Psychotic Disorders Division</li>
          <li>MESTA</li>
          <li>METabolic Syndrome In Men (METSIM)</li>
          <li>Multi-Ethnic Study of Atherosclerosis (MESA)</li>
          <li>
            Myocardial Infarction Genetics Consortium (MIGen):
            <ul>
              <li>Leicester Exome Seq</li>
              <li>North German MI Study</li>
              <li>Ottawa Genomics Heart Study</li>
              <li>Pakistan Risk of Myocardial Infarction Study (PROMIS)</li>
              <li>Precocious Coronary Artery Disease Study (PROCARDIS)</li>
              <li>Registre Gironi del COR (REGICOR)</li>
              <li>South German MI Study</li>
              <li>
                Variation in Recovery: Role of Gender on Outcomes of Young AMI Patients (VIRGO)
              </li>
            </ul>
          </li>
          <li>National Institute of Mental Health (NIMH) Controls</li>
          <li>NHGRI CCDG</li>
          <li>NHLBI-GO Exome Sequencing Project (ESP)</li>
          <li>NHLBI TOPMed</li>
          <li>Population Architecture Using Genomics and Epidemiology (PAGE) Consortium</li>
          <li>Schizophrenia Trios from Taiwan</li>
          <li>Sequencing Initiative Suomi (SiSu)</li>
          <li>SIGMA-T2D</li>
          <li>SubPopulations and InteRmediate Outcome Measures In COPD Study (SPIROMICS)</li>
          <li>Swedish Schizophrenia & Bipolar Studies</li>
          <li>
            T2D-GENES
            <ul>
              <li>GoDARTS</li>
            </ul>
          </li>
          <li>T2D-SEARCH</li>
          <li>The Cancer Genome Atlas (TCGA)</li>
          <li>Whole Genome Sequencing in Psychiatric Disorders (WGSPD)</li>
          <li>Women&apos;s Health Initiative (WHI)</li>
        </ContributorList>
      </CreditsSection>
      <CreditsSection width="18%">
        <h3 id="production-team">Production team</h3>
        <ContributorList aria-labelledby="production-team">
          <li>
            <strong>Eric Banks</strong>
          </li>
          <li>Louis Bergelson</li>
          <li>Kristian Cibulskis</li>
          <li>Miguel Covarrubias</li>
          <li>Yossi Farjoun</li>
          <li>Laura Gauthier</li>
          <li>Jeff Gentry</li>
          <li>Thibault Jeandet</li>
          <li>Diane Kaplan</li>
          <li>Christopher Llanwarne</li>
          <li>Ruchi Munshi</li>
          <li>Sam Novod</li>
          <li>Nikelle Petrillo</li>
          <li>David Roazen</li>
          <li>Valentin Ruano-Rubio</li>
          <li>Megan Shand</li>
          <li>Jonn Smith</li>
          <li>Jose Soto</li>
          <li>Kathleen Tibbetts</li>
          <li>Charlotte Tolonen</li>
          <li>Gordon Wade</li>
        </ContributorList>
        <h3 id="analysis-team">Analysis team</h3>
        <ContributorList aria-labelledby="analysis-team">
          <li>
            <strong>Laurent Francioli</strong>
          </li>
          <li>
            <strong>Konrad Karczewski</strong>
          </li>
          <li>
            <strong>Grace Tiao</strong>
          </li>
          <li>
            <strong>Kristen Laricchia</strong>
          </li>
          <li>Irina Armean</li>
          <li>Ryan Collins</li>
          <li>Beryl Cummings</li>
          <li>Mark Daly</li>
          <li>Laura Gauthier</li>
          <li>Eric Minikel</li>
          <li>Ben Neale</li>
          <li>Anne O&apos;Donnell-Luria</li>
          <li>Tim Poterba</li>
          <li>Kaitlin Samocha</li>
          <li>Cotton Seed</li>
          <li>Chris Vittal</li>
          <li>Arcturus Wang</li>
          <li>Qingbo Wang</li>
          <li>James Ware</li>
          <li>Nicola Whiffin</li>
          <li>Mike Wilson</li>
        </ContributorList>
        <h3 id="sv-team">Structural Variation team</h3>
        <ContributorList aria-labelledby="sv-team">
          <li>
            <strong>Ryan Collins</strong>
          </li>
          <li>
            <strong>Harrison Brand</strong>
          </li>
          <li>
            <strong>Michael Talkowski</strong>
          </li>
          <li>Eric Banks</li>
          <li>Ted Brookings</li>
          <li>Laurent Francioli</li>
          <li>Jack Fu</li>
          <li>Laura Gauthier</li>
          <li>Konrad Karczewski</li>
          <li>Chelsea Lowther</li>
          <li>Tom Lyons</li>
          <li>Sam Novod</li>
          <li>Ted Sharpe</li>
          <li>Matthew Solomonson</li>
          <li>Gordon Wade</li>
          <li>Mark Walker</li>
          <li>Harold Wang</li>
          <li>Nick Watts</li>
          <li>Christopher Whelan</li>
          <li>Xuefang Zhao</li>
        </ContributorList>
      </CreditsSection>
      <CreditsSection width="18%">
        <h3 id="coordination">Coordination</h3>
        <ContributorList aria-labelledby="coordination">
          <li>Jessica Alföldi</li>
          <li>Kat Tarasova</li>
        </ContributorList>
        <h3 id="website-team">Website team</h3>
        <ContributorList aria-labelledby="website-team">
          <li>
            <strong>Matthew Solomonson</strong>
          </li>
          <li>
            <strong>Nick Watts</strong>
          </li>
          <li>Konrad Karczewski</li>
          <li>Ben Weisburd</li>
        </ContributorList>
        <h3 id="ethics-team">Ethics team</h3>
        <ContributorList aria-labelledby="ethics-team">
          <li>Stacey Donnelly</li>
          <li>Namrata Gupta</li>
          <li>Emily Lipscomb</li>
          <li>Andrea Saltzman</li>
          <li>Molly Schleicher</li>
        </ContributorList>
        <h3 id="broad-genomics-platform">Broad Genomics Platform</h3>
        <ContributorList aria-labelledby="broad-genomics-platform">
          <li>Kristen Connolly</li>
          <li>Steven Ferriera</li>
          <li>Stacey Gabriel</li>
        </ContributorList>
        <h3 id="gnomad-council">gnomAD Council</h3>
        <ContributorList aria-labelledby="gnomad-council">
          <li>
            <strong>Mark Daly</strong>
          </li>
          <li>
            <strong>Heidi Rehm</strong>
          </li>
          <li>Daniel MacArthur</li>
          <li>Ben Neale</li>
          <li>Anne O&apos;Donnell-Luria</li>
          <li>Matthew Solomonson</li>
          <li>Mike Talkowski</li>
          <li>Kat Tarasova</li>
          <li>Grace Tiao</li>
        </ContributorList>
        <h3 id="funding">Funding</h3>
        <FundingSourceList aria-labelledby="funding">
          <li>
            NIGMS R01 GM104371
            <br />
            (PI: MacArthur)
          </li>
          <li>
            NIDDK U54 DK105566
            <br />
            (PIs: MacArthur and Neale)
          </li>
          <li>
            NHGRI U24 HG010262
            <br />
            (PI: Philippakis)
          </li>
          <li>
            NIMH R56 MH115957
            <br />
            (PI: Talkowski)
          </li>
          <li>
            NHLBI R01 HL143295
            <br />
            (PI: Green)
          </li>
          <li>
            Wellcome Trust WT200990/Z/16/Z
            <br />
            (PI: Birney)
          </li>
          <li>BioMarin</li>
          <li>Sanofi-Genzyme</li>
        </FundingSourceList>
        <p>
          The vast majority of the data storage, computing resources, and human effort used to
          generate this call set were donated by the Broad Institute
        </p>
      </CreditsSection>
    </Credits>
  </InfoPage>
)
