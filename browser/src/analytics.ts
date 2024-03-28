export const logAnalyticsEvent = (
  eventName: string,
  eventCategory: string,
  eventLabel: string
): void => {
  if ((window as any).gtag) {
    ;(window as any).gtag('event', eventName, {
      event_category: eventCategory,
      event_label: eventLabel,
    })
  }

  return undefined
}

export const logButtonClick = (eventLabel: string): void => {
  logAnalyticsEvent('button_click', 'User Interaction', eventLabel)
}
