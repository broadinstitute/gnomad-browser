import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

const VariantAttributeLabel = styled.dt`
  display: inline;
  font-weight: bold;
`

const VariantAttributeValue = styled.dd`
  display: inline;
  margin-left: 0.5em;
`

const VariantAttributeListItem = styled.div`
  margin-bottom: 0.25em;
`

export function VariantAttribute({ children, label }) {
  return (
    <VariantAttributeListItem>
      <VariantAttributeLabel>{label}:</VariantAttributeLabel>
      <VariantAttributeValue>{children === null ? '—' : children}</VariantAttributeValue>
    </VariantAttributeListItem>
  )
}

VariantAttribute.propTypes = {
  children: PropTypes.node,
  label: PropTypes.string.isRequired,
}

VariantAttribute.defaultProps = {
  children: null,
}

export function VariantAttributeList({ children, label }) {
  return (
    <div>
      <h2>{label}</h2>
      <dl>{children}</dl>
    </div>
  )
}

VariantAttributeList.propTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
}
