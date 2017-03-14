import React from 'react'
import TestComponent from './TestComponent'
import css from './styles.css'

const TestComponentDemo = () => {
  return (
    <div>
      <h2 className={css.cool}>Demo of a Test Component</h2>
      <TestComponent name={'Matthew'} />
    </div>
  )
}

export default TestComponentDemo
