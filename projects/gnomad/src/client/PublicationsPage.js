import React from 'react'
import styled from 'styled-components'
import { ExternalLink, List, ListItem, PageHeading } from '@broad/ui'

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
      This page lists publications by the gnomAD group. For information on how to cite gnomAD data,{' '}
      <Link
        to={{ pathname: '/faq', hash: '#how-should-i-cite-discoveries-made-using-gnomad-data' }}
      >
        see the FAQ
      </Link>
      .
    </p>

    <List>
      <ListItem>
        <Citation>
          Karczewski, K. J., Francioli, L. C., Tiao, G., Cummings, B. B., Alföldi, J., Wang, Q.,
          Collins, R. L., Laricchia, K. M., Ganna, A., Birnbaum, D. P., Gauthier, L. D., Brand, H.,
          Solomonson, M., Watts, N. A., Rhodes, D., Singer-Berk, M., England, E. M., Seaby, E. G.,
          Kosmicki, J. A., … MacArthur, D. G. (2019). Variation across 141,456 human exomes and
          genomes reveals the spectrum of loss-of-function intolerance across human protein-coding
          genes. In <span style={{ fontStyle: 'italic' }}>bioRxiv</span> (p. 531210).{' '}
          <ExternalLink href="https://doi.org/10.1101/531210">
            https://doi.org/10.1101/531210
          </ExternalLink>
        </Citation>
      </ListItem>
      <ListItem>
        <Citation>
          Collins, R. L., Brand, H., Karczewski, K. J., Zhao, X., Alföldi, J., Francioli, L. C.,
          Khera, A. V., Lowther, C., Gauthier, L. D., Wang, H., Watts, N. A., Solomonson, M.,
          O’Donnell-Luria, A., Baumann, A., Munshi, R., Walker, M., Whelan, C., Huang, Y.,
          Brookings, T., … Talkowski, M. E. (2019). An open resource of structural variation for
          medical and population genetics. In <span style={{ fontStyle: 'italic' }}>bioRxiv</span>{' '}
          (p. 578674).{' '}
          <ExternalLink href="https://doi.org/10.1101/578674">
            https://doi.org/10.1101/578674
          </ExternalLink>
        </Citation>
      </ListItem>
      <ListItem>
        <Citation>
          Cummings, B. B., Karczewski, K. J., Kosmicki, J. A., Seaby, E. G., Watts, N. A.,
          Singer-Berk, M., Mudge, J. M., Karjalainen, J., Kyle Satterstrom, F., O’Donnell-Luria, A.,
          Poterba, T., Seed, C., Solomonson, M., Alföldi, J., The Genome Aggregation Database
          Production Team, The Genome Aggregation Database Consortium, Daly, M. J., &amp; MacArthur,
          D. G. (2019). Transcript expression-aware annotation improves rare variant discovery and
          interpretation. In <span style={{ fontStyle: 'italic' }}>bioRxiv</span> (p. 554444).{' '}
          <ExternalLink href="https://doi.org/10.1101/554444">
            https://doi.org/10.1101/554444
          </ExternalLink>
        </Citation>
      </ListItem>
      <ListItem>
        <Citation>
          Minikel, E. V., Karczewski, K. J., Martin, H. C., Cummings, B. B., Whiffin, N., Rhodes,
          D., Alföldi, J., Trembath, R. C., van Heel, D. A., Daly, M. J., Genome Aggregation
          Database Production Team, Genome Aggregation Database Consortium, Schreiber, S. L., &amp;
          MacArthur, D. G. (2019). Evaluating potential drug targets through human loss-of-function
          genetic variation. In <span style={{ fontStyle: 'italic' }}>bioRxiv</span> (p. 530881).{' '}
          <ExternalLink href="https://doi.org/10.1101/530881">
            https://doi.org/10.1101/530881
          </ExternalLink>
        </Citation>
      </ListItem>
      <ListItem>
        <Citation>
          Wang, Q., Pierce-Hoffman, E., Cummings, B. B., Karczewski, K. J., Alföldi, J., Francioli,
          L. C., Gauthier, L. D., Hill, A. J., O’Donnell-Luria, A. H., Genome Aggregation Database
          (gnomAD) Production Team, Genome Aggregation Database (gnomAD) Consortium, &amp;
          MacArthur, D. G. (2019). Landscape of multi-nucleotide variants in 125,748 human exomes
          and 15,708 genomes. In <span style={{ fontStyle: 'italic' }}>bioRxiv</span> (p. 573378).{' '}
          <ExternalLink href="https://doi.org/10.1101/573378">
            https://doi.org/10.1101/573378
          </ExternalLink>
        </Citation>
      </ListItem>
      <ListItem>
        <Citation>
          Whiffin, N., Armean, I. M., Kleinman, A., Marshall, J. L., Minikel, E. V., Goodrich, J.
          K., Quaife, N. M., Cole, J. B., Wang, Q., Karczewski, K. J., Cummings, B. B., Francioli,
          L., Laricchia, K., Guan, A., Alipanahi, B., Morrison, P., Baptista, M. A. S., Merchant, K.
          M., Genome Aggregation Database Production Team, … MacArthur. (2019). Human
          loss-of-function variants suggest that partial LRRK2 inhibition is a safe therapeutic
          strategy for Parkinson’s disease. In <span style={{ fontStyle: 'italic' }}>bioRxiv</span>{' '}
          (p. 561472).{' '}
          <ExternalLink href="https://doi.org/10.1101/561472">
            https://doi.org/10.1101/561472
          </ExternalLink>
        </Citation>
      </ListItem>
      <ListItem>
        <Citation>
          Whiffin, N., Karczewski, K. J., Zhang, X., Chothani, S., Smith, M. J., Gareth Evans, D.,
          Roberts, A. M., Quaife, N. M., Schafer, S., Rackham, O., Alföldi, J., O’Donnell-Luria, A.
          H., Francioli, L. C., Genome Aggregation Database (gnomAD) Production Team, Genome
          Aggregation Database (gnomAD) Consortium, Cook, S. A., Barton, P. J. R., MacArthur, D. G.,
          &amp; Ware, J. S. (2019). Characterising the loss-of-function impact of 5’ untranslated
          region variants in 15,708 individuals. In{' '}
          <span style={{ fontStyle: 'italic' }}>bioRxiv</span> (p. 543504).{' '}
          <ExternalLink href="https://doi.org/10.1101/543504">
            https://doi.org/10.1101/543504
          </ExternalLink>
        </Citation>
      </ListItem>
      <ListItem>
        <Citation>
          Lek, M., Karczewski, K., Minikel, E. et al. Analysis of protein-coding genetic variation
          in 60,706 humans. <span style={{ fontStyle: 'italic' }}>Nature</span> 536, 285–291 (2016).{' '}
          <ExternalLink href="https://doi.org/10.1038/nature19057">
            https://doi.org/10.1038/nature19057
          </ExternalLink>
        </Citation>
      </ListItem>
    </List>
  </InfoPage>
)
