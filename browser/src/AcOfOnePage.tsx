import React from 'react'
import styled from 'styled-components'
import { ExternalLink, ListItem, OrderedList, PageHeading } from '@gnomad/ui'
import { PaperCitation } from './PublicationsPage'

import exac_frequencies_bar_graph from '../about/acofone/exac_frequencies.png'
import gnomad_v4_frequencies_bar_graph from '../about/acofone/gnomad_v4_frequencies.png'
import gnomad_v4_sv_figures from '../about/acofone/gnomad_v4_sv_figures.png'

import acOfOnePartOne from '../about/acofone/ac-of-one-part-one.md'
import acOfOnePartTwo from '../about/acofone/ac-of-one-part-two.md'
import acOfOnePartThree from '../about/acofone/ac-of-one-part-three.md'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import MarkdownContent from './MarkdownContent'

const Centered = styled.div`
  display: flex;
  justify-content: space-around;

  @media (max-width: 992px) {
    display: block;
  }
`

const ResponsiveHalfWidthColumn = styled.div`
  width: 50%;

  @media (max-width: 992px) {
    width: 100%;
  }
`

const MarginTop = styled.div`
  margin-top: 6rem;
`

const AcOfOnePage = () => {
  return (
    <InfoPage>
      <DocumentTitle title="AC=1" />
      <PageHeading
        // @ts-expect-error
        id="ac-one"
      >
        Arguments Supporting Public Release of Low Frequency Allele Count Summary Statistics
      </PageHeading>

      <MarkdownContent dangerouslySetInnerHTML={{ __html: acOfOnePartOne.html }} />

      <Centered>
        <ResponsiveHalfWidthColumn>
          <MarginTop>
            <img
              src={exac_frequencies_bar_graph}
              alt="Bar graph of ExAC frequencies"
              width="400px"
            />
          </MarginTop>
        </ResponsiveHalfWidthColumn>

        <ResponsiveHalfWidthColumn>
          <img
            src={gnomad_v4_frequencies_bar_graph}
            alt="Bar graph of gnomAD v4 frequencies"
            width="400px"
          />
        </ResponsiveHalfWidthColumn>
      </Centered>

      <MarkdownContent dangerouslySetInnerHTML={{ __html: acOfOnePartTwo.html }} />

      <Centered>
        <img src={gnomad_v4_sv_figures} alt="image4" width="650px" />
      </Centered>

      <MarkdownContent dangerouslySetInnerHTML={{ __html: acOfOnePartThree.html }} />

      <h2>References</h2>
      {/* @ts-expect-error */}
      <OrderedList>
        <PaperCitation
          authorList="Lek, M., Karczewski, K., Minikel, E."
          etAl
          title="Analysis of protein-coding genetic variation in 60,706 humans."
          journal="Nature"
          issue="536"
          pages="285-291"
          year="2016"
          doiLink="https://doi.org/10.1038/nature19057"
        />

        <PaperCitation
          authorList="Collins, R. L., Brand, H., Karczewski, K. J."
          etAl
          title="A structural variation reference for medical and population genetics."
          journal="Nature"
          issue="581"
          pages="444-451"
          year="2020"
          doiLink="https://doi.org/10.1038/s41586-020-2287-8"
        />

        {/* @ts-expect-error */}
        <ListItem>
          <ExternalLink href="https://databrowser.researchallofus.org/snvsindels">
            https://databrowser.researchallofus.org/snvsindels
          </ExternalLink>
        </ListItem>

        {/* @ts-expect-error */}
        <ListItem>
          <ExternalLink href="https://genebass.org">https://genebass.org</ExternalLink>
        </ListItem>

        <PaperCitation
          authorList="Azzariti, D. R., Riggs, E. R., Niehaus, A., Rodriguez, L. L., Ramos, E. M., Kattman, B., Landrum, M. J., Martin, C. L., & Rehm, H. L."
          title="Points to consider for sharing variant-level information from clinical genetic testing with ClinVar."
          journal="Cold Spring Harbor molecular case studies"
          issue="4(1)"
          year="2018"
          doiLink="https://doi.org/10.1101/mcs.a002345"
        />

        <PaperCitation
          authorList="Wright, C. F., Ware, J. S., Lucassen, A. M., Hall, A., Middleton, A., Rahman, N., Ellard, S., & Firth, H. V."
          title="Genomic variant sharing: a position statement."
          journal="Wellcome open research"
          issue="4"
          pages="22"
          year="2019"
          doiLink="https://doi.org/10.12688/wellcomeopenres.15090.2"
        />

        <PaperCitation
          authorList="Shringarpure,  S. S., Bustamante,  C. D."
          title="Privacy risks from genomic data-sharing beacons."
          journal="American Journal of Human Genetics."
          issue="97"
          pages="631-646"
          year="2015"
          doiLink="10.1016/j.ajhg.2015.09.010"
        />

        <PaperCitation
          authorList="Ayoz K., Aysen M., Ayday E., Cicek A. E."
          title="The effect of kinship in re-identification attacks against genomic data sharing beacons."
          journal="Bioinformatics"
          issue="36"
          year="2020"
          doiLink="https://doi.org/10.1093/bioinformatics/btaa821"
        />

        <PaperCitation
          authorList="Erlich Y., Narayanan A."
          title="Routes for breaching and protecting genetic privacy."
          journal="Nature Reviews Genetics"
          issue="15(6)"
          pages="409-421"
          year="2014"
          doiLink="https://doi.org/10.1038/nrg3723"
        />

        <PaperCitation
          authorList="Wan Z."
          etAl
          title="Using game theory to thwart multistage privacy intrusions when sharing data."
          journal="Science Advances"
          issue="7(50)"
          year="2021"
          doiLink="https://doi.org/10.1126/sciadv.abe9986"
        />

        {/* @ts-expect-error */}
        <ListItem>
          <ExternalLink href="https://www.ncbi.nlm.nih.gov/clinvar/">
            https://www.ncbi.nlm.nih.gov/clinvar/
          </ExternalLink>
        </ListItem>
      </OrderedList>
    </InfoPage>
  )
}

export default AcOfOnePage
