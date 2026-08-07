export type BackgroundRow<Haplotype, Diplotype> =
  | { type: 'cluster' }
  | { type: 'group'; group: Haplotype; isChild: boolean }
  | { type: 'diplotype'; group: Diplotype & { is_roh: boolean } }

export type RowBackgroundRect<Group> = {
  groupStart: number
  groupStop: number
  rowY: number
  color: [number, number, number, number]
  group: Group | null
  height?: number
}

/**
 * Build the non-interactive background geometry for a haplotype row.
 * Row/group variant bounds deliberately do not participate: every background
 * covers the complete visible genomic region.
 */
export function getRowBackgroundRects<Haplotype, Diplotype>(
  row: BackgroundRow<Haplotype, Diplotype>,
  rowY: number,
  regionStart: number,
  regionStop: number,
  diplotypeSecondCopyOffset = 25
): RowBackgroundRect<Haplotype | Diplotype>[] {
  const bounds = { groupStart: regionStart, groupStop: regionStop }

  if (row.type === 'diplotype') {
    const color: [number, number, number, number] = [232, 238, 248, 255]
    if (row.group.is_roh && diplotypeSecondCopyOffset === 25) {
      return [{ ...bounds, rowY: rowY - 2, color, group: row.group, height: 40 }]
    }
    return [
      { ...bounds, rowY: rowY - 2, color, group: row.group, height: 19 },
      { ...bounds, rowY: rowY + diplotypeSecondCopyOffset - 4, color, group: row.group, height: 19 },
    ]
  }

  if (row.type === 'cluster') {
    return [{ ...bounds, rowY, color: [215, 225, 240, 255], group: null }]
  }

  const color: [number, number, number, number] = row.isChild
    ? [230, 235, 250, 255]
    : [240, 240, 240, 255]
  return [{ ...bounds, rowY, color, group: row.group }]
}
