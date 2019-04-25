import React from 'react'
import styled from 'styled-components'
import { ExternalLink, PageHeading } from '@broad/ui'

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
      projects, and to make summary data available for the wider scientific community. In its first
      release, which contained exclusively exome data, it was known as the Exome Aggregation
      Consortium (ExAC).
    </p>
    <p>
      The short variant data set provided on this website spans 125,748 exomes and 15,708 genomes
      from unrelated individuals sequenced as part of various disease-specific and population
      genetic studies, totalling 141,456 individuals.{' '}
      <ExternalLink href="https://macarthurlab.org/2018/10/17/gnomad-v2-1/">
        This blog post
      </ExternalLink>{' '}
      describes the latest release. We have removed individuals known to be affected by severe
      pediatric disease, as well as their first-degree relatives, so this data set should serve as a
      useful reference set of allele frequencies for severe pediatric disease studies - however,
      note that some individuals with severe disease may still be included in the data set, albeit
      likely at a frequency equivalent to or lower than that seen in the general population.
    </p>
    <p>
      All of the raw data from these projects have been reprocessed through the same pipeline, and
      jointly variant-called to increase consistency across projects. The processing pipelines were
      written in the{' '}
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
      <ExternalLink href="https://www.biorxiv.org/content/10.1101/531210v2">
        flagship gnomAD paper
      </ExternalLink>{' '}
      for any use of these data.
    </p>
    <p>
      The gnomAD structural variant (SV) data set provided on this website spans 10,738 genomes from
      unrelated individuals sequenced as part of various disease-specific and population genetic
      studies. It mostly, but not entirely overlaps with the genome set used for the gnomAD short
      variant release. This{' '}
      <ExternalLink href="https://macarthurlab.org/2019/03/20/structural-variants-in-gnomad/">
        blog post
      </ExternalLink>{' '}
      describes the SV release. As with the gnomAD short variant data set, we have removed
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
      <ExternalLink href="https://broad.io/gnomad_sv">gnomAD SV preprint</ExternalLink>; please cite
      this preprint for use of the SV data.
    </p>
    <p>
      All the above data are available under the{' '}
      <ExternalLink href="http://opendatacommons.org/licenses/odbl/1.0/">
        ODC Open Database License (ODbL)
      </ExternalLink>{' '}
      (summary available{' '}
      <ExternalLink href="http://www.opendatacommons.org/licenses/odbl/1-0/summary/">
        here
      </ExternalLink>
      ): you are free to share and modify the gnomAD data so long as you attribute any public use of
      the database, or works produced from the database; keep the resulting data-sets open; and
      offer your shared or adapted version of the dataset under the same ODbL license.
    </p>
    <p>
      The aggregation and release of summary data from the exomes and genomes collected by the
      Genome Aggregation Database has been approved by the Partners IRB (protocol 2013P001339,
      &quot;Large-scale aggregation of human genomic data&quot;).
    </p>
    <p>
      For bug reports, please file an issue on{' '}
      <ExternalLink href="https://github.com/macarthur-lab/gnomadjs/issues">GitHub</ExternalLink>.
    </p>
    <Credits>
      <CreditsSection width="34%">
        <h3 id="principal-investigators">Principal Investigators</h3>
        <PrincipalInvestigatorList aria-labelledby="principal-investigators">
          <li>Daniel MacArthur</li>
          <li>Aarno Palotie</li>
          <li>Andres Metspalu</li>
          <li>Anne Remes</li>
          <li>Adolfo Correa</li>
          <li>Andre Franke</li>
          <li>Ann Pulver</li>
          <li>Ben Glaser</li>
          <li>Ben Neale</li>
          <li>Bong-Jo Kim</li>
          <li>Bruce Cohen</li>
          <li>Carlos Pato</li>
          <li>Carlos A Aguilar Salinas</li>
          <li>Christina Hultman</li>
          <li>Christine M. Albert</li>
          <li>Christopher Haiman</li>
          <li>Clicerio Gonzalez</li>
          <li>Colin Palmer</li>
          <li>Craig Hanis</li>
          <li>Dan Roden</li>
          <li>Dan Turner</li>
          <li>Dana Dabelea</li>
          <li>Daniel Chasman</li>
          <li>Danish Saleheen</li>
          <li>David Altshuler</li>
          <li>David Goldstein</li>
          <li>Dawood Darbar</li>
          <li>Dermot McGovern</li>
          <li>Diego Ardissino</li>
          <li>Donald Bowden</li>
          <li>Dost Ongur</li>
          <li>Emelia J. Benjamin</li>
          <li>Erkki Vartiainen</li>
          <li>Erwin Bottinger</li>
          <li>Gad Getz</li>
          <li>George Kirov</li>
          <li>Gil Atzmon</li>
          <li>Harlan M. Krumholz</li>
          <li>Harry Sokol</li>
          <li>Heribert Schunkert</li>
          <li>Hilkka Soininen</li>
          <li>Hugh Watkins</li>
          <li>Jaakko Kaprio</li>
          <li>Jaana Suvisaari</li>
          <li>James Meigs</li>
          <li>James Ware</li>
          <li>James Wilson</li>
          <li>Jaspal Kooner</li>
          <li>Jaume Marrugat</li>
          <li>Jeanette Erdmann</li>
          <li>Jeremiah Scharf</li>
          <li>John Barnard</li>
          <li>John Chambers</li>
          <li>John D. Rioux</li>
          <li>Jose Florez</li>
          <li>Josée Dupuis</li>
          <li>Judy Cho</li>
          <li>Juliana Chan</li>
          <li>Kari Mattila</li>
          <li>Kyong Soo Park</li>
          <li>Laurent Beaugerie</li>
          <li>Leif Groop</li>
          <li>Lorena Orozco</li>
          <li>Lori Bonnycastle</li>
          <li>Maija Wessman</li>
          <li>Mark Daly</li>
          <li>Mark McCarthy</li>
          <li>Markku Laakso</li>
          <li>Martti Färkkilä</li>
          <li>Matthew Bown</li>
          <li>Matthew Harms</li>
          <li>Matti Holi</li>
          <li>Michael Boehnke</li>
          <li>Michael O&apos;Donovan</li>
          <li>Michael Owen</li>
          <li>Mikko Hiltunen</li>
          <li>Mikko Kallela</li>
          <li>Mina Chung</li>
          <li>Ming Tsuang</li>
          <li>Moore Shoemaker</li>
          <li>Nazneen Rahman</li>
          <li>Nilesh Samani</li>
          <li>Olle Melander</li>
          <li>Pamela Sklar</li>
          <li>Patrick T. Ellinor</li>
          <li>Patrick Sullivan</li>
          <li>Peter Nilsson</li>
          <li>Ramnik Xavier</li>
          <li>Ravindranath Duggirala</li>
          <li>Rinse Weersma</li>
          <li>Roberto Elosua</li>
          <li>Ronald Ma</li>
          <li>Ruth Loos</li>
          <li>Ruth McPherson</li>
          <li>Samuli Ripatti</li>
          <li>Sekar Kathiresan</li>
          <li>Seppo Koskinen</li>
          <li>Soo Heon Kwak</li>
          <li>Stephen Glatt</li>
          <li>Steve McCarroll</li>
          <li>Steven A. Lubitz</li>
          <li>Subra Kugathasan</li>
          <li>Tai Shyong</li>
          <li>Tariq Ahmad</li>
          <li>Teresa Tusie Luna</li>
          <li>Terho Lehtimäki</li>
          <li>Tim Spector</li>
          <li>Tõnu Esko</li>
          <li>Tuomi Tiinamaija</li>
          <li>Veikko Salomaa</li>
          <li>Yik Ying Teo</li>
          <li>Young Jin Kim</li>
        </PrincipalInvestigatorList>
      </CreditsSection>
      <CreditsSection width="30%">
        <h3 id="contributing-projects">Contributing projects</h3>
        <ContributorList aria-labelledby="contributing-projects">
          <li>1000 Genomes</li>
          <li>1958 Birth Cohort</li>
          <li>ALSGEN</li>
          <li>Alzheimer&apos;s Disease Sequencing Project (ADSP)</li>
          <li>Atrial Fibrillation Genetics Consortium (AFGen)</li>
          <li>Estonian Genome Center, University of Tartu (EGCUT)</li>
          <li>Bulgarian Trios</li>
          <li>Finland-United States Investigation of NIDDM Genetics (FUSION)</li>
          <li>Finnish Twin Cohort Study</li>
          <li>FINN-ADGEN</li>
          <li>FINRISK</li>
          <li>Framingham Heart Study</li>
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
          <li>Kuopio Alzheimer Study</li>
          <li>LifeLines Cohort</li>
          <li>MESTA</li>
          <li>METabolic Syndrome In Men (METSIM)</li>
          <li>Finnish Migraine Study</li>
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
          <li>NHLBI-GO Exome Sequencing Project (ESP)</li>
          <li>NHLBI TOPMed</li>
          <li>Program for Neuropsychiatric Research, McLean Psychotic Disorders Division</li>
          <li>Schizophrenia Trios from Taiwan</li>
          <li>Sequencing Initiative Suomi (SiSu)</li>
          <li>SIGMA-T2D</li>
          <li>Swedish Schizophrenia &#x26; Bipolar Studies</li>
          <li>
            T2D-GENES
            <ul>
              <li>GoDARTS</li>
            </ul>
          </li>
          <li>T2D-SEARCH</li>
          <li>The Cancer Genome Atlas (TCGA)</li>
        </ContributorList>
      </CreditsSection>
      <CreditsSection width="18%">
        <h3 id="production-team">Production team</h3>
        <ContributorList aria-labelledby="production-team">
          <li>Eric Banks</li>
          <li>Charlotte Tolonen</li>
          <li>Christopher Llanwarne</li>
          <li>David Roazen</li>
          <li>Diane Kaplan</li>
          <li>Gordon Wade</li>
          <li>Jeff Gentry</li>
          <li>Jonn Smith</li>
          <li>Jose Soto</li>
          <li>Kathleen Tibbetts</li>
          <li>Kristian Cibulskis</li>
          <li>Laura Gauthier</li>
          <li>Louis Bergelson</li>
          <li>Miguel Covarrubias</li>
          <li>Nikelle Petrillo</li>
          <li>Ruchi Munshi</li>
          <li>Sam Novod</li>
          <li>Thibault Jeandet</li>
          <li>Valentin Ruano-Rubio</li>
          <li>Yossi Farjoun</li>
        </ContributorList>
        <h3 id="analysis-team">Analysis team</h3>
        <ContributorList aria-labelledby="analysis-team">
          <li>Konrad Karczewski</li>
          <li>Laurent Francioli</li>
          <li>Grace Tiao</li>
          <li>Kristen Laricchia</li>
          <li>Anne O&apos;Donnell-Luria</li>
          <li>Arcturus Wang</li>
          <li>Ben Neale</li>
          <li>Beryl Cummings</li>
          <li>Chris Vittal</li>
          <li>Cotton Seed</li>
          <li>Eric Minikel</li>
          <li>Irina Armean</li>
          <li>James Ware</li>
          <li>Kaitlin Samocha</li>
          <li>Mark Daly</li>
          <li>Nicola Whiffin</li>
          <li>Qingbo Wang</li>
          <li>Ryan Collins</li>
          <li>Tim Poterba</li>
        </ContributorList>
        <h3 id="sv-team">Structural Variation team</h3>
        <ContributorList aria-labelledby="sv-team">
          <li>Ryan Collins</li>
          <li>Harrison Brand</li>
          <li>Konrad Karczewski</li>
          <li>Laurent Francioli</li>
          <li>Nick Watts</li>
          <li>Matthew Solomonson</li>
          <li>Xuefang Zhao</li>
          <li>Laura Gauthier</li>
          <li>Harold Wang</li>
          <li>Chelsea Lowther</li>
          <li>Mark Walker</li>
          <li>Christopher Whelan</li>
          <li>Ted Brookings</li>
          <li>Ted Sharpe</li>
          <li>Jack Fu</li>
          <li>Eric Banks</li>
          <li>Michael Talkowski</li>
        </ContributorList>
      </CreditsSection>
      <CreditsSection width="18%">
        <h3 id="coordination">Coordination</h3>
        <ContributorList aria-labelledby="coordination">
          <li>Jessica Alföldi</li>
        </ContributorList>
        <h3 id="website-team">Website team</h3>
        <ContributorList aria-labelledby="website-team">
          <li>Matthew Solomonson</li>
          <li>Nick Watts</li>
          <li>Ben Weisburd</li>
          <li>Konrad Karczewski</li>
        </ContributorList>
        <h3 id="ethics-team">Ethics team</h3>
        <ContributorList aria-labelledby="ethics-team">
          <li>Andrea Saltzman</li>
          <li>Molly Schleicher</li>
          <li>Namrata Gupta</li>
          <li>Stacey Donnelly</li>
        </ContributorList>
        <h3 id="broad-genomics-platform">Broad Genomics Platform</h3>
        <ContributorList aria-labelledby="broad-genomics-platform">
          <li>Stacey Gabriel</li>
          <li>Kristen Connolly</li>
          <li>Steven Ferriera</li>
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
            (PI: Phillipakis)
          </li>
          <li>
            NIMH R56 MH115957
            <br />
            (PI: Talkowski)
          </li>
        </FundingSourceList>
        <p>
          The vast majority of the data storage, computing resources, and human effort used to
          generate this call set were donated by the Broad Institute
        </p>
        <p>
          We thank Jerome Rotter, Steven Rich, and the Multi-Ethnic Study of Atherosclerosis (MESA)
          for the use of their structural variant data
        </p>
      </CreditsSection>
    </Credits>
  </InfoPage>
)
