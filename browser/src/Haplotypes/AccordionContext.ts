import React from 'react'
import type { AccordionCoordinateMapper } from './AccordionCoordinateMapper'

type AccordionContextValue = {
  mapper: AccordionCoordinateMapper | null
}

const AccordionContext = React.createContext<AccordionContextValue>({ mapper: null })

export default AccordionContext
