import { useEffect } from 'react'

import { useFindBar } from './FindBarContext'

type UseVariantFindBridgeArgs = {
  // Variants matching the find query across the entire list (not just rendered rows).
  matchCount: number
}

// Reports the variant table's total match count to the find bar while it is open
// (cleared on close/unmount). The find bar drives the table to a specific match
// via activeVariantMatchIndex, read directly from the context in Variants.
const useVariantFindBridge = ({ matchCount }: UseVariantFindBridgeArgs) => {
  const { isOpen, query, setVariantMatchCount } = useFindBar()

  useEffect(() => {
    setVariantMatchCount(isOpen && query !== '' ? matchCount : null)
  }, [isOpen, query, matchCount, setVariantMatchCount])

  useEffect(
    () => () => {
      setVariantMatchCount(null)
    },
    [setVariantMatchCount]
  )
}

export default useVariantFindBridge
