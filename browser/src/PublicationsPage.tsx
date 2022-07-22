import React from 'react'
import styled from 'styled-components'
import { ExternalLink, List, ListItem, PageHeading } from '@gnomad/ui'

import DocumentTitle from './DocumentTitle'
import InfoPage from './InfoPage'
import Link from './Link'

const Citation = styled.cite`
  font-style: normal;
  line-height: 1.4;
`

export default () => (
  <InfoPage>
    <DocumentTitle title="Publications" />
    <PageHeading>Publications</PageHeading>
    <p>
      This page lists publications by the gnomAD group. For information on how to cite gnomAD data,
      see
      <Link to="/help/how-should-i-cite-discoveries-made-using-gnomad-data">
        &ldquo;How should I cite discoveries made using gnomAD data&rdquo;
      </Link>
      .
    </p>

    {/* @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
    <List>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Chen, S., Francioli, L. C., Goodrich, J. K., Collins, R. L., Wang, Q., Alföldi, J., Watts,
          N. A., Vittal, C., Gauthier, L. D., Poterba, T., Wilson, M. W., Tarasova, Y., Phu, W.,
          Yohannes, M. T., Koenig, Z., Farjoun, Y., Banks, E., Donnelly, S., Gabriel, S., Gupta, N.,
          Ferriera, S., Tolonen, C., Novod, S., Bergelson, L., Roazen, D., Ruano-Rubio, V.,
          Covarrubias, M., Llanwarne, C., Petrillo, N., Wade, G., Jeandet, T., Munshi, R., Tibbetts,
          K., gnomAD Project Consortium, O’Donnell-Luria, A., Solomonson, M., Seed, C., Martin, A.
          R., Talkowski, M. E., Rehm, H. L., Daly, M. J., Tiao, G., Neale, B. M., MacArthur, D. G. &
          Karczewski, K. J. A genome-wide mutational constraint map quantified from variation in
          76,156 human genomes. <em>bioRxiv</em> 2022.03.20.485034 (2022).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1101/2022.03.20.485034">
            https://doi.org/10.1101/2022.03.20.485034
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Gudmundsson, S., Singer-Berk, M., Watts, N. A., Phu, W., Goodrich, J. K., Solomonson, M.,
          Genome Aggregation Database (gnomAD) Consortium, Rehm, H. L., MacArthur, D. G.,
          O’Donnell-Luria, A. Variant interpretation using population databases: Lessons from
          gnomAD. <em>Human Mutation</em> 1-19 (2021).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1002/humu.24309">
            https://doi.org/10.1002/humu.24309
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Laricchia, K. M., Lake, N. J., Watts, N. A., Shand, M., Haessly, A., Gauthier, L. D.,
          Benjamin, D., Banks, E., Soto, J., Garimella, K., Emery, J., Genome Aggregation Database
          (gnomAD) Consortium, Rehm, H. L., MacArthur, D. G., Tiao, G., Lek, M., Mootha, V. K.,
          Calvo, S. E. Mitochondrial DNA variation across 56,434 individuals in gnomAD.{' '}
          <em>Genome Res.</em> 32, 569–582 (2022).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1101/gr.276013.121">
            https://doi.org/10.1101/gr.276013.121
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Karczewski, K. J., Francioli, L. C., Tiao, G., Cummings, B. B., Alföldi, J., Wang, Q.,
          Collins, R. L., Laricchia, K. M., Ganna, A., Birnbaum, D. P., Gauthier, L. D., Brand, H.,
          Solomonson, M., Watts, N. A., Rhodes, D., Singer-Berk, M., England, E. M., Seaby, E. G.,
          Kosmicki, J. A., … MacArthur, D. G. The mutational constraint spectrum quantified from
          variation in 141,456 humans. <em>Nature</em> 581, 434–443 (2020).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1038/s41586-020-2308-7">
            https://doi.org/10.1038/s41586-020-2308-7
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Collins, R. L., Brand, H., Karczewski, K. J., Zhao, X., Alföldi, J., Francioli, L. C.,
          Khera, A. V., Lowther, C., Gauthier, L. D., Wang, H., Watts, N. A., Solomonson, M.,
          O’Donnell-Luria, A., Baumann, A., Munshi, R., Walker, M., Whelan, C., Huang, Y.,
          Brookings, T., … Talkowski, M. E. A structural variation reference for medical and
          population genetics. <em>Nature</em> 581, 444–451 (2020).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1038/s41586-020-2287-8">
            https://doi.org/10.1038/s41586-020-2287-8
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Cummings, B. B., Karczewski, K. J., Kosmicki, J. A., Seaby, E. G., Watts, N. A.,
          Singer-Berk, M., Mudge, J. M., Karjalainen, J., Kyle Satterstrom, F., O’Donnell-Luria, A.,
          Poterba, T., Seed, C., Solomonson, M., Alföldi, J., The Genome Aggregation Database
          Production Team, The Genome Aggregation Database Consortium, Daly, M. J., &amp; MacArthur,
          D. G. Transcript expression-aware annotation improves rare variant interpretation.{' '}
          <em>Nature</em> 581, 452–458 (2020).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1038/s41586-020-2329-2">
            https://doi.org/10.1038/s41586-020-2329-2
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Minikel, E. V., Karczewski, K. J., Martin, H. C., Cummings, B. B., Whiffin, N., Rhodes,
          D., Alföldi, J., Trembath, R. C., van Heel, D. A., Daly, M. J., Genome Aggregation
          Database Production Team, Genome Aggregation Database Consortium, Schreiber, S. L., &amp;
          MacArthur, D. G. Evaluating potential drug targets through human loss-of-function genetic
          variation. <em>Nature</em> 581, 459–464 (2020).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1038/s41586-020-2267-z">
            https://doi.org/10.1038/s41586-020-2267-z
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Wang, Q., Pierce-Hoffman, E., Cummings, B. B., Karczewski, K. J., Alföldi, J., Francioli,
          L. C., Gauthier, L. D., Hill, A. J., O’Donnell-Luria, A. H., Genome Aggregation Database
          (gnomAD) Production Team, Genome Aggregation Database (gnomAD) Consortium, &amp;
          MacArthur, D. G. Landscape of multi-nucleotide variants in 125,748 human exomes and 15,708
          genomes. <em>Nature Communications</em> 11, 2539 (2020).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1038/s41467-019-12438-5">
            https://doi.org/10.1038/s41467-019-12438-5
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Whiffin, N., Armean, I. M., Kleinman, A., Marshall, J. L., Minikel, E. V., Goodrich, J.
          K., Quaife, N. M., Cole, J. B., Wang, Q., Karczewski, K. J., Cummings, B. B., Francioli,
          L., Laricchia, K., Guan, A., Alipanahi, B., Morrison, P., Baptista, M. A. S., Merchant, K.
          M., Genome Aggregation Database Production Team, … MacArthur, D. G. The effect of LRRK2
          loss-of-function variants in humans. <em>Nature Medicine</em> (2020).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1038/s41591-020-0893-5">
            https://doi.org/10.1038/s41591-020-0893-5
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Whiffin, N., Karczewski, K. J., Zhang, X., Chothani, S., Smith, M. J., Gareth Evans, D.,
          Roberts, A. M., Quaife, N. M., Schafer, S., Rackham, O., Alföldi, J., O’Donnell-Luria, A.
          H., Francioli, L. C., Genome Aggregation Database (gnomAD) Production Team, Genome
          Aggregation Database (gnomAD) Consortium, Cook, S. A., Barton, P. J. R., MacArthur, D. G.,
          &amp; Ware, J. S. Characterising the loss-of-function impact of 5’ untranslated region
          variants in 15,708 individuals. <em>Nature Communications</em> 11, 2523 (2020).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1038/s41467-019-10717-9">
            https://doi.org/10.1038/s41467-019-10717-9
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Karczewski, K. J., Gauthier, L. D., &amp; Daly, M. J. Technical artifact drives apparent
          deviation from Hardy-Weinberg equilibrium at CCR5-∆32 and other variants in gnomAD.{' '}
          <em>bioRxiv</em> (p. 784157).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1101/784157">
            https://doi.org/10.1101/784157
          </ExternalLink>
        </Citation>
      </ListItem>
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <ListItem>
        <Citation>
          Lek, M., Karczewski, K. J., Minikel, E. V., Samocha, K. E., Banks, E., Fennell, T.,
          O’Donnell-Luria, A. H., Ware, J. S., Hill, A. J., Cummings, B. B., Tukiainen, T.,
          Birnbaum, D. P., Kosmicki, J. A., Duncan, L. E., Estrada, K., Zhao, F., Zou, J.,
          Pierce-Hoffman, E., … Daly, M. J., MacArthur, D. G. &amp; Exome Aggregation Consortium.
          Analysis of protein-coding genetic variation in 60,706 humans. <em>Nature</em> 536,
          285–291 (2016).{' '}
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://doi.org/10.1038/nature19057">
            https://doi.org/10.1038/nature19057
          </ExternalLink>
        </Citation>
      </ListItem>
    </List>
  </InfoPage>
)
