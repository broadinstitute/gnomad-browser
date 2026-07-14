import { debounce } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled, { createGlobalStyle } from 'styled-components'

import { FIND_NO_OVERLAY_ATTRIBUTE, useFindBar } from './FindBarContext'

// Names registered with the CSS Custom Highlight API.
const MATCH_HIGHLIGHT = 'gnomad-find-match'
const ACTIVE_HIGHLIGHT = 'gnomad-find-active'

// Cap the number of page-text ranges to keep highlighting responsive on very
// large pages.
const MAX_PAGE_MATCHES = 2000

const FindHighlightStyle = createGlobalStyle`
  /* stylelint-disable selector-pseudo-element-no-unknown, selector-type-no-unknown, selector-type-case, no-duplicate-selectors -- ::highlight() (CSS Custom Highlight API) with interpolated names */
  ::highlight(${MATCH_HIGHLIGHT}) {
    background-color: #ffe066;
    color: #000;
  }

  ::highlight(${ACTIVE_HIGHLIGHT}) {
    background-color: #ff9800;
    color: #000;
  }
`

const Bar = styled.div`
  position: fixed;
  z-index: 10;
  top: 12px;
  right: 16px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid #c4c4c4;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);

  @media print {
    display: none;
  }
`

const FindInput = styled.input`
  width: 220px;
  height: 26px;
  padding: 0 6px;
  border: 1px solid #c4c4c4;
  border-radius: 3px;
  font-size: 14px;
`

const MatchCount = styled.span`
  min-width: 64px;
  margin: 0 8px;
  color: #666;
  font-size: 13px;
  text-align: center;
  white-space: nowrap;
`

const IconButton = styled.button`
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid #c4c4c4;
  border-radius: 3px;
  margin-left: 4px;
  background: #fafafa;
  color: #333;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;

  &:disabled {
    color: #bbb;
    cursor: default;
  }

  &:hover:not(:disabled) {
    background: #ededed;
  }
`

type HighlightApi = {
  highlights: {
    set: (name: string, highlight: unknown) => void
    delete: (name: string) => void
  }
  Highlight: new (...ranges: Range[]) => any
}

// The CSS Custom Highlight API is not in the TS DOM lib used here and is not
// available in jsdom, so it is accessed defensively.
const getHighlightApi = (): HighlightApi | null => {
  if (typeof CSS === 'undefined' || typeof window === 'undefined') {
    return null
  }
  const cssHighlights = (CSS as any).highlights
  const HighlightCtor = (window as any).Highlight
  if (!cssHighlights || !HighlightCtor) {
    return null
  }
  return { highlights: cssHighlights, Highlight: HighlightCtor }
}

const clearPageHighlights = () => {
  const api = getHighlightApi()
  if (!api) {
    return
  }
  api.highlights.delete(MATCH_HIGHLIGHT)
  api.highlights.delete(ACTIVE_HIGHLIGHT)
}

const applyPageHighlights = (ranges: Range[], activeIndex: number) => {
  const api = getHighlightApi()
  if (!api) {
    return
  }
  if (ranges.length === 0) {
    clearPageHighlights()
    return
  }
  // activeIndex < 0 highlights the matches with no active (current) one.
  const activeRange = ranges[activeIndex]
  const otherRanges = ranges.filter((_, index) => index !== activeIndex)
  api.highlights.set(MATCH_HIGHLIGHT, new api.Highlight(...otherRanges))
  if (activeRange) {
    api.highlights.set(ACTIVE_HIGHLIGHT, new api.Highlight(activeRange))
  } else {
    api.highlights.delete(ACTIVE_HIGHLIGHT)
  }
}

