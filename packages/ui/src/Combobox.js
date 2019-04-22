import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import Autocomplete from 'react-autocomplete'
import styled from 'styled-components'

export const Input = styled.input`
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  padding: 0.375em 1.5em 0.375em 0.75em;
  border-color: #6c757d;
  border-style: solid;
  border-width: 1px;
  border-radius: 0.25em;
  background-image: url('data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjB+gC+jP2ptn0WskLQA7');
  background-position: center right;
  background-repeat: no-repeat;
  cursor: pointer;
  font-size: 1em;
  outline: none;

  &:focus {
    box-shadow: 0 0 0 0.2em ${transparentize(0.5, '#428bca')};
  }
`

export const Item = styled.div`
  padding: 0.375em 0.75em;
  background: ${props => (props.isHighlighted ? transparentize(0.5, '#428bca') : 'none')};
  cursor: pointer;
  font-size: 14px;
`

export const menuStyle = {
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
    onChange: PropTypes.func,
    onSelect: PropTypes.func.isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string.isRequired })).isRequired,
    placeholder: PropTypes.string,
    renderOption: PropTypes.func,
    value: PropTypes.string.isRequired,
    width: PropTypes.string,
  }

  static defaultProps = {
    id: undefined,
    onChange: () => {},
    placeholder: undefined,
    renderOption: option => option.label,
    width: undefined,
  }

  constructor(props) {
    super(props)
    this.state = {
      inputValue: props.value,
    }
  }

  onChange = (e, inputValue) => {
    const { onChange } = this.props
    this.setState({ inputValue })
    onChange(inputValue)
  }

  onSelect = (value, item) => {
    const { onSelect } = this.props
    this.setState({ inputValue: item.label })
    onSelect(item)
  }

  shouldItemRender = item => {
    const { inputValue } = this.state
    return item.label.toLowerCase().includes(inputValue.toLowerCase())
  }

  renderInput = props => {
    const { id } = this.props
    // eslint-disable-next-line react/prop-types
    const { ref, ...rest } = props
    return <Input {...rest} id={id} ref={ref} />
  }

  render() {
    const { options, placeholder, renderOption, value, width } = this.props
    const { inputValue } = this.state

    return (
      <Autocomplete
        getItemValue={item => item.label}
        inputProps={{
          onBlur: () => {
            this.setState({ inputValue: value })
          },
          onFocus: () => {
            this.setState({ inputValue: '' })
          },
          placeholder,
        }}
        items={options}
        menuStyle={menuStyle}
        renderInput={this.renderInput}
        renderItem={(item, isHighlighted) => (
          <Item key={item.label} isHighlighted={isHighlighted}>
            {renderOption(item)}
          </Item>
        )}
        shouldItemRender={this.shouldItemRender}
        value={inputValue}
        wrapperStyle={{
          display: 'inline-block',
          width,
        }}
        onChange={this.onChange}
        onSelect={this.onSelect}
      />
    )
  }
}
