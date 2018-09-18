import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import Autocomplete from 'react-autocomplete'
import styled from 'styled-components'

const Input = styled.input`
  box-sizing: border-box;
  max-width: 100%;
  padding: 0.375em 1.5em 0.375em 0.75em;
  border-color: #6c757d;
  border-style: solid;
  border-width: 1px;
  border-radius: 0.25em;
  background-image: url('data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjB+gC+jP2ptn0WskLQA7');
  background-position: center right;
  background-repeat: no-repeat;
  color: ${props => props.textColor};
  cursor: pointer;
  font-size: 1em;
  outline: none;
  user-select: none;

  &:focus {
    box-shadow: 0 0 0 0.2em ${transparentize(0.5, '#428bca')};
  }
`

const Item = styled.div`
  padding: 0.375em 0.75em;
  background: ${props => (props.isHighlighted ? transparentize(0.5, '#428bca') : 'none')};
  cursor: pointer;
  font-size: 14px;
`

const menuStyle = {
  position: 'fixed',
  zIndex: 1,
  overflow: 'auto',
  maxHeight: '50%',
  padding: '2px 0',
  borderRadius: '3px',
  background: '#fff',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
}

export class Combobox extends Component {
  static propTypes = {
    id: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    options: PropTypes.arrayOf(
      PropTypes.shape({ label: PropTypes.string.isRequired, value: PropTypes.string.isRequired })
    ).isRequired,
    value: PropTypes.string.isRequired,
    width: PropTypes.string,
  }

  static defaultProps = {
    id: undefined,
    width: undefined,
  }

  constructor(props) {
    super(props)
    this.state = {
      inputValue: this.props.value,
    }
  }

  onChange = (e, inputValue) => {
    this.setState({ inputValue })
  }

  onSelect = value => {
    const selectedOption = this.props.options.find(opt => opt.value === value)
    this.setState({ inputValue: selectedOption.label })
    this.props.onChange(value)
  }

  shouldItemRender = item => item.label.toLowerCase().includes(this.state.inputValue.toLowerCase())

  renderInput = props => {
    // eslint-disable-next-line react/prop-types
    const { ref, ...rest } = props
    return <Input {...rest} id={this.props.id} innerRef={ref} />
  }

  render() {
    return (
      <Autocomplete
        getItemValue={item => item.value}
        inputProps={{
          onBlur: () => {
            this.setState({ inputValue: this.props.value })
          },
        }}
        items={this.props.options}
        menuStyle={menuStyle}
        renderInput={this.renderInput}
        renderItem={(item, isHighlighted) => (
          <Item isHighlighted={isHighlighted}>{item.label}</Item>
        )}
        shouldItemRender={this.shouldItemRender}
        value={this.state.inputValue}
        wrapperStyle={{
          display: 'inline-block',
          width: this.props.width,
        }}
        onChange={this.onChange}
        onSelect={this.onSelect}
      />
    )
  }
}
