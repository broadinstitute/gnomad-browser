import React, { useRef, MutableRefObject, ReactNode } from 'react'
import { KeyboardShortcut } from '@gnomad/ui'

const useSearchHotkeys = (): {
  searchInputRef: MutableRefObject<any>
  searchHotkeys: ReactNode
} => {
  const searchInputRef = useRef(null)

  // preventDefault so the browser's native find doesn't open on the first press. Mousetrap
  // skips this handler when focus is already inside an input/textarea/select, so a second
  // press (after this has focused the search box) falls through to the browser's native find.
  const focusSearchInput = (e: any) => {
    e.preventDefault()
    if (searchInputRef.current) {
      ;(searchInputRef.current as any).focus()
    }
  }

  const searchHotkeys = (
    <>
      <KeyboardShortcut
        // @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type 'string[]'... Remove this comment to see the full error message
        keys="/"
        // @ts-expect-error TS(2322) FIXME: Type '(e: any) => void' is not assignable to type ... Remove this comment to see the full error message
        handler={focusSearchInput}
      />
      <KeyboardShortcut
        // @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type 'string[]'... Remove this comment to see the full error message
        keys="mod+f"
        // @ts-expect-error TS(2322) FIXME: Type '(e: any) => void' is not assignable to type ... Remove this comment to see the full error message
        handler={focusSearchInput}
      />
    </>
  )

  return { searchInputRef, searchHotkeys }
}

export default useSearchHotkeys
