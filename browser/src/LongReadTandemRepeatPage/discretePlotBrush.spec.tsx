import React, { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { discreteBrushSelection, useDiscretePlotBrush } from './discretePlotBrush'

// jsdom has no PointerEvent, so testing-library would send pointer events without a button or
// pointer id and the brush would ignore them. A MouseEvent of the pointer type, given an id,
// carries everything the brush reads. The primary button is held until pointerup unless the
// caller says otherwise.
const firePointer = (
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  element: Element,
  clientX: number,
  clientY: number,
  buttons = type === 'pointerup' ? 0 : 1
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons,
    clientX,
    clientY,
  })
  Object.defineProperty(event, 'pointerId', { value: 1 })
  fireEvent(element, event)
}

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
            // As on the plots, a plain click selects just its own mark.
            onClick={(event) => {
              if (!props.onClick(event)) setSelected([mark.id])
            }}
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

  test('a mouse Shift+click selects the range from the previous click', () => {
    render(<KeyboardBrush />)
    // A real mouse click sends pointer down and up, which the container sees, before the click.
    const mouseClick = (element: HTMLElement, shiftKey = false) => {
      firePointer('pointerdown', element, 0, 0)
      firePointer('pointerup', element, 0, 0)
      fireEvent.click(element, { shiftKey })
    }
    mouseClick(screen.getByRole('button', { name: 'a' }))
    mouseClick(screen.getByRole('button', { name: 'c' }), true)
    expect(screen.getByLabelText('selected marks').textContent).toBe('a,b,c,d')
  })

  test('a horizontal drag on an x-only plot ends at the bar under the pointer, whatever its height', () => {
    render(<KeyboardBrush />)
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((name) => screen.getByRole('button', { name }))
    // Bars 40px apart with different heights: a is short, b is tall, so b's center is far up.
    const place = (element: HTMLElement, left: number, top: number, height: number) =>
      jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        left,
        top,
        width: 30,
        height,
        right: left + 30,
        bottom: top + height,
      } as DOMRect)
    place(a, 0, 150, 50)
    place(b, 40, 0, 200)
    place(c, 80, 100, 100)
    place(d, 120, 100, 100)
    const container = a.parentElement!
    firePointer('pointerdown', a, 15, 175)
    // Pointer capture sends the rest of the drag to the container. The pointer ends over b's
    // left side, near the bottom, where a's center is closer in two dimensions.
    firePointer('pointermove', container, 45, 190)
    firePointer('pointerup', container, 45, 190)
    expect(screen.getByLabelText('selected marks').textContent).toBe('a,b')
  })

  test('a press released outside the plot does not turn the next hover into a drag', () => {
    render(<KeyboardBrush />)
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((name) => screen.getByRole('button', { name }))
    ;[a, b, c, d].forEach((element, index) =>
      jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        left: index * 40,
        top: 0,
        width: 30,
        height: 100,
        right: index * 40 + 30,
        bottom: 100,
      } as DOMRect)
    )
    const container = a.parentElement!
    firePointer('pointerdown', a, 15, 50)
    // The button comes up outside the plot, so no pointerup arrives; the pointer then returns
    // over d with no button held.
    firePointer('pointermove', container, 135, 50, 0)
    firePointer('pointerup', container, 135, 50)
    expect(screen.getByLabelText('selected marks').textContent).toBe('')
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

  describe('Escape during a press', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    const renderPlacedBars = () => {
      render(<KeyboardBrush />)
      const bars = ['a', 'b', 'c', 'd'].map((name) => screen.getByRole('button', { name }))
      bars.forEach((element, index) =>
        jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
          left: index * 40,
          top: 0,
          width: 30,
          height: 100,
          right: index * 40 + 30,
          bottom: 100,
        } as DOMRect)
      )
      return bars
    }

    test('cancels a drag, so releasing the pointer does not reapply the selection', () => {
      const [a] = renderPlacedBars()
      const container = a.parentElement!
      firePointer('pointerdown', a, 15, 50)
      firePointer('pointermove', container, 95, 50)
      fireEvent.keyDown(a, { key: 'Escape' })
      firePointer('pointermove', container, 135, 50)
      firePointer('pointerup', container, 135, 50)
      expect(screen.getByLabelText('selected marks').textContent).toBe('')
    })

    test('cancels a plain press, so its click does not select the mark', () => {
      const [a] = renderPlacedBars()
      firePointer('pointerdown', a, 15, 50)
      fireEvent.keyDown(a, { key: 'Escape' })
      firePointer('pointerup', a, 15, 50)
      fireEvent.click(a)
      expect(screen.getByLabelText('selected marks').textContent).toBe('')

      // The next click selects as usual.
      jest.runOnlyPendingTimers()
      fireEvent.click(a)
      expect(screen.getByLabelText('selected marks').textContent).toBe('a')
    })
  })
})
