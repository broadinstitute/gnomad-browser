export const textOrMissingTextWarning = (
  entityType: string,
  textMapping: Record<string, string>,
  key: string
) => textMapping[key] || `TEXT NEEDED FOR ${entityType.toUpperCase()} "${key}"`
