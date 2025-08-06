import React from 'react'

// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import OurDnaImage from './OurDNA_Browser_Landing_page.png'

const OurDnaLogo = (props: any) => (
  <svg {...props} viewBox="0 0 1500 678">
      <image href={OurDnaImage} />
    </svg>
)

export default OurDnaLogo
