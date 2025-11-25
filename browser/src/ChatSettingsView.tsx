import React, { useState } from 'react'
import styled from 'styled-components'
import { useAuth0 } from '@auth0/auth0-react'
import { Button, PrimaryButton } from '@gnomad/ui'
// @ts-expect-error TS(2307)
import CloseIcon from '@fortawesome/fontawesome-free/svgs/solid/times.svg'
// @ts-expect-error TS(2307)
import SignOutIcon from '@fortawesome/fontawesome-free/svgs/solid/sign-out-alt.svg'

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f7f7f7;
  overflow-y: auto;
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

const SettingsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
`

const UserInfoBox = styled.div`
  padding: 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const UserEmail = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #333;
`

const UserLabel = styled.div`
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const SettingItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SettingLabel = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #666;
`

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: #0d79d0;
  }

  &:focus {
    outline: none;
    border-color: #0d79d0;
    box-shadow: 0 0 0 3px rgba(13, 121, 208, 0.1);
  }
`

const TextArea = styled.textarea`
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s;

  &:hover {
    border-color: #0d79d0;
  }

  &:focus {
    outline: none;
    border-color: #0d79d0;
    box-shadow: 0 0 0 3px rgba(13, 121, 208, 0.1);
  }

  &::placeholder {
    color: #999;
  }
`

const LogoutContainer = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
`

interface SavedPrompt {
  id: string
  name: string
  prompt: string
}

// User Info Display Component
const UserInfoDisplay = () => {
  const { user, isAuthenticated } = useAuth0()

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <UserInfoBox>
      <UserLabel>Logged in as</UserLabel>
      <UserEmail>{user.email || user.name || 'User'}</UserEmail>
    </UserInfoBox>
  )
}

interface ChatSettingsViewProps {
  onClose: () => void
  isAuthEnabled: boolean
  selectedModel: string
  setSelectedModel: (model: string) => void
  customPrompt: string
  onCustomPromptChange: (prompt: string) => void
  savedPrompts: SavedPrompt[]
  activePromptId: string | null
  onPromptSelect: (promptId: string) => void
  onSavePrompt: (promptName: string) => void
  onDeletePrompt: (promptId: string) => void
}

export const ChatSettingsView: React.FC<ChatSettingsViewProps> = ({
  onClose,
  isAuthEnabled,
  selectedModel,
  setSelectedModel,
  customPrompt,
  onCustomPromptChange,
  savedPrompts,
  activePromptId,
  onPromptSelect,
  onSavePrompt,
  onDeletePrompt,
}) => {
  const [promptName, setPromptName] = useState('')
  const { logout, isAuthenticated } = useAuth0()

  const handleSaveClick = () => {
    onSavePrompt(promptName)
    setPromptName('')
  }

  return (
    <SettingsContainer>
      <SettingsHeader>
        <SettingsTitle>Assistant Settings</SettingsTitle>
        <HeaderButton onClick={onClose} title="Close settings">
          <img src={CloseIcon} alt="Close" />
        </HeaderButton>
      </SettingsHeader>
      <SettingsContent>
        {isAuthEnabled && <UserInfoDisplay />}
        <SettingItem>
          <SettingLabel htmlFor="model-select">Model</SettingLabel>
          <Select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gemini-3-flash">Gemini 3 Flash</option>
            <option value="gemini-3-pro">Gemini 3 Pro</option>
          </Select>
        </SettingItem>

        <SettingItem>
          <SettingLabel htmlFor="saved-prompts">Saved Prompts</SettingLabel>
          <Select
            id="saved-prompts"
            value={activePromptId || ''}
            onChange={(e) => onPromptSelect(e.target.value)}
          >
            <option value="">None</option>
            {savedPrompts.map(prompt => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name}
              </option>
            ))}
          </Select>
        </SettingItem>

        <SettingItem>
          <SettingLabel htmlFor="custom-prompt">Custom System Prompt</SettingLabel>
          <TextArea
            id="custom-prompt"
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder="Add additional instructions for the assistant (optional)..."
          />
        </SettingItem>

        <SettingItem>
          <SettingLabel htmlFor="prompt-name">Save Current Prompt As</SettingLabel>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="prompt-name"
              type="text"
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              placeholder="e.g., Rare Disease Focus"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <PrimaryButton
              onClick={handleSaveClick}
              disabled={!promptName.trim() || !customPrompt.trim()}
            >
              Save
            </PrimaryButton>
          </div>
        </SettingItem>

        {activePromptId && (
          <SettingItem>
            <Button onClick={() => onDeletePrompt(activePromptId)}>
              Delete Current Prompt
            </Button>
          </SettingItem>
        )}

        {isAuthEnabled && isAuthenticated && (
          <LogoutContainer>
            <Button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            >
               <img src={SignOutIcon} alt="Log Out" style={{ width: '14px', height: '14px', marginRight: '8px', opacity: 0.8 }} />
              Log Out
            </Button>
          </LogoutContainer>
        )}
      </SettingsContent>
    </SettingsContainer>
  )
}
