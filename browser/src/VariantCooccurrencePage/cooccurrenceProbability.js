export const renderCooccurrenceProbability = probability => {
  if (probability === null) {
    return '–'
  }

  if (probability === 0) {
    return '0%'
  }

  if (probability < 0.01) {
    return '<1%'
  }

  return `${Math.round(probability * 100)}%`
}
