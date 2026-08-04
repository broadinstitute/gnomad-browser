import { useEffect, useState } from 'react'

const MAX_VARIANT_SEARCH_LENGTH = 512

// URLSearchParams safely decodes percent-encoded values, including malformed input.
// Strip control characters and cap the value before it reaches the search control.
export const variantSearchFromUrl = (search: string): string | null => {
  try {
    const value = new URLSearchParams(search).get('variant_id')
    if (value === null) return null

    const sanitized = Array.from(value)
      .filter((character) => {
        const code = character.charCodeAt(0)
        return code >= 32 && code !== 127
      })
      .join('')
      .trim()
    return sanitized ? sanitized.slice(0, MAX_VARIANT_SEARCH_LENGTH) : null
  } catch {
    return null
  }
}

export const useVariantSearchText = (variantSearch: string | null | undefined) => {
  const [searchText, setSearchText] = useState(variantSearch || '')

  // Apply URL navigation changes, but do not reset later user edits on unrelated renders.
  useEffect(() => {
    setSearchText(variantSearch || '')
  }, [variantSearch])

  return [searchText, setSearchText] as const
}
