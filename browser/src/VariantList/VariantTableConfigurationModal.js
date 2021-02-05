import { hideVisually } from 'polished'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'
import DownArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-down.svg'
import UpArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-up.svg'

import { Badge, Button, Modal, PrimaryButton } from '@gnomad/ui'

const ColumnList = styled.ol`
  padding: 0;
  line-height: 1.5;
`

const ColumnListItem = styled.li`
  display: flex;
  align-items: center;
  padding: 0.5em 0;
  border-bottom: 1px solid #ddd;
`

const ColumnLabel = styled.label`
  display: flex;
  flex-grow: 1;
  align-items: center;

  input {
    margin-right: 1em;
  }
`

const ReorderColumnButton = styled(Button)`
  width: 28px;
  height: 28px;
  padding: 0;
  margin-left: 1ch;
  text-align: center;

  img {
    width: 12px;
    height: 12px;
  }

  &:disabled {
    img {
      opacity: 0.25;
    }
  }
`

const getContextType = context => {
  if (context.transcript_id) {
    return 'transcript'
  }
  if (context.gene_id) {
    return 'gene'
  }
  return 'region'
}

const TableColumnSelectionModal = ({
  availableColumns,
  context,
  defaultColumns,
  selectedColumns,
  onCancel,
  onSave,
}) => {
  const contextType = getContextType(context)

  const [columnPreferences, setColumnPreferences] = useState(
    availableColumns
      .filter(column => column.key !== 'variant_id')
      .map(column => {
        const selectionIndex = selectedColumns.indexOf(column.key)
        return {
          ...column,
          isSelected: selectionIndex !== -1,
          sortOrder:
            selectionIndex !== -1
              ? selectionIndex
              : selectedColumns.length + availableColumns.findIndex(c => c.key === column.key),
        }
      })
      .sort((colA, colB) => colA.sortOrder - colB.sortOrder)
  )

  return (
    <Modal
      id="table-column-selection"
      title="Configure table"
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <PrimaryButton
            onClick={() => {
              onSave(columnPreferences.filter(c => c.isSelected).map(c => c.key))
            }}
            style={{ marginLeft: '1ch' }}
          >
            Save
          </PrimaryButton>
        </>
      }
      onRequestClose={onCancel}
    >
      <p>
        Select columns to include and their order in the variant table. The first column will always
        be the variant ID.
      </p>
      <ColumnList>
        {columnPreferences.map((column, columnIndex) => {
          return (
            <ColumnListItem key={column.key}>
              <ColumnLabel htmlFor={`column-selection-${column.key}`}>
                <input
                  type="checkbox"
                  id={`column-selection-${column.key}`}
                  checked={column.isSelected}
                  onChange={e => {
                    setColumnPreferences(
                      columnPreferences.map(c => {
                        return {
                          ...c,
                          isSelected: c.key === column.key ? e.target.checked : c.isSelected,
                        }
                      })
                    )
                  }}
                />
                <div>
                  {column.heading}
                  <br />
                  {column.description}
                  {column.shouldShowInContext &&
                    column.shouldShowInContext(context, contextType) === false &&
                    column.contextNotes && (
                      <>
                        <br />
                        <Badge level="info">Note</Badge> {column.contextNotes}
                      </>
                    )}
                </div>
              </ColumnLabel>

              <ReorderColumnButton
                disabled={columnIndex === 0}
                onClick={() => {
                  setColumnPreferences([
                    ...columnPreferences.slice(0, columnIndex - 1),
                    columnPreferences[columnIndex],
                    columnPreferences[columnIndex - 1],
                    ...columnPreferences.slice(columnIndex + 1),
                  ])
                }}
              >
                <span style={hideVisually()}>Move column up</span>
                <img src={UpArrow} alt="" aria-hidden="true" />
              </ReorderColumnButton>
              <ReorderColumnButton
                disabled={columnIndex === columnPreferences.length - 1}
                onClick={() => {
                  setColumnPreferences([
                    ...columnPreferences.slice(0, columnIndex),
                    columnPreferences[columnIndex + 1],
                    columnPreferences[columnIndex],
                    ...columnPreferences.slice(columnIndex + 2),
                  ])
                }}
              >
                <span style={hideVisually()}>Move column down</span>
                <img src={DownArrow} alt="" aria-hidden="true" />
              </ReorderColumnButton>
            </ColumnListItem>
          )
        })}
      </ColumnList>
      <Button
        onClick={() =>
          setColumnPreferences(
            availableColumns
              .filter(column => column.key !== 'variant_id')
              .map(column => {
                const selectionIndex = defaultColumns.indexOf(column.key)
                return {
                  ...column,
                  isSelected: selectionIndex !== -1,
                  sortOrder:
                    selectionIndex !== -1
                      ? selectionIndex
                      : defaultColumns.length +
                        availableColumns.findIndex(c => c.key === column.key),
                }
              })
              .sort((colA, colB) => colA.sortOrder - colB.sortOrder)
          )
        }
      >
        Restore defaults
      </Button>
    </Modal>
  )
}

TableColumnSelectionModal.propTypes = {
  availableColumns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      heading: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ).isRequired,
  context: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  defaultColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default TableColumnSelectionModal
