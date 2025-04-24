import React from 'react'

// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import OurDnaImage from './logo-ourdna-combined.png'

const OurDnaLogo = (props: any) => (
  <svg {...props} viewBox="0 0 1258 1020">
      <image href={OurDnaImage} />
    </svg>
)

export default OurDnaLogo
