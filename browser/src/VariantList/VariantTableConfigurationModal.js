import { hideVisually } from 'polished'
import PropTypes from 'prop-types'
import React, { useCallback, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import styled from 'styled-components'
import DownArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-down.svg'
import UpArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-up.svg'
import GripLines from '@fortawesome/fontawesome-free/svgs/solid/grip-lines.svg'

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
  background: #fafafa;
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

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)

  return result
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

  const onDragEnd = useCallback(
    result => {
      if (!result.destination) {
        return
      }

      setColumnPreferences(
        reorder(columnPreferences, result.source.index, result.destination.index)
      )
    },
    [columnPreferences]
  )

  return (
    <Modal
      id="table-column-selection"
      size="large"
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
        Select columns to include in the variant table. Drag and drop or use the up/down buttons to
        reorder columns. The first column in the table will always be the variant ID.
      </p>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {droppableProvided => (
            <ColumnList ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              {columnPreferences.map((column, columnIndex) => {
                return (
                  <Draggable key={column.key} draggableId={column.key} index={columnIndex}>
                    {draggableProvided => (
                      <ColumnListItem
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.dragHandleProps}
                        {...draggableProvided.draggableProps}
                      >
                        <img
                          src={GripLines}
                          alt=""
                          aria-hidden="true"
                          width={16}
                          height={16}
                          style={{ marginRight: '15px' }}
                        />

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
                                    isSelected:
                                      c.key === column.key ? e.target.checked : c.isSelected,
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
                    )}
                  </Draggable>
                )
              })}
              {droppableProvided.placeholder}
            </ColumnList>
          )}
        </Droppable>
      </DragDropContext>

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
