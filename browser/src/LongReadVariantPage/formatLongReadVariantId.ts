/**
 * Formats a long-read variant identifier for display without changing its
 * canonical identity. Only a leading `chr` prefix is removed.
 */
export const formatLongReadVariantId = (variantId: string): string => variantId.replace(/^chr/i, '')

export default formatLongReadVariantId