const scrollRangeIntoView = (range: Range | undefined) => {
  if (!range) {
    return
  }
  const element =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement
  if (element && typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

// Whether a match falls inside a region that paints its own highlighting (e.g.
// the variant table) and so should be left out of the CSS page overlay.
const noOverlaySelector = `[${FIND_NO_OVERLAY_ATTRIBUTE}]`

const isRangeInNoOverlayRegion = (range: Range): boolean => {
  const element =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement
  return Boolean(element && element.closest(noOverlaySelector))
}

// Walks visible text nodes of `root` and returns a Range for every occurrence
// of `query` (case-insensitive). Skips the find bar itself and non-content
// elements.
const collectRanges = (root: Node, query: string, excludeRoot: Node | null): Range[] => {
  const ranges: Range[] = []
  const needle = query.toLowerCase()
  if (!needle) {
    return ranges
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node: Node) => {
      const text = node.nodeValue
      if (!text || !text.trim()) {
        return NodeFilter.FILTER_REJECT
      }
      const parent = node.parentElement
      if (!parent) {
        return NodeFilter.FILTER_REJECT
      }
      const tag = parent.nodeName
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
        return NodeFilter.FILTER_REJECT
      }
      if (excludeRoot && excludeRoot.contains(parent)) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let node = walker.nextNode()
  while (node && ranges.length < MAX_PAGE_MATCHES) {
    const haystack = (node.nodeValue as string).toLowerCase()
    let index = haystack.indexOf(needle)
    while (index !== -1 && ranges.length < MAX_PAGE_MATCHES) {
      const range = document.createRange()
      range.setStart(node, index)
      range.setEnd(node, index + needle.length)
      ranges.push(range)
      index = haystack.indexOf(needle, index + needle.length)
    }
    node = walker.nextNode()
  }

  return ranges
}

const PageFindBar = () => {
  const {
    isOpen,
    query,
    variantMatchCount,
    open,
    close,
    setQuery,
    focusVariantMatch,
    clearVariantMatch,
  } = useFindBar()

  const inputRef = useRef<HTMLInputElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const isOpenRef = useRef(isOpen)

  // Results are one top-down sequence: page-text matches before the table, then
  // variant matches, then page-text matches after. `splitIndex` is how many
  // overlay (page-text) ranges come before the table.
  const overlayRangesRef = useRef<Range[]>([])
  const splitIndexRef = useRef(0)
  const variantCountRef = useRef(0)
  const currentIndexRef = useRef(0)

  // currentIndex/totalResults are set together by goToResult so the label stays
  // consistent. searchedQuery is the query the debounced search last processed;
  // the count/navigation are "ready" only once it matches the current query.
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalResults, setTotalResults] = useState(0)
  const [searchedQuery, setSearchedQuery] = useState('')

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    variantCountRef.current = variantMatchCount ?? 0
  }, [variantMatchCount])

  // Move to the result at `target` (wrapping).
  const goToResult = useCallback(
    (target: number) => {
      const overlay = overlayRangesRef.current
      const split = splitIndexRef.current
      const variantCount = variantCountRef.current
      const total = overlay.length + variantCount

      setTotalResults(total)

      if (total === 0) {
        currentIndexRef.current = 0
        setCurrentIndex(0)
        clearVariantMatch()
        clearPageHighlights()
        return
      }

      const index = ((target % total) + total) % total
      currentIndexRef.current = index
      setCurrentIndex(index)

      if (index < split) {
        // Page-text match before the table.
        clearVariantMatch()
        applyPageHighlights(overlay, index)
        scrollRangeIntoView(overlay[index])
      } else if (index < split + variantCount) {
        // Variant match: the table highlights/scrolls to it; no page-text active.
        applyPageHighlights(overlay, -1)
        focusVariantMatch(index - split)
      } else {
        // Page-text match after the table (skip the variant block in `overlay`).
        const overlayIndex = index - variantCount
        clearVariantMatch()
        applyPageHighlights(overlay, overlayIndex)
        scrollRangeIntoView(overlay[overlayIndex])
      }
    },
    [focusVariantMatch, clearVariantMatch]
  )

  const runSearch = useMemo(
    () =>
      debounce((nextQuery: string) => {
        if (!nextQuery || !getHighlightApi()) {
          overlayRangesRef.current = []
          splitIndexRef.current = 0
          currentIndexRef.current = 0
          clearPageHighlights()
          clearVariantMatch()
          setTotalResults(0)
          setCurrentIndex(0)
          setSearchedQuery(nextQuery)
          return
        }
        const allRanges = collectRanges(document.body, nextQuery, barRef.current)
        // The overlay only covers matches outside the table (it highlights its own).
        const overlayRanges = allRanges.filter((range) => !isRangeInNoOverlayRegion(range))
        // Where the table sits in the top-down order.
        const noOverlayElement = document.querySelector(noOverlaySelector)
        let splitIndex = overlayRanges.length
        if (noOverlayElement) {
          const firstAfter = overlayRanges.findIndex((range) =>
            Boolean(
              // eslint-disable-next-line no-bitwise
              range.startContainer.compareDocumentPosition(noOverlayElement) &
                Node.DOCUMENT_POSITION_PRECEDING
            )
          )
          splitIndex = firstAfter === -1 ? overlayRanges.length : firstAfter
        }
        overlayRangesRef.current = overlayRanges
        splitIndexRef.current = splitIndex
        setSearchedQuery(nextQuery)
        // Anchor to the first result.
        goToResult(0)
      }, 150),
    [goToResult, clearVariantMatch]
  )

  // Global Ctrl/Cmd+F interception, so the bar can be opened from anywhere.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isFindCombo =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        (event.key === 'f' || event.key === 'F')

      if (isFindCombo) {
        event.preventDefault()
        open()
        window.setTimeout(() => {
          const input = inputRef.current
          if (input) {
            input.focus()
            input.select()
          }
        }, 0)
        return
      }

      if (event.key === 'Escape' && isOpenRef.current) {
        close()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open, close])

  // Recompute matches and anchor to the first result as the query changes.
  useEffect(() => {
    if (!isOpen) {
      return
    }
    runSearch(query)
  }, [isOpen, query, runSearch])

  // Reset when the bar closes or unmounts.
  useEffect(() => {
    if (!isOpen) {
      runSearch.cancel()
      clearPageHighlights()
      overlayRangesRef.current = []
      splitIndexRef.current = 0
      currentIndexRef.current = 0
      setTotalResults(0)
      setCurrentIndex(0)
      setSearchedQuery('')
    }
  }, [isOpen, runSearch])

  useEffect(
    () => () => {
      runSearch.cancel()
      clearPageHighlights()
    },
    [runSearch]
  )

  const goToNext = useCallback(() => {
    goToResult(currentIndexRef.current + 1)
  }, [goToResult])

  const goToPrevious = useCallback(() => {
    goToResult(currentIndexRef.current - 1)
  }, [goToResult])

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (event.shiftKey) {
          goToPrevious()
        } else {
          goToNext()
        }
      }
    },
    [close, goToNext, goToPrevious]
  )

  if (!isOpen) {
    return null
  }

  // Ready once the debounced search has processed the current query.
  const resultsReady = query !== '' && searchedQuery === query
  let countLabel = ''
  if (resultsReady) {
    countLabel = totalResults === 0 ? 'No results' : `${currentIndex + 1} of ${totalResults}`
  }
  const navDisabled = !resultsReady || totalResults === 0

  return (
    <>
      <FindHighlightStyle />
      <Bar ref={barRef} role="search" aria-label="Find on page">
        <FindInput
          ref={inputRef}
          type="text"
          autoFocus
          aria-label="Find on page"
          placeholder="Find on page"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          onKeyDown={handleInputKeyDown}
        />
        <MatchCount aria-live="polite">{countLabel}</MatchCount>
        <IconButton
          type="button"
          aria-label="Previous match"
          disabled={navDisabled}
          onClick={goToPrevious}
        >
          ‹
        </IconButton>
        <IconButton type="button" aria-label="Next match" disabled={navDisabled} onClick={goToNext}>
          ›
        </IconButton>
        <IconButton type="button" aria-label="Close find bar" onClick={close}>
          ✕
        </IconButton>
      </Bar>
    </>
  )
}

export default PageFindBar
