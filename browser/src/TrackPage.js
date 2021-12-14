import styled from 'styled-components'

import { Page } from '@gnomad/ui'

export const TrackPage = styled(Page)`
  max-width: none;
`

// Padding neeeds to be kept in sync with region viewer side panel sizes.
// Right panel is currently hidden on gene/region pages when screen width <= 900px.
export const TrackPageSection = styled.div`
  padding: 0 80px 0 115px;

  @media (max-width: 900px) {
    padding: 0;
  }
`
