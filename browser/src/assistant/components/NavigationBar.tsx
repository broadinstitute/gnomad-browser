import React from 'react'
import styled from 'styled-components'
// @ts-expect-error TS(2307)
import CommentIcon from '@fortawesome/fontawesome-free/svgs/solid/comment.svg'
// @ts-expect-error TS(2307)
import CogIcon from '@fortawesome/fontawesome-free/svgs/solid/cog.svg'
// @ts-expect-error TS(2307)
import UserShieldIcon from '@fortawesome/fontawesome-free/svgs/solid/user-shield.svg'

const NavBarContainer = styled.div`
  display: flex;
  background: white;
  border-bottom: 2px solid #e0e0e0;
  flex-shrink: 0;
`

const NavTab = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  border: none;
  background: ${props => props.active ? '#f0f7fd' : 'transparent'};
  color: ${props => props.active ? '#0d79d0' : '#666'};
  font-size: 14px;
  font-weight: ${props => props.active ? '600' : '500'};
  cursor: pointer;
  border-bottom: 3px solid ${props => props.active ? '#0d79d0' : 'transparent'};
  transition: all 0.2s;
  position: relative;
  top: 2px;

  img {
    width: 16px;
    height: 16px;
    opacity: ${props => props.active ? '1' : '0.6'};
  }

  &:hover {
    background: #f0f7fd;
    color: #0d79d0;
  }

  &:hover img {
    opacity: 1;
  }
`

interface NavigationBarProps {
  activeView: 'chat' | 'settings' | 'admin' | null
  onNavigate: (view: 'chat' | 'settings' | 'admin') => void
  canAccessAdmin: boolean
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeView,
  onNavigate,
  canAccessAdmin,
}) => {
  // Default to 'chat' if no view is active
  const currentView = activeView || 'chat'

  return (
    <NavBarContainer>
      <NavTab
        active={currentView === 'chat'}
        onClick={() => onNavigate('chat')}
      >
        <img src={CommentIcon} alt="Chat" />
        Chat
      </NavTab>
      <NavTab
        active={currentView === 'settings'}
        onClick={() => onNavigate('settings')}
      >
        <img src={CogIcon} alt="Settings" />
        Settings
      </NavTab>
      {canAccessAdmin && (
        <NavTab
          active={currentView === 'admin'}
          onClick={() => onNavigate('admin')}
        >
          <img src={UserShieldIcon} alt="Admin" />
          Admin
        </NavTab>
      )}
    </NavBarContainer>
  )
}
