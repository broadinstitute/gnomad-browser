import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

// Text inside an element with this attribute is left out of the CSS page-highlight
// overlay (it paints its own highlighting, e.g. the virtualized variant table).
// Such matches are still counted in the total.
export const FIND_NO_OVERLAY_ATTRIBUTE = 'data-find-no-overlay'

// A variant table registers this so the find bar can drive it: scroll to and
// highlight the match at a given index (0-based among the variant matches), or
// clear the current-match highlight.
export type VariantFindApi = {
  focusMatch: (index: number) => void
  clearMatch: () => void
}

export type FindBarContextValue = {
  isOpen: boolean
  query: string
  // Variant matches across the whole (virtualized) table; null when no variant
  // table is present. Reported by useVariantFindBridge.
  variantMatchCount: number | null
  open: () => void
  close: () => void
  setQuery: (query: string) => void
  setVariantMatchCount: (count: number | null) => void
  // The variant table registers/unregisters its find controller here.
  registerVariantFind: (api: VariantFindApi | null) => void
  // The find bar drives the registered table (no-ops if none is registered).
  focusVariantMatch: (index: number) => void
  clearVariantMatch: () => void
}

// Inert no-op default so consumers (e.g. the variant table) work even outside a
// FindBarProvider.
const defaultValue: FindBarContextValue = {
  isOpen: false,
  query: '',
  variantMatchCount: null,
  open: () => {},
  close: () => {},
  setQuery: () => {},
  setVariantMatchCount: () => {},
  registerVariantFind: () => {},
  focusVariantMatch: () => {},
  clearVariantMatch: () => {},
}

const FindBarContext = createContext<FindBarContextValue>(defaultValue)

export const FindBarProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [variantMatchCount, setVariantMatchCount] = useState<number | null>(null)

  const variantFindRef = useRef<VariantFindApi | null>(null)
  const registerVariantFind = useCallback((api: VariantFindApi | null) => {
    variantFindRef.current = api
  }, [])
  const focusVariantMatch = useCallback((index: number) => {
    variantFindRef.current?.focusMatch(index)
  }, [])
  const clearVariantMatch = useCallback(() => {
    variantFindRef.current?.clearMatch()
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      query,
      variantMatchCount,
      open,
      close,
      setQuery,
      setVariantMatchCount,
      registerVariantFind,
      focusVariantMatch,
      clearVariantMatch,
    }),
    [
      isOpen,
      query,
      variantMatchCount,
      open,
      close,
      registerVariantFind,
      focusVariantMatch,
      clearVariantMatch,
    ]
  )

  return <FindBarContext.Provider value={value}>{children}</FindBarContext.Provider>
}

export const useFindBar = (): FindBarContextValue => useContext(FindBarContext)

export default FindBarContext
