import { GraphQLError } from 'graphql'

export const JOINED_METHYLATION_PUBLIC_ERROR_CODES = [
  'BAD_USER_INPUT',
  'JOINED_METHYLATION_CONTRACT_MISMATCH',
  'JOINED_METHYLATION_RESULT_TOO_LARGE',
] as const

export type JoinedMethylationPublicErrorCode =
  (typeof JOINED_METHYLATION_PUBLIC_ERROR_CODES)[number]

export type JoinedMethylationSafeContext = {
  reason: string
  source_run_id?: string
  orientation_receipt_sha256?: string
  chrom?: string
  start?: number
  stop?: number
}

const publicCodes = new Set<string>(JOINED_METHYLATION_PUBLIC_ERROR_CODES)

export const joinedMethylationError = (
  code: JoinedMethylationPublicErrorCode,
  message: string,
  safeContext?: JoinedMethylationSafeContext
) =>
  new GraphQLError(message, undefined, undefined, undefined, undefined, undefined, {
    code,
    isUserVisible: true,
    joinedMethylationPublic: true,
    joinedMethylationInternal: code === 'JOINED_METHYLATION_CONTRACT_MISMATCH',
    ...(safeContext ? { joinedMethylationSafeContext: safeContext } : {}),
  })

export const joinedMethylationPublicCode = (
  error: Pick<GraphQLError, 'extensions'>
): JoinedMethylationPublicErrorCode | null => {
  const code = error.extensions?.code
  return error.extensions?.joinedMethylationPublic === true &&
    typeof code === 'string' &&
    publicCodes.has(code)
    ? (code as JoinedMethylationPublicErrorCode)
    : null
}

export const joinedMethylationInternalContext = (
  error: Pick<GraphQLError, 'extensions'>
): JoinedMethylationSafeContext | null => {
  if (error.extensions?.joinedMethylationInternal !== true) return null
  const context = error.extensions?.joinedMethylationSafeContext
  if (!context || typeof context !== 'object' || typeof (context as any).reason !== 'string') {
    return { reason: 'joined_methylation_contract_mismatch' }
  }
  return context as JoinedMethylationSafeContext
}
