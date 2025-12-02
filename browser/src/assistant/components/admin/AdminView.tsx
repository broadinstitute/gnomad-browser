import React from 'react'
import styled from 'styled-components'
import { ChatFeedbackView } from './ChatFeedbackView'
import { UsersView } from './UsersView'

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f7f7f7;
  overflow: hidden;
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
  activeSection: string
  onSectionChange: (section: string) => void
}

type AdminSection = 'feedback' | 'users'

export const AdminView: React.FC<AdminViewProps> = ({
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
