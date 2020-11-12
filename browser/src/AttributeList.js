import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor, TooltipHint } from '@gnomad/ui'

const AttributeList = styled.dl`
  dt,
  dd {
    box-sizing: border-box;
    line-height: 1.5;
  }

  dt {
    flex-shrink: 0;
    width: ${props => props.labelWidth}px;
    font-weight: bold;
    text-align: right;
  }

  dd {
    margin-left: 1em;
  }

  @media (max-width: 600px) {
    dt {
      width: auto;
      text-align: left;
    }
  }
`

const AttributeListItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 3px;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`

const AttributeListItem = ({ children, label, tooltip }) => (
  <AttributeListItemWrapper>
    <dt>
      {tooltip ? (
        <TooltipAnchor tooltip={tooltip}>
          <TooltipHint>{label}</TooltipHint>
        </TooltipAnchor>
      ) : (
        label
      )}
    </dt>
    <dd>{children}</dd>
  </AttributeListItemWrapper>
)

AttributeListItem.propTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  tooltip: PropTypes.string,
}

AttributeListItem.defaultProps = {
  tooltip: undefined,
}

AttributeList.Item = AttributeListItem

export default AttributeList
