import Mousetrap from 'mousetrap'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

const SearchWrapper = styled.div`
  display: flex;
  flex-direction: row;
  font-size: 14px;
  align-items: center;
`

const SearchInput = styled.input`
  height: 25px;
  width: 210px;
  border: 0;
  border-bottom: 1px solid #000;
  background-color: transparent;
  text-indent: 5px;
  -webkit-transition: width 0.4s ease-in-out;
  transition: width 0.4s ease-in-out;
`

const ClearSearchButton = styled.button`
  margin-left: 5px;
  height: 20px;
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

  inputRef = (el) => {
    this.input = el
  }

  render() {
    return (
      <SearchWrapper>
        <SearchInput
          autoComplete="off"
          onChange={this.onChange}
          placeholder={this.props.placeholder}
          innerRef={this.inputRef}
          type="text"
          value={this.state.value}
        />
        <ClearSearchButton
          onClick={this.onClear}
          type="button"
        >Clear</ClearSearchButton>
      </SearchWrapper>
    )
  }
}
