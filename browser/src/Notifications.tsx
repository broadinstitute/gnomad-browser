import React, { Component } from 'react'
import styled from 'styled-components'

import PubSub from './PubSub'

const NotificationsAnchor = styled.div`
  position: relative;
  margin-bottom: 20px;
`

const NotificationsContainer = styled.div`
  position: fixed;
  z-index: 1000;
  top: 1rem;

  /* Overflowing page content can widen the layout viewport beyond the screen. */
  left: calc(100vw - 1rem);
  transform: translateX(-100%);
`

const PoliteAnnouncements = styled.div`
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
  white-space: nowrap;
`

const STATUS_COLOR = {
  success: '#2E7D32',
  info: '#424242',
  warning: '#F0C94D',
  error: '#DD2C00',
}

type Status = 'success' | 'info' | 'warning' | 'error'

const Notification = styled.div<{ status: Status }>`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 240px;
  max-width: calc(100vw - 2rem);
  min-height: 30px;
  padding: 0.5rem 0.5rem 0.5rem calc(10px + 0.5rem);
  border: 1px solid #333;
  border-radius: 3px;
  margin-bottom: 1rem;
  background: linear-gradient(
    to right,
    ${(props) => STATUS_COLOR[props.status]} 10px,
    #fafafa 10px
  );
  box-shadow: 2px 2px 5px #3338;
`

const notificationService = new PubSub()

export const showNotification = notificationService.publish.bind(notificationService)

type State = any

class Notifications extends Component<Record<string, never>, State> {
  state = {
    notifications: [],
  }

  removeTimeouts = new Map()

  nextNotificationId = 0

  componentDidMount() {
    notificationService.subscribe(this.addNotification)
  }

  componentWillUnmount() {
    notificationService.unsubscribe(this.addNotification)
    this.removeTimeouts.forEach((timeout: any) => {
      clearTimeout(timeout)
    })
  }

  addNotification = ({ title, message = null, status = 'info', duration = 3 }: any) => {
    const id = `${this.nextNotificationId++}` // eslint-disable-line no-plusplus
    const notification = {
      id,
      title,
      message,
      status,
    }
    this.setState((state: any) => ({
      notifications: [notification, ...state.notifications],
    }))

    this.removeTimeouts.set(
      id,
      setTimeout(() => {
        this.removeNotification(id)
      }, duration * 1000)
    )
  }

  removeNotification(id: any) {
    this.setState((state: any) => ({
      notifications: state.notifications.filter((n: any) => n.id !== id),
    }))
    this.removeTimeouts.delete(id)
  }

  render() {
    const { notifications } = this.state

    return (
      <NotificationsAnchor>
        {/* Keep the polite region mounted; announce additions, not the whole stack or removals. */}
        <PoliteAnnouncements role="status" aria-atomic="false" aria-relevant="additions">
          {notifications
            .filter(({ status }) => status !== 'error')
            .map(({ id, title, message }) => (
              <div key={id} aria-atomic="true">
                {title}
                {message ? <> {message}</> : null}
              </div>
            ))}
        </PoliteAnnouncements>
        <NotificationsContainer>
          {notifications.map((notification) => {
            const { id, title, message, status } = notification
            return (
              <Notification
                key={id}
                status={status}
                role={status === 'error' ? 'alert' : undefined}
                aria-atomic={status === 'error' ? 'true' : undefined}
              >
                <strong>{title}</strong>
                {message}
              </Notification>
            )
          })}
        </NotificationsContainer>
      </NotificationsAnchor>
    )
  }
}

export default Notifications
