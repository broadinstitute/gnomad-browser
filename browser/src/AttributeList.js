import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { TooltipAnchor, TooltipHint } from '@gnomad/ui'

const AttributeList = styled.dl`
  margin: 0;

  dt,
  dd {
    display: inline-block;
    line-height: 1.75;
  }

  dt {
    font-weight: bold;
    vertical-align: top;
  }

  dd {
    margin-left: 0.5ch;
  }

  @media (max-width: 600px) {
    dt,
    dd {
      display: block;
    }

    dd {
      margin-left: 2ch;
    }
  }
`

const AttributeListItem = ({ children, label, tooltip }) => (
  <div>
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
  </div>
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
