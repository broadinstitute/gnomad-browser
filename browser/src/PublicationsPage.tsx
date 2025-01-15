import React from 'react'
import styled from 'styled-components'
import { ExternalLink, List, ListItem, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'

const Citation = styled.cite`
  font-style: normal;
  line-height: 1.4;
`

type PaperCitationProps = {
  prefix?: string
  authorList: string
  title: string
  journal: string
  issue?: string
  pages?: string
  year: string
  doiLink?: string
  citationDownloadLink?: string
  pmid?: string
  pmcid?: string
}

const PaperCitation = ({
  prefix,
  authorList,
  title,
  journal,
  issue,
  pages,
  year,
  doiLink,
  citationDownloadLink,
  pmid,
  pmcid,
}: PaperCitationProps) => {
  return (
    // @ts-expect-error
    <ListItem>
      <Citation>
        {prefix && (
          <>
            <b>{prefix}</b>:{' '}
          </>
        )}
        <>{`${authorList} ${title} `}</>
        <em>{journal}</em>
        <>{`. ${issue ? `${issue}, ` : ''}${pages || ''} (${year}).`}</>
        <>
          {doiLink && (
            <span>
              {/* @ts-expect-error */}
              <ExternalLink href={doiLink}> {doiLink}</ExternalLink>{' '}
            </span>
          )}
          {pmid && <>PMID: {pmid}</>}
          {pmcid && <span> PMCID: {pmcid}</span>}
        </>
        {citationDownloadLink && (
          <div>
            {/* @ts-expect-error */}
            <ExternalLink href={citationDownloadLink}>Download citation</ExternalLink>{' '}
          </div>
        )}
      </Citation>
    </ListItem>
  )
}

export default () => (
  <InfoPage>
    <DocumentTitle title="Publications" />
    <PageHeading>Publications</PageHeading>
    <p>This page lists publications from the gnomAD group.</p>
    <p>
      If you want to cite gnomAD in a publication, please use the current flagship paper (except if
      referring to a previous version; see below). If you build online resources that include the
      data set, we ask that you provide links to the browser from the resource where relevant.
    </p>
    <p>
      There is no need to include us as authors on your manuscript, unless we contributed specific
      advice or analysis for your work.
    </p>
    <p>
      Current flagship paper (<b>v3</b>):
      {/* @ts-expect-error */}
      <List>
        <PaperCitation
          authorList="Chen, S.*, Francioli, L. C.*, Goodrich, J. K., Collins, R. L., Kanai, M., Wang, Q.,
              Alföldi, J., Watts, N. A., Vittal, C., Gauthier, L. D., Poterba, T., Wilson, M. W.,
              Tarasova, Y., Phu, W., Grant, R., Yohannes, M. T., Koenig, Z., Farjoun, Y., Banks, E.,
              Donnelly, S., Gabriel, S., Gupta, N., Ferriera, S., Tolonen, C., Novod, S., Bergelson,
              L., Roazen, D., Ruano-Rubio, V., Covarrubias, M., Llanwarne, C., Petrillo, N., Wade, G.,
              Jeandet, T., Munshi, R., Tibbetts, K., Genome Aggregation Database (gnomAD) Consortium,
              O’Donnell-Luria, A., Solomonson, M., Seed, C., Martin, A. R., Talkowski, M. E., Rehm, H.
              L., Daly, M. J., Tiao, G., Neale, B. M.†, MacArthur, D. G.† & Karczewski, K. J."
          title="A genomic mutational constraint map using variation in 76,156 human genomes."
          journal="Nature"
          issue="625"
          pages="92-100"
          year="2024"
          doiLink="https://doi.org/10.1038/s41586-023-06045-0"
          citationDownloadLink="https://citation-needed.springer.com/v2/references/10.1038/s41586-023-06045-0?format=refman&flavour=citation"
          pmid="38057664"
        />
        * contributed equally
        <br />† contributed equally
      </List>
    </p>{' '}
    <p>
      Previous flagship papers:
      {/* @ts-expect-error */}
      <List>
        <PaperCitation
          prefix="v2"
          authorList="Karczewski, K. J., Francioli, L. C., Tiao, G., Cummings, B. B., Alföldi, J., Wang, Q.,
              Collins, R. L., Laricchia, K. M., Ganna, A., Birnbaum, D. P., Gauthier, L. D., Brand,
              H., Solomonson, M., Watts, N. A., Rhodes, D., Singer-Berk, M., England, E. M., Seaby, E.
              G., Kosmicki, J. A., … MacArthur, D. G."
          title="The mutational constraint spectrum quantified
              from variation in 141,456 humans."
          journal="Nature"
          issue="581"
          pages="434-443"
          year="2020"
          doiLink="https://doi.org/10.1038/s41586-020-2308-7"
          citationDownloadLink="https://citation-needed.springer.com/v2/references/10.1038/s41586-020-2308-7?format=refman&flavour=citation"
          pmid="32461654"
        />
        <PaperCitation
          prefix="ExAC"
          authorList="Lek, M., Karczewski, K. J.*, Minikel, E. V.*, Samocha, K. E.*, Banks, E., Fennell, T.,
              O’Donnell-Luria, A. H., Ware, J. S., Hill, A. J., Cummings, B. B., Tukiainen, T.,
              Birnbaum, D. P., Kosmicki, J. A., Duncan, L. E., Estrada, K., Zhao, F., Zou, J.,
              Pierce-Hoffman, E., … Daly, M. J., MacArthur, D. G. & Exome Aggregation Consortium."
          title="Analysis of protein-coding genetic variation in 60,706 humans"
          journal="Nature"
          issue="536"
          pages="285-291"
          year="2016"
          doiLink="https://doi.org/10.1038/nature19057"
          citationDownloadLink="https://citation-needed.springer.com/v2/references/10.1038/nature19057?format=refman&flavour=citation"
          pmid="27535533"
        />
        * contributed equally
      </List>
    </p>
    <p>
      Remaining publications:
      {/* @ts-expect-error */}
      <List>
        <PaperCitation
          authorList="Poterba, T., Vittal, C., King, D., Goldstein, D., Goldstein, J. I., Schultz, P., Karczewski, K. J., Seed, C., Neale, B. M."
          title="The Scalable Variant Call Representation: Enabling Genetic Analysis Beyond One Million Genomes."
          journal="Bioinformatics"
          year="2024"
          doiLink="https://doi.org/10.1093/bioinformatics/btae746"
          pmid="39718771"
        />
        <PaperCitation
          authorList="Gudmundsson, S., Carlston, C. M., O'Donnell-Luria, A."
          title="Interpreting variants in genes affected by clonal hematopoiesis in population data."
          journal="Human Genetics"
          issue="143"
          pages="545-549"
          year="2024"
          doiLink="https://doi.org/10.1007/s00439-023-02526-4"
          pmid="36739343"
          pmcid="PMC10400727"
        />
        <PaperCitation
          authorList="Fowler, D. M., Rehm, H. L."
          title="Will variants of uncertain significance still exist in 2030?"
          journal="American Journal of Human Genetics"
          issue="111"
          pages="5-10"
          year="2024"
          doiLink="https://doi.org/10.1016/j.ajhg.2023.11.005"
          pmid="38086381"
          pmcid="PMC10806733"
        />
        <PaperCitation
          authorList="Guo, M. H.*, Francioli, L. C.*, Stenton, S. L., Goodrich, J. K., Watts, N. A.,
            Singer-Berk, M., Groopman, E., Darnowsky, P. W., Solomonson, M., Baxter, S., gnomAD
            Project Consortium, Tiao, G., Neale, B. M., Hirschhorn, J. N., Rehm, H., Daly, M. J.,
            O’Donnell-Luria, A., Karczewski, K., MacArthur, D. G., Samocha, K. E."
          title="Inferring compound
            heterozygosity from large-scale exome sequencing data."
          journal="Nature Genetics"
          issue="56"
          pages="152-161"
          year="2024"
          doiLink="https://doi.org/10.1038/s41588-023-01608-3"
          pmid="38057443"
          pmcid="PMC10872287"
        />
        <PaperCitation
          authorList="Lu, W., Gauthier, L. D., Poterba, T., Giacopuzzi, E., Goodrich, J. K., Stevens, C. R., King, D., Daly, M. J., Neale, B. M., Karczewski, K. J."
          title="CHARR efficiently estimates contamination from DNA sequencing data."
          journal="American Journal of Human Genetics"
          issue="110"
          pages="2068-2076"
          year="2023"
          doiLink="https://doi.org/10.1016/j.ajhg.2023.10.011"
          pmid="38000370"
          pmcid="PMC10716339"
        />
        <PaperCitation
          authorList="Singer-Berk, M.*, Gudmundsson, S.*, Baxter, S., Seaby, E. G., England, E., Wood, J. C., Son, R. G., Watts, N. A., Karczewski, K. J., Harrison, S. M., MacArthur, D. G., Rehm, H. L., O'Donnell-Luria, A."
          title="Advanced variant classification framework reduces the false positive rate of predicted loss-of-function variants in population sequencing data."
          journal="American Journal of Human Genetics"
          issue="110"
          pages="1496-1508"
          year="2023"
          doiLink="https://doi.org/10.1016/j.ajhg.2023.08.005"
          pmid="37633279"
          pmcid="PMC10502856"
        />
        <PaperCitation
          authorList="Babadi, M.*, Fu, J. M.*, Lee, S. K.*, Smirnov, A. N.*, Gauthier, L. D., Walker, M., Benjamin, D. I., Zhao, X., Karczewski, K. J., Wong, I., Collins, R. L., Sanchis-Juan, A., Brand, H., Banks, E., Talkowski, M. E."
          title="GATK-gCNV enables the discovery of rare copy number variants from exome sequencing data."
          journal="Nature Genetics"
          issue="55"
          pages="1589-1597"
          year="2023"
          doiLink="https://doi.org/10.1038/s41588-023-01449-0"
          pmid="37604963"
          pmcid="PMC10904014"
        />
        <PaperCitation
          authorList="Karczewski, K. J., Gauthier, L. D., & Daly, M. J."
          title="Technical artifact drives apparent
            deviation from Hardy-Weinberg equilibrium at CCR5-∆32 and other variants in gnomAD."
          journal="bioRxiv"
          year="p. 784157"
          doiLink="https://doi.org/10.1101/784157"
          pmid=""
          pmcid=""
        />
        <PaperCitation
          authorList="Atkinson, E. G.*, Artomov, M.*, Loboda, A. A., Rehm, H. L., MacArthur, D. G., Karczewski, K. J., Neale, B. M.†, Daly, M. J.†."
          title="Discordant calls across genotype discovery approaches elucidate variants with systematic errors."
          journal="Genome Research"
          issue="33"
          pages="999-1005"
          year="2023"
          doiLink="https://doi.org/10.1101/gr.277908.123"
          pmid="37253541"
          pmcid="PMC10519400"
        />
        <PaperCitation
          authorList="Seaby, E. G., Thomas, N. S., Webb, A., Brittain, H., Taylor Tavares, A. L.; Genomics England Consortium; Baralle, D., Rehm, H. L., O'Donnell-Luria, A.†, Ennis, S.†."
          title="Targeting de novo loss-of-function variants in constrained disease genes improves diagnostic rates in the 100,000 Genomes Project."
          journal="Human Genetics"
          issue="142"
          pages="351-362"
          year="2023"
          doiLink="https://doi.org/10.1007/s00439-022-02509-x"
          pmid="36477409"
          pmcid="PMC9950176"
        />
        <PaperCitation
          authorList="Pejaver, V. Byrne, A. B., Feng, B. J., Pagel, K. A., Mooney, S. D., Karchin, R., O'Donnell-Luria, A., Harrison, S. M., Tavtigian, S. V., Greenblatt, M. S., Biesecker, L. G., Radivojac, P., Brenner, S. E."
          title="ClinGen Sequence Variant Interpretation Working Group. Calibration of computational tools for missense variant pathogenicity classification and ClinGen recommendations for PP3/BP4 criteria."
          journal="American Journal of Human Genetics"
          issue="109"
          pages="2163-2177"
          year="2022"
          doiLink="https://doi.org/10.1016/j.ajhg.2022.10.013"
          pmid="36413997"
          pmcid="PMC9748256"
        />
        <PaperCitation
          authorList="Seaby, E.G., Smedley, D., Taylor Tavares, A. L., Brittain, H., van Jaarsveld, R. H., Baralle, D., Rehm, H. L., O'Donnell-Luria, A., Ennis, S."
          title="Genomics England Research Consortium. A gene-to-patient approach uplifts novel disease gene discovery and identifies 18 putative novel disease genes."
          journal="Genetics Medicine"
          issue="24"
          pages="1697-1707"
          year="2022"
          doiLink="https://doi.org/10.1016/j.gim.2022.04.019"
          pmid="35532742"
        />
        <PaperCitation
          authorList="Laricchia, K. M.*, Lake, N. J.*, Watts, N. A., Shand, M., Haessly, A., Gauthier, L. D.,
            Benjamin, D., Banks, E., Soto, J., Garimella, K., Emery, J., Genome Aggregation Database
            (gnomAD) Consortium, Rehm, H. L., MacArthur, D. G., Tiao, G.†, Lek, M.†, Mootha, V. K.†,
            Calvo, S. E.†"
          title="Mitochondrial DNA variation across 56,434 individuals in gnomAD."
          journal="Genome Research"
          issue="32"
          pages="569-582"
          year="2022"
          doiLink="https://doi.org/10.1101/gr.276013.121"
          pmid="35074858"
        />
        <PaperCitation
          authorList="Gudmundsson, S., Singer-Berk, M., Watts, N. A., Phu, W., Goodrich, J. K., Solomonson,
            M., Genome Aggregation Database (gnomAD) Consortium, Rehm, H. L., MacArthur, D. G.,
            O’Donnell-Luria, A."
          title="Variant interpretation using population databases: Lessons from
            gnomAD."
          journal="Human Mutation"
          issue="43"
          pages="1012-1030"
          year="2022"
          doiLink="https://doi.org/10.1002/humu.24309"
          pmid="34859531"
        />
        <PaperCitation
          authorList="Whiffin, N., Karczewski, K. J., Zhang, X., Chothani, S., Smith, M. J., Gareth Evans, D.,
            Roberts, A. M., Quaife, N. M., Schafer, S., Rackham, O., Alföldi, J., O’Donnell-Luria,
            A. H., Francioli, L. C., Genome Aggregation Database (gnomAD) Production Team, Genome
            Aggregation Database (gnomAD) Consortium, Cook, S. A., Barton, P. J. R., MacArthur, D.
            G.†, & Ware, J. S.†"
          title="Characterising the loss-of-function impact of 5’ untranslated region
            variants in 15,708 individuals."
          journal="Nature Communications"
          issue="11"
          pages="2523"
          year="2020"
          doiLink="https://doi.org/10.1038/s41467-019-10717-9"
          pmid="32461616"
        />
        <PaperCitation
          authorList="Whiffin, N.*, Armean, I. M.*, Kleinman, A.*, Marshall, J. L., Minikel, E. V., Goodrich,
            J. K., Quaife, N. M., Cole, J. B., Wang, Q., Karczewski, K. J., Cummings, B. B.,
            Francioli, L., Laricchia, K., Guan, A., Alipanahi, B., Morrison, P., Baptista, M. A. S.,
            Merchant, K. M., Genome Aggregation Database Production Team, … Cannon, P.†, MacArthur,
            D. G.†"
          title="The effect of LRRK2 loss-of-function variants in humans."
          journal="Nature Medicine"
          issue="26"
          pages="869-877"
          year="2020"
          doiLink="https://doi.org/10.1038/s41591-020-0893-5"
          pmid="32461697"
        />
        <PaperCitation
          authorList="Wang, Q., Pierce-Hoffman, E., Cummings, B. B., Karczewski, K. J., Alföldi, J.,
            Francioli, L. C., Gauthier, L. D., Hill, A. J., O’Donnell-Luria, A. H., Genome
            Aggregation Database (gnomAD) Production Team, Genome Aggregation Database (gnomAD)
            Consortium, & MacArthur, D. G."
          title="Landscape of multi-nucleotide variants in 125,748 human
            exomes and 15,708 genomes."
          journal="Nature Communications"
          issue="11"
          pages="2539"
          year="2020"
          doiLink="https://doi.org/10.1038/s41467-019-12438-5"
          pmid="32461613"
        />
        <PaperCitation
          authorList="Minikel, E. V., Karczewski, K. J., Martin, H. C., Cummings, B. B., Whiffin, N., Rhodes,
            D., Alföldi, J., Trembath, R. C., van Heel, D. A., Daly, M. J., Genome Aggregation
            Database Production Team, Genome Aggregation Database Consortium, Schreiber, S. L., &
            MacArthur, D. G."
          title="Evaluating potential drug targets through human loss-of-function
            genetic variation."
          journal="Nature"
          issue="581"
          pages="459-464"
          year="2020"
          doiLink="https://doi.org/10.1038/s41586-020-2267-z"
          pmid="32461653"
        />
        <PaperCitation
          authorList="Cummings, B. B., Karczewski, K. J., Kosmicki, J. A., Seaby, E. G., Watts, N. A.,
            Singer-Berk, M., Mudge, J. M., Karjalainen, J., Kyle Satterstrom, F., O’Donnell-Luria,
            A., Poterba, T., Seed, C., Solomonson, M., Alföldi, J., The Genome Aggregation Database
            Production Team, The Genome Aggregation Database Consortium, Daly, M. J., & MacArthur,
            D. G."
          title="Transcript expression-aware annotation improves rare variant interpretation."
          journal="Nature"
          issue="581"
          pages="452-458"
          year="2020"
          doiLink="https://doi.org/10.1038/s41586-020-2329-2"
          pmid="32461655"
        />
        <PaperCitation
          authorList="Collins, R. L.*, Brand, H.*, Karczewski, K. J., Zhao, X., Alföldi, J., Francioli, L. C.,
            Khera, A. V., Lowther, C., Gauthier, L. D., Wang, H., Watts, N. A., Solomonson, M.,
            O’Donnell-Luria, A., Baumann, A., Munshi, R., Walker, M., Whelan, C., Huang, Y.,
            Brookings, T., … Talkowski, M. E."
          title="A structural variation reference for medical and
            population genetics."
          journal="Nature"
          issue="581"
          pages="444-451"
          year="2020"
          doiLink="https://doi.org/10.1038/s41586-020-2287-8"
          pmid="32461652"
        />
        <PaperCitation
          authorList="Karczewski, K. J., Weisburd, B., Thomas, B., Solomonson, M., Ruderfer, D. M., Kavanagh,
            D., Hamamsy, T., Lek, M., Samocha, K. E., Cummings, B. B., Birnbaum, D., The Exome
            Aggregation Consortium, Daly, M. J., MacArthur, D. G."
          title="The ExAC browser: displaying
            reference data information from over 60000 exomes."
          journal="Nucleic Acids Research"
          issue="Volume 45, Issue D1"
          pages="D840-D845"
          year="2017"
          doiLink="https://doi.org/10.1093/nar/gkw971"
          pmid="27899611"
          pmcid="PMC5210650"
        />
        * contributed equally
        <br />† contributed equally
      </List>
    </p>
  </InfoPage>
)
