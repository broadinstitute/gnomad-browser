import styled from 'styled-components'

import { Page } from '@gnomad/ui'

export const TrackPage = styled(Page)`
  max-width: none;
`

// Padding neeeds to be kept in sync with region viewer side panel sizes.
// Right panel is currently hidden on gene/region pages when screen width <= 900px.
export const TrackPageSection = styled.section`
  padding: 0 80px 0 115px;
  margin-bottom: 1em;

  @media (max-width: 900px) {
    padding: 0;
  }
`
