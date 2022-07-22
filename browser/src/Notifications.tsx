import React, { Component } from 'react'
import styled from 'styled-components'

import PubSub from './PubSub'

const NotificationsAnchor = styled.div`
  position: relative;
  margin-bottom: 20px;
`

const NotificationsContainer = styled.div`
  position: absolute;
  z-index: 2;
  top: 1rem;
  right: 1rem;
`

const STATUS_COLOR = {
  success: '#2E7D32',
  info: '#424242',
  warning: '#F0C94D',
  error: '#DD2C00',
}

const Notification = styled.div`
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 240px;
  min-height: 30px;
  padding: 0.5rem 0.5rem 0.5rem calc(10px + 0.5rem);
  border: 1px solid #333;
  border-radius: 3px;
  margin-bottom: 1rem;
  background: linear-gradient(
    to right,
    ${(props: any) =>
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        STATUS_COLOR[props.status]}
      10px,
    #fafafa 10px
  );
  box-shadow: 2px 2px 5px #3338;
`

const notificationService = new PubSub()

export const showNotification = notificationService.publish.bind(notificationService)

type State = any

class Notifications extends Component<{}, State> {
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
        <NotificationsContainer>
          {notifications.map((notification) => {
            const { id, title, message, status } = notification
            return (
              // @ts-expect-error TS(2769) FIXME: No overload matches this call.
              <Notification key={id} status={status}>
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
