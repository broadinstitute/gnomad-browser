import React from 'react'
import { render, fireEvent } from '@testing-library/react'

import { Searchbox } from './Searchbox'

describe('Searchbox', () => {
  test('it should render an input element', () => {
    const fetchSearchResults = jest.fn().mockImplementation(() => Promise.resolve([]))

    const { getByTestId } = render(
      <Searchbox fetchSearchResults={fetchSearchResults} onSelect={jest.fn()} />
    )
    expect(getByTestId('searchbox-input')).toBeTruthy()
  })

  test('it should set ID attribute on input element', () => {
    const fetchSearchResults = jest.fn().mockImplementation(() => Promise.resolve([]))

    const { getByTestId } = render(
      <Searchbox fetchSearchResults={fetchSearchResults} id="foo" onSelect={jest.fn()} />
    )
    expect(getByTestId('searchbox-input')).toHaveAttribute('id', 'foo')
  })

  test('it should set placeholder attribute on input element', () => {
    const fetchSearchResults = jest.fn().mockImplementation(() => Promise.resolve([]))

    const { getByTestId } = render(
      <Searchbox
        fetchSearchResults={fetchSearchResults}
        placeholder="search..."
        onSelect={jest.fn()}
      />
    )

    expect(getByTestId('searchbox-input')).toHaveAttribute('placeholder', 'search...')
  })

  test('it should fetch search results when input value changes and render results', async () => {
    const fetchSearchResults = jest.fn().mockImplementation(() =>
      Promise.resolve([
        { value: 'bar', label: 'bar' },
        { value: 'baz', label: 'baz' },
      ])
    )

    const { getByTestId, findAllByTestId } = render(
      <Searchbox fetchSearchResults={fetchSearchResults} onSelect={jest.fn()} />
    )

    const input = getByTestId('searchbox-input')
    input.focus()
    fireEvent.change(input, { target: { value: 'ba' } })
    expect(fetchSearchResults).toHaveBeenCalledWith('ba')

    const results = await findAllByTestId('searchbox-menu-item')
    expect(results).toHaveLength(2)
    expect(results[0]).toHaveTextContent('bar')
    expect(results[1]).toHaveTextContent('baz')
  })
})
