import { darken, hideVisually, transparentize } from 'polished'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'


const SegmentedControlContainer = styled.span`
  background-color: ${props => props.backgroundColor};
  border-color: ${props => props.borderColor};
  border-style: solid;
  border-width: 1px;
  border-radius: 0.5em;
  box-shadow: ${props => props.isFocused ? `0 0 0 0.2em ${transparentize(0.5, props.borderColor)}` : 'none'};
  color: ${props => props.textColor};
  cursor: pointer;
  display: inline-flex;
  flex-direction: row;
  justify-content: space-between;
  position: relative;
  user-select: none;

  input {
    ${hideVisually()}
  }

  label {
    border: 1px solid transparent;
    padding: 0.25em 0.75em;

    &:first-of-type {
      border-bottom-left-radius: 0.5em;
      border-top-left-radius: 0.5em;
    }

    &:last-of-type {
      border-bottom-right-radius: 0.5em;
      border-top-right-radius: 0.5em;
    }
  }

  input:checked + label {
    background-color: ${props => darken(0.15, props.backgroundColor)}
  }
`


export class SegmentedControl extends Component {
  static propTypes = {
    backgroundColor: PropTypes.string,
    borderColor: PropTypes.string,
    disabled: PropTypes.bool,
    id: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        disabled: PropTypes.bool,
        label: PropTypes.string,
        value: PropTypes.oneOfType([
          PropTypes.bool,
          PropTypes.number,
          PropTypes.string,
        ]),
      })
    ).isRequired,
    textColor: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.number,
      PropTypes.string,
    ]).isRequired,
  }

  static defaultProps = {
    backgroundColor: '#f8f9fa',
    borderColor: '#6c757d',
    disabled: false,
    textColor: '#000',
  }

  state = {
    isFocused: false,
  }

  onBlur = () => {
    this.setState({ isFocused: false })
  }

  onChange = (e) => {
    const selectedIndex = parseInt(e.target.value, 10)
    const selectedOption = this.props.options[selectedIndex]
    this.props.onChange(selectedOption.value)
  }

  onFocus = () => {
    this.setState({ isFocused: true })
  }

  render() {
    const {
      backgroundColor,
      borderColor,
      disabled,
      id,
      options,
      textColor,
      value,
    } = this.props

    return (
      <SegmentedControlContainer
        backgroundColor={backgroundColor}
        borderColor={borderColor}
        isFocused={this.state.isFocused}
        textColor={textColor}
      >
        {options.map((opt, index) => [
          <input
            key={`${opt.value}-input`}
            checked={opt.value === value}
            disabled={disabled || opt.disabled}
            id={`segmented-control-input-${id}-${opt.value}`}
            type="radio"
            value={index}
            onBlur={this.onBlur}
            onChange={this.onChange}
            onFocus={this.onFocus}
          />,
          <label
            key={`${opt.value}-label`}
            htmlFor={`segmented-control-input-${id}-${opt.value}`}
          >
            {opt.label || opt.value}
          </label>
        ])}
      </SegmentedControlContainer>
    )
  }
}
