import React from 'react'
import styled from 'styled-components'
import { ExternalLink, PageHeading } from '@broad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

const Credits = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 13px;

  h4 {
    margin-bottom: 10px;
    font-size: 18px;
  }

  ul {
    list-style: none;
    padding-left: 0;

    li {
      p {
        padding-left: 0;
        margin-top: 0;
        margin-bottom: 0;
      }

      ul {
        margin-left: 20px;
      }
    }
  }

  p {
    margin-top: 0;
    margin-bottom: 0;
  }

  @media (max-width: 993px) {
    display: flex;
    flex-direction: column;
    font-size: 16px;
  }
`

const CreditsSection = styled.div`
  min-width: ${({ isWider }) => (isWider ? '25%' : '18%')};

  @media (max-width: 993px) {
    max-width: 80%;
    ${({ noPaddingOnMobile }) =>
      noPaddingOnMobile
        ? `
        h4 {
          margin-top: 0;
          margin-bottom: 0;
          font-size: 0
        }

        ul {
          margin-top: 0;
          margin-bottom: 0;
        }
      `
        : ''}

    ${({ noBottomUlPaddingOnMobile }) =>
      noBottomUlPaddingOnMobile ? 'ul { margin-bottom: 0 }' : ''};
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
      The short variant data set provided on this website spans 125,748 exomes and 15,708 genomes from unrelated
      individuals sequenced as part of various disease-specific and population genetic studies,
      totalling 141,456 individuals.{' '}
      <ExternalLink href="https://macarthurlab.org/2018/10/17/gnomad-v2-1/">
        This blog post
      </ExternalLink>{' '}
      describes the latest release. We have removed individuals known to be affected by severe
      pediatric disease, as well as their first-degree relatives, so this data set should serve as a
      useful reference set of allele frequencies for severe pediatric disease studies - however, note that
      some individuals with severe disease may still be included in the data set, albeit likely at a
      frequency equivalent to or lower than that seen in the general population.
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
     unrelated individuals sequenced as part of various disease-specific and population genetic studies.
     It mostly, but not entirely overlaps with the genome set used for the gnomAD short variant release.
     This {' '}
      <ExternalLink href="https://macarthurlab.org/2019/03/20/structural-variants-in-gnomad/">
        blog post
      </ExternalLink>{' '} describes the SV release. As with the gnomAD short variant data set, we have removed
     individuals known to be affected by severe pediatric disease, as well as their first-degree relatives,
      so this data set should serve as a useful reference set of allele frequencies for severe pediatric disease studies
      - however, note that some individuals with severe disease may still be included in the data set, albeit likely
      at a frequency equivalent to or lower than that seen in the general population.
    </p>
    <p>
    All of the raw data from these projects have been reprocessed through the same pipeline, and jointly variant-called to
    increase consistency across projects.In brief, we aggregated Illumina short-read WGS from population genetic and complex
    disease-association studies. We discovered SVs by integrating four published SV algorithms ({' '}
      <ExternalLink href="https://www.ncbi.nlm.nih.gov/pubmed/26647377">
        Manta
      </ExternalLink>{' '}, {' '}
      <ExternalLink href="https://www.ncbi.nlm.nih.gov/pubmed/22962449">
        DELLY
      </ExternalLink>{' '}, {' '}
      <ExternalLink href="https://www.ncbi.nlm.nih.gov/pubmed/28855259">
        MELT
      </ExternalLink>{' '}, and {' '}
      <ExternalLink href="https://www.ncbi.nlm.nih.gov/pubmed/22302147">
        cn.MOPS
      </ExternalLink>{' '})
    to identify SVs across seven mutational classes, and jointly filtered, genotyped, resolved, and annotated these SVs across
    all genomes. All SV discovery was performed in {' '}
      <ExternalLink href="https://software.broadinstitute.org/firecloud/">
        FireCloud
      </ExternalLink>{' '} using the {' '}
      <ExternalLink href="https://software.broadinstitute.org/wdl/">
        Workflow Description Language (WDL)
      </ExternalLink>{' '} and the {' '}
      <ExternalLink href="https://cromwell.readthedocs.io/en/stable/">
        Cromwell Execution Engine
      </ExternalLink>{' '}, where the components of the gnomAD SV discovery pipeline are available as public methods with dedicated
    Docker images. Extensive technical details of this process are provided in the supplementary information of the {' '}
      <ExternalLink href="https://broad.io/gnomad_sv">
        gnomAD SV preprint
      </ExternalLink>{' '}; please cite this preprint for use of the SV data.
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
      <ExternalLink href="https://github.com/macarthur-lab/gnomadjs/issues">Github</ExternalLink>.
    </p>
    <Credits>
      <CreditsSection noBottomUlPaddingOnMobile>
        <h4 id="principal-investigators">Principal Investigators</h4>
        <ul>
          <li>
            <p>Daniel MacArthur</p>
          </li>
          <li>
            <p>Aarno Palotie</p>
          </li>
          <li>
            <p>Andres Metspalu</p>
          </li>
          <li>
            <p>Anne Remes</p>
          </li>
          <li>
            <p>Adolfo Correa</p>
          </li>
          <li>
            <p>Andre Franke</p>
          </li>
          <li>
            <p>Ann Pulver</p>
          </li>
          <li>
            <p>Ben Glaser</p>
          </li>
          <li>
            <p>Ben Neale</p>
          </li>
          <li>
            <p>Bong-Jo Kim</p>
          </li>
          <li>
            <p>Bruce Cohen</p>
          </li>
          <li>
            <p>Carlos Pato</p>
          </li>
          <li>
            <p>Carlos A Aguilar Salinas</p>
          </li>
          <li>
            <p>Christina Hultman</p>
          </li>
          <li>
            <p>Christine M. Albert</p>
          </li>
          <li>
            <p>Christopher Haiman</p>
          </li>
          <li>
            <p>Clicerio Gonzalez</p>
          </li>
          <li>
            <p>Colin Palmer</p>
          </li>
          <li>
            <p>Craig Hanis</p>
          </li>
          <li>
            <p>Dan Roden</p>
          </li>
          <li>
            <p>Dan Turner</p>
          </li>
          <li>
            <p>Dana Dabelea</p>
          </li>
          <li>
            <p>Daniel Chasman</p>
          </li>
          <li>
            <p>Danish Saleheen</p>
          </li>
          <li>
            <p>David Altshuler</p>
          </li>
          <li>
            <p>David Goldstein</p>
          </li>
          <li>
            <p>Dawood Darbar</p>
          </li>
          <li>
            <p>Dermot McGovern</p>
          </li>
          <li>
            <p>Diego Ardissino</p>
          </li>
          <li>
            <p>Donald Bowden</p>
          </li>
          <li>
            <p>Dost Ongur</p>
          </li>
          <li>
            <p>Emelia J. Benjamin</p>
          </li>
          <li>
            <p>Erkki Vartiainen</p>
          </li>
          <li>
            <p>Erwin Bottinger</p>
          </li>
          <li>
            <p>Gad Getz</p>
          </li>
          <li>
            <p>George Kirov</p>
          </li>
          <li>
            <p>Gil Atzmon</p>
          </li>
          <li>
            <p>Harlan M. Krumholz</p>
          </li>
          <li>
            <p>Harry Sokol</p>
          </li>
          <li>
            <p>Heribert Schunkert</p>
          </li>
          <li>
            <p>Hilkka Soininen</p>
          </li>
          <li>
            <p>Hugh Watkins</p>
          </li>
          <li>
            <p>Jaakko Kaprio</p>
          </li>
          <li>
            <p>Jaana Suvisaari</p>
          </li>
          <li>
            <p>James Meigs</p>
          </li>
          <li>
            <p>James Ware</p>
          </li>
          <li>
            <p>James Wilson</p>
          </li>
          <li>
            <p>Jaspal Kooner</p>
          </li>
          <li>
            <p>Jaume Marrugat</p>
          </li>
          <li>
            <p>Jeanette Erdmann</p>
          </li>
          <li>
            <p>Jeremiah Scharf</p>
          </li>
          <li>
            <p>John Barnard</p>
          </li>
          <li>
            <p>John Chambers</p>
          </li>
          <li>
            <p>John D. Rioux</p>
          </li>
          <li>
            <p>Jose Florez</p>
          </li>
          <li>
            <p>Josée Dupuis</p>
          </li>
          <li>
            <p>Judy Cho</p>
          </li>
        </ul>
      </CreditsSection>
      <CreditsSection noPaddingOnMobile>
        <h4 id="principal-investigators">&nbsp;</h4>
        <ul>
          <li>
            <p>Juliana Chan</p>
          </li>
          <li>
            <p>Kari Mattila</p>
          </li>
          <li>
            <p>Kyong Soo Park</p>
          </li>
          <li>
            <p>Laurent Beaugerie</p>
          </li>
          <li>
            <p>Leif Groop</p>
          </li>
          <li>
            <p>Lorena Orozco</p>
          </li>
          <li>
            <p>Lori Bonnycastle</p>
          </li>
          <li>
            <p>Maija Wessman</p>
          </li>
          <li>
            <p>Mark Daly</p>
          </li>
          <li>
            <p>Mark McCarthy</p>
          </li>
          <li>
            <p>Markku Laakso</p>
          </li>
          <li>
            <p>Martti Färkkilä</p>
          </li>
          <li>
            <p>Matthew Bown</p>
          </li>
          <li>
            <p>Matthew Harms</p>
          </li>
          <li>
            <p>Matti Holi</p>
          </li>
          <li>
            <p>Michael Boehnke</p>
          </li>
          <li>
            <p>Michael O&apos;Donovan</p>
          </li>
          <li>
            <p>Michael Owen</p>
          </li>
          <li>
            <p>Mikko Hiltunen</p>
          </li>
          <li>
            <p>Mikko Kallela</p>
          </li>
          <li>
            <p>Mina Chung</p>
          </li>
          <li>
            <p>Ming Tsuang</p>
          </li>
          <li>
            <p>Moore Shoemaker</p>
          </li>
          <li>
            <p>Nazneen Rahman</p>
          </li>
          <li>
            <p>Nilesh Samani</p>
          </li>
          <li>
            <p>Olle Melander</p>
          </li>
          <li>
            <p>Pamela Sklar</p>
          </li>
          <li>
            <p>Patrick T. Ellinor</p>
          </li>
          <li>
            <p>Patrick Sullivan</p>
          </li>
          <li>
            <p>Peter Nilsson</p>
          </li>
          <li>
            <p>Ramnik Xavier</p>
          </li>
          <li>
            <p>Ravindranath Duggirala</p>
          </li>
          <li>
            <p>Rinse Weersma</p>
          </li>
          <li>
            <p>Roberto Elosua</p>
          </li>
          <li>
            <p>Ronald Ma</p>
          </li>
          <li>
            <p>Ruth Loos</p>
          </li>
          <li>
            <p>Ruth McPherson</p>
          </li>
          <li>
            <p>Samuli Ripatti</p>
          </li>
          <li>
            <p>Sekar Kathiresan</p>
          </li>
          <li>
            <p>Seppo Koskinen</p>
          </li>
          <li>
            <p>Soo Heon Kwak</p>
          </li>
          <li>
            <p>Stephen Glatt</p>
          </li>
          <li>
            <p>Steve McCarroll</p>
          </li>
          <li>
            <p>Steven A. Lubitz</p>
          </li>
          <li>
            <p>Subra Kugathasan</p>
          </li>
          <li>
            <p>Tai Shyong</p>
          </li>
          <li>
            <p>Tariq Ahmad</p>
          </li>
          <li>
            <p>Teresa Tusie Luna</p>
          </li>
          <li>
            <p>Terho Lehtimäki</p>
          </li>
          <li>
            <p>Tim Spector</p>
          </li>
          <li>
            <p>Tõnu Esko</p>
          </li>
          <li>
            <p>Tuomi Tiinamaija</p>
          </li>
          <li>
            <p>Veikko Salomaa</p>
          </li>
          <li>
            <p>Yik Ying Teo</p>
          </li>
          <li>
            <p>Young Jin Kim</p>
          </li>
        </ul>
      </CreditsSection>
      <CreditsSection isWider>
        <h4 id="contributing-projects">Contributing projects</h4>
        <ul>
          <li>
            <p>1000 Genomes</p>
          </li>
          <li>
            <p>1958 Birth Cohort</p>
          </li>
          <li>
            <p>ALSGEN</p>
          </li>
          <li>
            <p>Alzheimer&apos;s Disease Sequencing Project (ADSP)</p>
          </li>
          <li>
            <p>Atrial Fibrillation Genetics Consortium (AFGen)</p>
          </li>
          <li>
            <p>Estonian Genome Center, University of Tartu (EGCUT)</p>
          </li>
          <li>
            <p>Bulgarian Trios</p>
          </li>
          <li>
            <p>Finland-United States Investigation of NIDDM Genetics (FUSION)</p>
          </li>
          <li>
            <p>Finnish Twin Cohort Study</p>
          </li>
          <li>
            <p>FINN-ADGEN</p>
          </li>
          <li>
            <p>FINRISK</p>
          </li>
          <li>
            <p>Framingham Heart Study</p>
          </li>
          <li>
            <p>Génome Québec - Genizon Biobank</p>
          </li>
          <li>
            <p>Genomic Psychiatry Cohort</p>
          </li>
          <li>
            <p>GoT2D</p>
          </li>
          <li>
            <p>Genotype-Tissue Expression Project (GTEx)</p>
          </li>
          <li>
            <p>Health2000</p>
          </li>
          <li>
            <p>Inflammatory Bowel Disease:</p>
            <ul>
              <li>
              <p>1000IBD project</p>
              </li>
              <li>
              <p>Helsinki University Hospital Finland</p>
              </li>
              <li>
                <p>NIDDK IBD Genetics Consortium</p>
              </li>
              <li>
                <p>Quebec IBD Genetics Consortium</p>
              </li>
            </ul>
          </li>
          <li>
            <p>Jackson Heart Study</p>
          </li>
          <li>
            <p>Kuopio Alzheimer Study</p>
          </li>
          <li>
            <p>LifeLines Cohort</p>
          </li>
          <li>
            <p>MESTA</p>
          </li>
          <li>
            <p>METabolic Syndrome In Men (METSIM)</p>
          </li>
          <li>
            <p>Finnish Migraine Study</p>
          </li>
          <li>
            <p>Myocardial Infarction Genetics Consortium (MIGen):</p>
            <ul>
              <li>
                <p>Leicester Exome Seq</p>
              </li>
              <li>
                <p>North German MI Study</p>
              </li>
              <li>
                <p>Ottawa Genomics Heart Study</p>
              </li>
              <li>
                <p>Pakistan Risk of Myocardial Infarction Study (PROMIS)</p>
              </li>
              <li>
                <p>Precocious Coronary Artery Disease Study (PROCARDIS)</p>
              </li>
              <li>
                <p>Registre Gironi del COR (REGICOR)</p>
              </li>
              <li>
                <p>South German MI Study</p>
              </li>
              <li>
                <p>
                  Variation in Recovery: Role of Gender on Outcomes of Young AMI Patients (VIRGO)
                </p>
              </li>
            </ul>
          </li>
          <li>
            <p>National Institute of Mental Health (NIMH) Controls</p>
          </li>
          <li>
            <p>NHLBI-GO Exome Sequencing Project (ESP)</p>
          </li>
          <li>
            <p>NHLBI TOPMed</p>
          </li>
          <li>
            <p>Program for Neuropsychiatric Research, McLean Psychotic Disorders Division</p>
          </li>
          <li>
            <p>Schizophrenia Trios from Taiwan</p>
          </li>
          <li>
            <p>Sequencing Initiative Suomi (SiSu)</p>
          </li>
          <li>
            <p>SIGMA-T2D</p>
          </li>
          <li>
            <p>Swedish Schizophrenia &#x26; Bipolar Studies</p>
          </li>
          <li>
            <p>T2D-GENES</p>
            <ul>
              <li>GoDARTS</li>
            </ul>
          </li>
          <li>
            <p>T2D-SEARCH</p>
          </li>
          <li>
            <p>The Cancer Genome Atlas (TCGA)</p>
          </li>
        </ul>
      </CreditsSection>
      <CreditsSection>
        <h4 id="production-team">Production team</h4>
        <ul>
          <li>
            <p>Eric Banks</p>
          </li>
          <li>
            <p>Charlotte Tolonen</p>
          </li>
          <li>
            <p>Christopher Llanwarne</p>
          </li>
          <li>
            <p>David Roazen</p>
          </li>
          <li>
            <p>Diane Kaplan</p>
          </li>
          <li>
            <p>Gordon Wade</p>
          </li>
          <li>
            <p>Jeff Gentry</p>
          </li>
          <li>
            <p>Jose Soto</p>
          </li>
          <li>
            <p>Kathleen Tibbetts</p>
          </li>
          <li>
            <p>Kristian Cibulskis</p>
          </li>
          <li>
            <p>Laura Gauthier</p>
          </li>
          <li>
            <p>Louis Bergelson</p>
          </li>
          <li>
            <p>Miguel Covarrubias</p>
          </li>
          <li>
            <p>Nikelle Petrillo</p>
          </li>
          <li>
            <p>Ruchi Munshi</p>
          </li>
          <li>
            <p>Sam Novod</p>
          </li>
          <li>
            <p>Thibault Jeandet</p>
          </li>
          <li>
            <p>Valentin Ruano-Rubio</p>
          </li>
          <li>
            <p>Yossi Farjoun</p>
          </li>
        </ul>
        <h4 id="analysis-team">Analysis team</h4>
        <ul>
          <li>
            <p>Konrad Karczewski</p>
          </li>
          <li>
            <p>Laurent Francioli</p>
          </li>
          <li>
            <p>Grace Tiao</p>
          </li>
          <li>
            <p>Kristen Laricchia</p>
          </li>
          <li>
            <p>Anne O&apos;Donnell-Luria</p>
          </li>
          <li>
            <p>Arcturus Wang</p>
          </li>
          <li>
            <p>Ben Neale</p>
          </li>
          <li>
            <p>Beryl Cummings</p>
          </li>
          <li>
            <p>Chris Vittal</p>
          </li>
          <li>
            <p>Cotton Seed</p>
          </li>
          <li>
            <p>Eric Minikel</p>
          </li>
          <li>
            <p>Irina Armean</p>
          </li>
          <li>
            <p>James Ware</p>
          </li>
          <li>
            <p>Kaitlin Samocha</p>
          </li>
          <li>
            <p>Mark Daly</p>
          </li>
          <li>
            <p>Nicola Whiffin</p>
          </li>
          <li>
            <p>Qingbo Wang</p>
          </li>
          <li>
            <p>Ryan Collins</p>
          </li>
          <li>
            <p>Tim Poterba</p>
          </li>
        </ul>
<h4 id="sv-team">Structural Variation team</h4>
        <ul>
          <li>
            <p>Ryan Collins</p>
          </li>
          <li>
            <p>Harrison Brand</p>
          </li>
          <li>
            <p>Konrad Karczewski</p>
          </li>
          <li>
            <p>Laurent Francioli</p>
          </li>
          <li>
            <p>Nick Watts</p>
          </li>
          <li>
            <p>Matthew Solomonson</p>
          </li>
          <li>
            <p>Xuefang Zhao</p>
          </li>
          <li>
            <p>Laura Gauthier</p>
          </li>
          <li>
            <p>Harold Wang</p>
          </li>
          <li>
            <p>Chelsea Lowther</p>
          </li>
          <li>
            <p>Mark Walker</p>
          </li>
          <li>
            <p>Christopher Whelan</p>
          </li>
          <li>
            <p>Ted Brookings</p>
          </li>
          <li>
            <p>Ted Sharpe</p>
          </li>
          <li>
            <p>Jack Fu</p>
          </li>
          <li>
            <p>Eric Banks</p>
          </li>
          <li>
            <p>Michael Talkowski</p>
          </li>
        </ul>
      </CreditsSection>
      <CreditsSection>
        <h4 id="coordination">Coordination</h4>
        <ul>
          <li>
            <p>Jessica Alföldi</p>
          </li>
          <li>
        </ul>
        <h4 id="website-team">Website team</h4>
        <ul>
          <li>
            <p>Matthew Solomonson</p>
          </li>
          <li>
            <p>Nick Watts</p>
          </li>
          <li>
            <p>Ben Weisburd</p>
          </li>
          <li>
            <p>Konrad Karczewski</p>
          </li>
        </ul>
        <h4 id="ethics-team">Ethics team</h4>
        <ul>
          <li>
            <p>Andrea Saltzman</p>
          </li>
          <li>
            <p>Molly Schleicher</p>
          </li>
          <li>
            <p>Namrata Gupta</p>
          </li>
          <li>
            <p>Stacey Donnelly</p>
          </li>
        </ul>
        <h4 id="broad-genomics-platform">Broad Genomics Platform</h4>
        <ul>
          <li>
            <p>Stacey Gabriel</p>
          </li>
          <li>
            <p>Kristen Connolly</p>
          </li>
          <li>
            <p>Steven Ferriera</p>
          </li>
        </ul>
        <h4 id="funding">Funding</h4>
        <p>NIGMS R01 GM104371</p>
        <p>(PI: MacArthur)</p>
        <br />
        <p>NIDDK U54 DK105566</p>
        <p>(PIs: MacArthur and Neale)</p>
        <br />
        <p>NHGRI U24 HG010262</p>
        <p>(PI: Phillipakis)</p>
        <br />
        <p>NIMH R56 MH115957</p>
        <p>(PI: Talkowski)</p>
        <br />
        <p>The vast majority of the data storage, computing resources, and human effort used to
          generate this call set were donated by the Broad Institute</p>
        <br />
        <p>We thank Jerome Rotter, Steven Rich, and the Multi-Ethnic Study of Atherosclerosis (MESA)
          for the use of their structural variant data</p>
      </CreditsSection>
    </Credits>
  </InfoPage>
)
