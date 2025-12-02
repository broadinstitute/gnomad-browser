import React from 'react'
import styled from 'styled-components'
import { ChatFeedbackView } from './ChatFeedbackView'
import { UsersView } from './UsersView'
// @ts-expect-error TS(2307)
import CloseIcon from '@fortawesome/fontawesome-free/svgs/solid/times.svg'

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f7f7f7;
  overflow: hidden;
`

const SettingsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
`

const SettingsTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`

const HeaderButton = styled.button`
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;

  img {
    width: 16px;
    height: 16px;
    opacity: 0.6;
    display: block;
  }

  &:hover img {
    opacity: 1;
  }
`

const SettingsBody = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`

const SettingsNav = styled.nav`
  width: 180px;
  background: white;
  border-right: 1px solid #e0e0e0;
  padding: 12px 0;
  overflow-y: auto;
`

const NavItem = styled.button<{ active: boolean }>`
  width: 100%;
  padding: 10px 20px;
  border: none;
  background: ${props => props.active ? '#f0f7fd' : 'transparent'};
  color: ${props => props.active ? '#0d79d0' : '#333'};
  font-size: 14px;
  font-weight: ${props => props.active ? '600' : '400'};
  text-align: left;
  cursor: pointer;
  border-left: 3px solid ${props => props.active ? '#0d79d0' : 'transparent'};
  transition: all 0.2s;

  &:hover {
    background: #f0f7fd;
  }
`

const SettingsContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  overflow-y: auto;
  background: #f7f7f7;
`

const SectionTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
`

interface AdminViewProps {
  onClose: () => void
  activeSection: string
  onSectionChange: (section: string) => void
}

type AdminSection = 'feedback' | 'users'

export const AdminView: React.FC<AdminViewProps> = ({
  onClose,
  activeSection: activeSectionProp,
  onSectionChange,
}) => {
  const activeSection = (activeSectionProp || 'feedback') as AdminSection

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'feedback':
        return (
            <>
                <SectionTitle>User Feedback</SectionTitle>
                <ChatFeedbackView />
            </>
        )
      case 'users':
        return (
            <>
                <SectionTitle>Users</SectionTitle>
                <UsersView />
            </>
        )
      default:
        return null
    }
  }

  return (
    <SettingsContainer>
      <SettingsHeader>
        <SettingsTitle>Admin Panel</SettingsTitle>
        <HeaderButton onClick={onClose} title="Close admin panel">
          <img src={CloseIcon} alt="Close" />
        </HeaderButton>
      </SettingsHeader>
      <SettingsBody>
        <SettingsNav>
          <NavItem
            active={activeSection === 'feedback'}
            onClick={() => onSectionChange('feedback')}
          >
            Feedback
          </NavItem>
          <NavItem
            active={activeSection === 'users'}
            onClick={() => onSectionChange('users')}
          >
            Users
          </NavItem>
        </SettingsNav>
        <SettingsContent>
          {renderSectionContent()}
        </SettingsContent>
      </SettingsBody>
    </SettingsContainer>
  )
}
