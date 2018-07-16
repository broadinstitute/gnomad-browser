import Mousetrap from 'mousetrap'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

const SearchWrapper = styled.div`
  font-size: 14px;
  position: relative;
  width: 210px;
`

const SearchInput = styled.input`
  appearance: none;
  background: none;
  border-color: #000;
  border-style: solid;
  border-width: 0 0 1px 0;
  box-sizing: border-box;
  padding: 0.25em 0.75em;
  transition: width 0.4s ease-in-out;
  width: 100%;

  &:focus {
    border-color: rgb(70, 130, 180);
    box-shadow: 0 0.3em 0.2em -0.2em rgba(70, 130, 180, 0.5);
    padding-right: 1.75em;
  }
`

const ClearSearchButton = styled.button`
  appearance: none;
  background: none;
  border: none;
  box-sizing: border-box;
  cursor: pointer;
  height: 1.5em;
  position: absolute;
  right: 0;
  top: 0;

  &:active, &:hover {
    color: rgb(40, 94, 142);
  }
`

const SEARCH_KEYBOARD_SHORTCUTS = ['command+f', 'meta+s']

export class Search extends Component {
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
    if (this.props.withKeyboardShortcuts) {
      Mousetrap.bind(SEARCH_KEYBOARD_SHORTCUTS, (e) => {
        if (this.input) {
          e.preventDefault()
          this.input.focus()
        }
      })
    }
  }

  componentWillUnmount() {
    if (this.boundKeyboardShortcuts) {
      Mousetrap.unbind(SEARCH_KEYBOARD_SHORTCUTS)
    }
  }

  onChange = (e) => {
    const value = e.target.value
    this.setState({ value })
    this.props.onChange(value)
  }

  onClear = () => {
    this.setState({ value: '' })
    this.props.onChange('')
  }

  onKeyDown = (e) => {
    if (e.key === 'Escape') {
      this.onClear()
    }
  }

  inputRef = (el) => {
    this.input = el
  }

  render() {
    return (
      <SearchWrapper>
        <SearchInput
          autoComplete="off"
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
          placeholder={this.props.placeholder}
          innerRef={this.inputRef}
          type="text"
          value={this.state.value}
        />
        {this.state.value && (
          <ClearSearchButton
            aria-label="Clear"
            onClick={this.onClear}
            type="button"
          >&times;</ClearSearchButton>
        )}
      </SearchWrapper>
    )
  }
}
