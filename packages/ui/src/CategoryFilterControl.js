import Check from '@fortawesome/fontawesome-free/svgs/solid/check.svg'
import { darken, hideVisually, transparentize } from 'polished'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: inline-block;
`

const Button = styled.button`
  box-sizing: border-box;
  width: 35px;
  height: 20px;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-right: 0.75em;
  background: none;
  cursor: pointer;
  user-select: none;
  line-height: 18px;
  outline: none;

  &:active,
  &:hover {
    border-color: ${darken(0.15, '#ddd')};
  }

  &:focus {
    box-shadow: 0 0 0 0.2em ${transparentize(0.5, '#ddd')};
  }

  ::-moz-focus-inner {
    border: 0;
  }
`

const CheckboxIcon = styled.span`
  display: inline-block;
  box-sizing: border-box;
  width: 14px;
  height: 14px;
  padding: 1px;
  border-width: 1px;
  margin: 0 0.7em;
  border-color: #000;
  border-radius: 3px;
  border-style: solid;
  font-size: 10px;
`

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  ${hideVisually()};

  :focus + ${CheckboxIcon} {
    border-color: #428bca;
    box-shadow: 0 0 0 0.2em #428bca;
  }
`

const CategoryWrapper = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  overflow: hidden;
  border-color: ${props => props.borderColor};
  border-style: solid;
  border-width: 1px;

  &:first-child {
    border-top-left-radius: 0.5em;
    border-bottom-left-radius: 0.5em;
  }

  &:last-child {
    border-top-right-radius: 0.5em;
    border-bottom-right-radius: 0.5em;
  }

  @media (max-width: ${props => props.verticalBreakpoint}px) {
    margin-bottom: 0.25em;
    border-radius: 0.5em;
  }
`

const background = ({ backgroundColor }) =>
  `linear-gradient(to right, ${backgroundColor}, ${backgroundColor} 2em, rgba(0, 0, 0, 0) 2em, rgba(0, 0, 0, 0))`

const Label = styled.label`
  display: inline-flex;
  flex-grow: 1;
  align-items: center;
  background: ${background};
  background-repeat: no-repeat;
  font-size: 14px;
  user-select: none;
`

const LabelText = styled.span`
  padding: 0.375em 0.75em;
`

export const CategoryFilterControl = ({
  categories,
  categorySelections,
  className,
  id,
  onChange,
  style,
}) => (
  <Wrapper className={className} id={id} style={style}>
    {categories.map(category => (
      <CategoryWrapper
        key={category.id}
        borderColor={category.color}
        className={category.className}
      >
        <Label
          htmlFor={`${id}-${category.id}`}
          backgroundColor={transparentize(0.5, category.color)}
        >
          <Checkbox
            checked={categorySelections[category.id]}
            id={`${id}-${category.id}`}
            type="checkbox"
            onChange={e => onChange({ ...categorySelections, [category.id]: e.target.checked })}
          />
          <CheckboxIcon aria-hidden>{categorySelections[category.id] && <Check />}</CheckboxIcon>
          <LabelText>{category.label}</LabelText>
        </Label>
        <Button
          onClick={() =>
            onChange(
              categories.reduce(
                (acc, cat) => ({
                  ...acc,
                  [cat.id]: cat.id === category.id,
                }),
                {}
              )
            )
          }
        >
          only
        </Button>
      </CategoryWrapper>
    ))}
  </Wrapper>
)

CategoryFilterControl.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      className: PropTypes.string,
      color: PropTypes.string.isRequired,
    })
  ).isRequired,
  categorySelections: PropTypes.objectOf(PropTypes.bool).isRequired,
  className: PropTypes.string,
  id: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  style: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
}

CategoryFilterControl.defaultProps = {
  className: undefined,
  style: undefined,
}
