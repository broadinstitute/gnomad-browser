import React, { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { discreteBrushSelection, useDiscretePlotBrush } from './discretePlotBrush'

const marks = [
  { id: 'a', x: -2, y: 0.2, value: 'a' },
  { id: 'b', x: 0, y: 0.5, value: 'b' },
  { id: 'c', x: 2, y: 0.8, value: 'c' },
  { id: 'd', x: 2, y: 0.3, value: 'd' },
]

const KeyboardBrush = () => {
  const [selected, setSelected] = useState<string[]>([])
  const [clearCount, setClearCount] = useState(0)
  const brush = useDiscretePlotBrush({
    marks,
    axis: 'x',
    onSelect: (selection) => setSelected(selection.marks),
    onClear: () => {
      setSelected([])
      setClearCount((count) => count + 1)
    },
  })
  return (
    <div {...brush.containerProps}>
      <output aria-label="selected marks">{selected.join(',')}</output>
      <output aria-label="clear count">{clearCount}</output>
      {marks.map((mark) => {
        const props = brush.markProps(mark)
        return (
          <button
            key={mark.id}
            type="button"
            data-discrete-brush-id={props['data-discrete-brush-id']}
            onClick={(event) => props.onClick(event)}
            onKeyDown={(event) => props.onKeyDown(event)}
          >
            {mark.id}
          </button>
        )
      })}
    </div>
  )
}

describe('discreteBrushSelection', () => {
  test('selects an inclusive contiguous x range in either drag direction', () => {
    expect(discreteBrushSelection(marks, 'a', 'c', 'x')?.marks).toEqual(['a', 'b', 'c', 'd'])
    expect(discreteBrushSelection(marks, 'c', 'a', 'x')?.marks).toEqual(['a', 'b', 'c', 'd'])
  })

  test('selects only marks inside an inclusive rectangle in either drag direction', () => {
    expect(discreteBrushSelection(marks, 'a', 'c', 'xy')?.marks).toEqual(['a', 'b', 'c', 'd'])
    expect(discreteBrushSelection(marks, 'c', 'b', 'xy')?.marks).toEqual(['b', 'c'])
    expect(discreteBrushSelection(marks, 'b', 'c', 'xy')?.marks).toEqual(['b', 'c'])
  })

  test('returns one mark for a click-sized selection and null for unknown marks', () => {
    expect(discreteBrushSelection(marks, 'b', 'b', 'xy')?.marks).toEqual(['b'])
    expect(discreteBrushSelection(marks, 'missing', 'b', 'xy')).toBeNull()
  })

  test('repeated Shift+Arrow expands from the prior endpoint', () => {
    render(<KeyboardBrush />)
    const anchor = screen.getByRole('button', { name: 'a' })
    fireEvent.click(anchor)
    fireEvent.keyDown(anchor, { key: 'ArrowRight', shiftKey: true })
    expect(screen.getByLabelText('selected marks').textContent).toBe('a,b')
    fireEvent.keyDown(anchor, { key: 'ArrowRight', shiftKey: true })
    expect(screen.getByLabelText('selected marks').textContent).toBe('a,b,c,d')
  })

  test('Escape on a mark clears exactly once instead of bubbling to the container', () => {
    render(<KeyboardBrush />)
    const anchor = screen.getByRole('button', { name: 'a' })
    fireEvent.click(anchor)
    fireEvent.keyDown(anchor, { key: 'ArrowRight', shiftKey: true })
    fireEvent.keyDown(anchor, { key: 'Escape' })
    expect(screen.getByLabelText('selected marks').textContent).toBe('')
    expect(screen.getByLabelText('clear count').textContent).toBe('1')
  })
})
