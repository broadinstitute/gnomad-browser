import { hideVisually, transparentize } from 'polished'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

const categories = ['lof', 'missense', 'synonymous', 'other']

const categoryColors = {
  lof: '#FF583F',
  missense: '#F0C94D',
  synonymous: 'green',
  other: '#757575',
}

const categoryLabels = {
  lof: 'LoF',
  missense: 'Missense',
  synonymous: 'Synonymous',
  other: 'Other',
}

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  ${hideVisually()};
`

const CheckboxIcon = styled.span`
  position: relative;
  top: 1px;
  left: 1px;
  width: 1em;
  padding: 0.375em 0.5em;
`

const Label = styled.label`
  display: inline-flex;
  overflow: hidden;
  border-color: ${props => props.borderColor};
  border-style: solid;
  border-width: 1px;
  background: ${props =>
    `linear-gradient(to right, ${props.backgroundColor}, ${
      props.backgroundColor
    } 2em, rgba(0, 0, 0, 0) 2em, rgba(0, 0, 0, 0))`};
  cursor: pointer;
  user-select: none;

  &:focus-within {
    box-shadow: ${props => `0 0 0 0.2em ${transparentize(0.5, props.borderColor)}`};
  }

  &:first-child {
    border-top-left-radius: 0.5em;
    border-bottom-left-radius: 0.5em;
  }

  &:last-child {
    border-top-right-radius: 0.5em;
    border-bottom-right-radius: 0.5em;
  }
`

const LabelText = styled.span`
  padding: 0.375em 0.75em;
`

const KEYBOARD_SHORTCUTS = {
  l: 'lof',
  m: 'missense',
  s: 'synonymous',
  o: 'other',
}

export class ConsequenceCategoriesControl extends Component {
  componentDidMount() {
    document.addEventListener('keypress', this.onKeyPress)
  }

  componentWillUnmount() {
    document.removeEventListener('keypress', this.onKeyPress)
  }

  onKeyPress = e => {
    const key = e.key.toLowerCase()
    if (key in KEYBOARD_SHORTCUTS) {
      const toggledCategory = KEYBOARD_SHORTCUTS[key]
      const { categorySelections, onChange } = this.props

      onChange({ ...categorySelections, [toggledCategory]: !categorySelections[toggledCategory] })
    }
  }

  render() {
    const { categorySelections, id, onChange } = this.props

    return (
      <div>
        {categories.map(category => (
          <Label
            key={category}
            backgroundColor={transparentize(0.5, categoryColors[category])}
            borderColor={categoryColors[category]}
            htmlFor={`${id}-${category}`}
          >
            <Checkbox
              checked={categorySelections[category]}
              id={`${id}-${category}`}
              type="checkbox"
              onChange={e => onChange({ ...categorySelections, [category]: e.target.checked })}
            />
            <CheckboxIcon
              aria-hidden
              className={`fa ${categorySelections[category] ? 'fa-check-square-o' : 'fa-square-o'}`}
            />
            <LabelText>{categoryLabels[category]}</LabelText>
          </Label>
        ))}
      </div>
    )
  }
}

ConsequenceCategoriesControl.propTypes = {
  categorySelections: PropTypes.shape({
    lof: PropTypes.bool.isRequired,
    missense: PropTypes.bool.isRequired,
    synonymous: PropTypes.bool.isRequired,
    other: PropTypes.bool.isRequired,
  }).isRequired,
  id: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}
