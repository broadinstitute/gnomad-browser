import { useEffect, useState } from 'react'

const MAX_VARIANT_SEARCH_LENGTH = 512

const sanitizeVariantSearchValue = (value: string): string => Array.from(
  value
    .replace(/\r\n?/g, '\n')
    .replace(/\n+/g, ',')
    .replace(/\t/g, ' ')
)
  .filter((character) => {
    const code = character.charCodeAt(0)
    return code >= 32 && code !== 127
  })
  .join('')
  .trim()
  .replace(/^,+|,+$/g, '')
  .slice(0, MAX_VARIANT_SEARCH_LENGTH)

// URLSearchParams safely decodes percent-encoded values, including malformed input.
// Canonicalize pasted separators, strip other controls, and cap the value before it
// reaches the search control.
export const variantSearchFromUrl = (search: string): string | null => {
  try {
    const value = new URLSearchParams(search).get('variant_id')
    if (value === null) return null

    const sanitized = sanitizeVariantSearchValue(value)
    return sanitized || null
  } catch {
    return null
  }
}

export const withVariantSearchParam = (search: string, searchText: string): string => {
  const params = new URLSearchParams(search)
  const value = sanitizeVariantSearchValue(searchText)

  if (value) params.set('variant_id', value)
  else params.delete('variant_id')

  const encoded = params.toString()
  return encoded ? `?${encoded}` : ''
}

export const useVariantSearchText = (variantSearch: string | null | undefined) => {
  const [searchText, setSearchText] = useState(variantSearch || '')

  // Apply URL navigation changes, but do not reset later user edits on unrelated renders.
  useEffect(() => {
    setSearchText(variantSearch || '')
  }, [variantSearch])

  return [searchText, setSearchText] as const
}
