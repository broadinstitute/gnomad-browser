import { hideVisually } from 'polished'
import React, { useCallback, useState } from 'react'
// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module 'reac... Remove this comment to see the full error message
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import styled from 'styled-components'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import DownArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-down.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
import UpArrow from '@fortawesome/fontawesome-free/svgs/solid/arrow-up.svg'
// @ts-expect-error TS(2307) FIXME: Cannot find module '@fortawesome/fontawesome-free/... Remove this comment to see the full error message
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

const getContextType = (context: any) => {
  if (context.transcript_id) {
    return 'transcript'
  }
  if (context.gene_id) {
    return 'gene'
  }
  return 'region'
}

const reorder = (list: any, startIndex: any, endIndex: any) => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)

  return result
}

type TableColumnSelectionModalProps = {
  availableColumns: {
    key: string
    heading: string
    description?: string
  }[]
  context: any
  defaultColumns: string[]
  selectedColumns: string[]
  onCancel: (...args: any[]) => any
  onSave: (...args: any[]) => any
}

const TableColumnSelectionModal = ({
  availableColumns,
  context,
  defaultColumns,
  selectedColumns,
  onCancel,
  onSave,
}: TableColumnSelectionModalProps) => {
  const contextType = getContextType(context)

  const [columnPreferences, setColumnPreferences] = useState(
    availableColumns
      .filter((column) => column.key !== 'variant_id')
      .map((column) => {
        const selectionIndex = selectedColumns.indexOf(column.key)
        return {
          ...column,
          isSelected: selectionIndex !== -1,
          selectionIndex,
        }
      })
      .sort((colA, colB) => {
        const isColASelected = colA.selectionIndex !== -1
        const isColBSelected = colB.selectionIndex !== -1

        if (isColASelected && isColBSelected) {
          return colA.selectionIndex - colB.selectionIndex
        }
        if (isColASelected && !isColBSelected) {
          return -1
        }
        if (!isColASelected && isColBSelected) {
          return 1
        }
        return colA.heading.localeCompare(colB.heading)
      })
  )

  const onDragEnd = useCallback(
    // @ts-expect-error TS(7006) FIXME: Parameter 'result' implicitly has an 'any' type.
    (result) => {
      if (!result.destination) {
        return
      }

      setColumnPreferences(
        // @ts-expect-error TS(2345) FIXME: Argument of type 'unknown[]' is not assignable to ... Remove this comment to see the full error message
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
              onSave(columnPreferences.filter((c) => c.isSelected).map((c) => c.key))
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
          {(droppableProvided: any) => (
            <ColumnList ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              {columnPreferences.map((column, columnIndex) => {
                return (
                  <Draggable key={column.key} draggableId={column.key} index={columnIndex}>
                    {(draggableProvided: any) => (
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
                            onChange={(e) => {
                              setColumnPreferences(
                                columnPreferences.map((c) => {
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
                            {(column as any).shouldShowInContext &&
                              (column as any).shouldShowInContext(context, contextType) === false &&
                              (column as any).contextNotes && (
                                <>
                                  <br />
                                  <Badge level="info">Note</Badge> {(column as any).contextNotes}
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
              .filter((column) => column.key !== 'variant_id')
              .map((column) => {
                const selectionIndex = defaultColumns.indexOf(column.key)
                return {
                  ...column,
                  isSelected: selectionIndex !== -1,
                  selectionIndex,
                }
              })
              .sort((colA, colB) => {
                const isColASelected = colA.selectionIndex !== -1
                const isColBSelected = colB.selectionIndex !== -1

                if (isColASelected && isColBSelected) {
                  return colA.selectionIndex - colB.selectionIndex
                }
                if (isColASelected && !isColBSelected) {
                  return -1
                }
                if (!isColASelected && isColBSelected) {
                  return 1
                }
                return colA.heading.localeCompare(colB.heading)
              })
          )
        }
      >
        Restore defaults
      </Button>
    </Modal>
  )
}

export default TableColumnSelectionModal
