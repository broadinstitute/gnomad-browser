import { isY1PilotEnabled } from '../../clickhouse'

// No checked Y1 ancillary source is currently authorized for serving. Keep the
// legacy HGSVC/HPRC path available only when the isolated Y1 pilot is disabled;
// Y1 must fail closed before any legacy ClickHouse query is dispatched.
export const isAncillaryUnavailableForCohort = (
  cohort: string | null | undefined,
  y1Enabled = isY1PilotEnabled
) => y1Enabled || cohort === 'aou'
