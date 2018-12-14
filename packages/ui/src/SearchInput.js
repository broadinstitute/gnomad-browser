import Mousetrap from 'mousetrap'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

const Wrapper = styled.div`
  position: relative;
  width: 210px;
  border-bottom: 1px solid #000;
  font-size: 14px;
`

const Input = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 0.375em 0.75em;
  border: 1px solid transparent;
  border-radius: 0.25em;
  appearance: none;
  background: none;

  &:focus {
    outline: none;
    border-color: rgb(70, 130, 180);
    box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5);
    padding-right: 1.75em;
  }
`

const ClearButton = styled.button.attrs({ type: 'button' })`
  position: absolute;
  top: 0;
  right: 0;
  box-sizing: border-box;
  height: 100%;
  border: none;
  appearance: none;
  background: none;
  cursor: pointer;
  outline: none;

  &:active,
  &:hover {
    color: rgb(40, 94, 142);
  }
`

export class SearchInput extends Component {
  static propTypes = {
    placeholder: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    withKeyboardShortcuts: PropTypes.bool,
  }

  static defaultProps = {
    placeholder: 'Search',
    withKeyboardShortcuts: false,
  }

  state = {
    value: '',
  }

  componentDidMount() {
    const { withKeyboardShortcuts } = this.props
    if (withKeyboardShortcuts) {
      Mousetrap.bind('/', e => {
        if (this.input) {
          e.preventDefault()
          this.input.focus()
        }
      })
    }
  }

  componentWillUnmount() {
    if (this.boundKeyboardShortcuts) {
      Mousetrap.unbind('/')
    }
  }

  onChange = e => {
    const { onChange } = this.props
    const { value } = e.target
    this.setState({ value })
    onChange(value)
  }

  onClear = () => {
    const { onChange } = this.props
    this.setState({ value: '' })
    onChange('')
  }

  onKeyDown = e => {
    if (e.key === 'Escape') {
      this.onClear()
    }
  }

  inputRef = el => {
    this.input = el
  }

  render() {
    const { placeholder } = this.props
    const { value } = this.state

    return (
      <Wrapper>
        <Input
          autoComplete="off"
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
          placeholder={placeholder}
          innerRef={this.inputRef}
          type="text"
          value={value}
        />
        {value && (
          <ClearButton aria-label="Clear" tabIndex={-1} onClick={this.onClear}>
            &times;
          </ClearButton>
        )}
      </Wrapper>
    )
  }
}
