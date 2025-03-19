import React from 'react'

// @ts-ignore - TS2307 Cannot fine module ... or its corresponding type declarations.
import OurDnaImage from './ourdna.png'

const OurDnaLogo = (props: any) => (
  <svg {...props} viewBox="0 0 2500 520">
    <title>OurDnaBrowser</title>
    <image href={OurDnaImage} />
  </svg>
)

export default OurDnaLogo
