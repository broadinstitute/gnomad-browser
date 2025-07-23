import React, { useState } from 'react'
import styled from 'styled-components'

import { Button, ExternalLink, List, Modal, PrimaryButton, TextButton } from '@gnomad/ui'

import { withAnchor } from '../AnchorLink'
import { logButtonClick } from '../analytics'

export const FileList = styled(List)`
  li {
    line-height: 1.25;
  }
`

const BaseSectionTitle = styled.h2`
  font-size: ${(props) =>
    // eslint-disable-next-line no-nested-ternary
    props.theme.type === 'release'
      ? '2.25rem'
      : props.theme.type === 'datasets'
      ? '1.88rem'
      : '1.5rem'};
`

export const SectionTitle = styled(withAnchor(BaseSectionTitle))``

export const StyledParagraph = styled.p`
  padding-bottom: 1rem;
`

export const ColumnsWrapper = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
`

export const Column = styled.div`
  flex-basis: calc(50% - 25px);

  @media (max-width: 900px) {
    flex-basis: 100%;
  }

  > h3 {
    margin-top: 0;
  }
`

export const DownloadsSection = styled.section`
  margin-bottom: 5rem;
`

type ShowURLButtonProps = {
  label: string
  url: string
}

const ShowURLButton = ({ label, url, ...otherProps }: ShowURLButtonProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  return (
    <>
      <TextButton
        {...otherProps}
        onClick={() => {
          logButtonClick(`User showed or copied URL for ${label}`)
          setIsExpanded(true)
        }}
      />
      {isExpanded && (
        <Modal
          size="large"
          title={label}
          footer={
            <>
              <Button
                onClick={() => {
                  setIsExpanded(false)
                }}
              >
                Ok
              </Button>
              {navigator.clipboard && navigator.clipboard.writeText && (
                <PrimaryButton
                  onClick={() => {
                    navigator.clipboard.writeText(url)
                  }}
                  style={{ marginLeft: '1em' }}
                >
                  Copy URL
                </PrimaryButton>
              )}
            </>
          }
          onRequestClose={() => {
            setIsExpanded(false)
          }}
        >
          {url}
        </Modal>
      )}
    </>
  )
}

const renderDownloadOptions = (elements: any) => {
  return elements
    .filter((el: any) => el)
    .flatMap((el: any) => [' / ', el])
    .slice(1)
}

type GetUrlButtonsProps = {
  gcsBucket?: string
  label: string
  path: string
  size?: string
  md5?: string
  crc32c?: string
  includeGCP?: boolean
  includeAWS?: boolean
  includeAzure?: boolean
}

export const GetUrlButtons = ({
  gcsBucket = 'gcp-public-data--gnomad',
  label,
  path,
  size,
  md5,
  includeGCP = true,
  includeAWS = true,
  includeAzure = true,
}: GetUrlButtonsProps) => {
  return (
    <>
      <span>{label}</span>
      <br />
      {size && md5 && (
        <>
          <span>
            {size}, MD5:&nbsp;{md5}
          </span>
          <br />
        </>
      )}
      Show URL for{' '}
      {renderDownloadOptions([
        includeGCP && (
          // @ts-expect-error TS(2322) FIXME: Type '{ children: string; key: string; "aria-label... Remove this comment to see the full error message
          <ShowURLButton
            key="gcp"
            aria-label={`Show Google URL for ${label}`}
            label={label}
            url={`gs://${gcsBucket}${path}`}
          >
            Google
          </ShowURLButton>
        ),
        includeAWS && (
          // @ts-expect-error TS(2322) FIXME: Type '{ children: string; key: string; "aria-label... Remove this comment to see the full error message
          <ShowURLButton
            key="aws"
            aria-label={`Show Amazon URL for ${label}`}
            label={label}
            url={`s3://gnomad-public-us-east-1${path}`}
          >
            Amazon
          </ShowURLButton>
        ),
        includeAzure && (
          // @ts-expect-error TS(2322) FIXME: Type '{ children: string; key: string; "aria-label... Remove this comment to see the full error message
          <ShowURLButton
            key="azure"
            aria-label={`Show Microsoft URL for ${label}`}
            label={label}
            url={`https://datasetgnomad.blob.core.windows.net/dataset${path}`}
          >
            Microsoft
          </ShowURLButton>
        ),
      ])}
      {navigator.clipboard && navigator.clipboard.writeText && (
        <>
          <br />
          Copy URL for{' '}
          {renderDownloadOptions([
            includeGCP && (
              <TextButton
                key="gcp"
                aria-label={`Copy Google URL for ${label}`}
                onClick={() => {
                  logButtonClick(`User showed or copied URL for ${label}`)
                  navigator.clipboard.writeText(`gs://${gcsBucket}${path}`)
                }}
              >
                Google
              </TextButton>
            ),
            includeAWS && (
              <TextButton
                key="aws"
                aria-label={`Copy Amazon URL for ${label}`}
                onClick={() => {
                  logButtonClick(`User showed or copied URL for ${label}`)
                  navigator.clipboard.writeText(`s3://gnomad-public-us-east-1${path}`)
                }}
              >
                Amazon
              </TextButton>
            ),
            includeAzure && (
              <TextButton
                key="azure"
                aria-label={`Copy Microsoft URL for ${label}`}
                onClick={() => {
                  logButtonClick(`User showed or copied URL for ${label}`)
                  navigator.clipboard.writeText(
                    `https://datasetgnomad.blob.core.windows.net/dataset${path}`
                  )
                }}
              >
                Microsoft
              </TextButton>
            ),
          ])}
        </>
      )}
    </>
  )
}

type DownloadLinksProps = {
  label: string
  loggingLabel?: string
  path: string
  size?: string
  md5?: string
  crc32c?: string
  gcsBucket?: string
  includeGCP?: boolean
  includeAWS?: boolean
  includeAzure?: boolean
  associatedFileType?: string
}

export const DownloadLinks = ({
  label,
  loggingLabel,
  path,
  size,
  md5,
  crc32c,
  gcsBucket = 'gcp-public-data--gnomad',
  includeGCP = true,
  includeAWS = true,
  includeAzure = true,
  associatedFileType,
}: DownloadLinksProps) => {
  return (
    <>
      <span>{label}</span>
      <br />
      {size && md5 && (
        <>
          <span>
            {size}, MD5:&nbsp;{md5}
          </span>
          <br />
        </>
      )}
      {size && crc32c && (
        <>
          <span>
            {size}, CRC32C:&nbsp;{crc32c}
          </span>
          <br />
        </>
      )}
      <span>
        Download from{' '}
        {renderDownloadOptions([
          includeGCP && (
            // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
            <ExternalLink
              key="gcp"
              aria-label={`Download ${label} from Google`}
              href={`https://storage.googleapis.com/${gcsBucket}${path}`}
              onClick={() => {
                logButtonClick(`User downloaded ${loggingLabel || label} from Google`)
              }}
            >
              Google
            </ExternalLink>
          ),
          includeAWS && (
            // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
            <ExternalLink
              key="aws"
              aria-label={`Download ${label} from Amazon`}
              href={`https://gnomad-public-us-east-1.s3.amazonaws.com${path}`}
              onClick={() => {
                logButtonClick(`User downloaded ${loggingLabel || label} from Amazon`)
              }}
            >
              Amazon
            </ExternalLink>
          ),
          includeAzure && (
            // @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component.
            <ExternalLink
              key="azure"
              aria-label={`Download ${label} from Microsoft`}
              href={`https://datasetgnomad.blob.core.windows.net/dataset${path}`}
              onClick={() => {
                logButtonClick(`User downloaded ${loggingLabel || label} from Microsoft`)
              }}
            >
              Microsoft
            </ExternalLink>
          ),
        ])}
      </span>
      {associatedFileType && (
        <>
          <br />
          <span>
            Download {associatedFileType.toUpperCase()} from{' '}
            {renderDownloadOptions([
              includeGCP && (
                <ExternalLink
                  key="gcp"
                  aria-label={`Download ${associatedFileType.toUpperCase()} file for ${label} from Google`}
                  href={`https://storage.googleapis.com/${gcsBucket}${path}.${associatedFileType.toLowerCase()}`}
                >
                  Google
                </ExternalLink>
              ),
              includeAWS && (
                <ExternalLink
                  key="aws"
                  aria-label={`Download ${associatedFileType.toUpperCase()} file for ${label} from Amazon`}
                  href={`https://gnomad-public-us-east-1.s3.amazonaws.com${path}.${associatedFileType.toLowerCase()}`}
                >
                  Amazon
                </ExternalLink>
              ),
              includeAzure && (
                <ExternalLink
                  key="azure"
                  aria-label={`Download ${associatedFileType.toUpperCase()} file for ${label} from Microsoft`}
                  href={`https://datasetgnomad.blob.core.windows.net/dataset${path}.${associatedFileType.toLowerCase()}`}
                >
                  Microsoft
                </ExternalLink>
              ),
            ])}
          </span>
        </>
      )}
    </>
  )
}

export const CodeBlock = styled.code`
  display: inline-block;
  box-sizing: border-box;
  max-width: 100%;
  padding: 0.5em 1em;
  border-radius: 0.25em;
  background: #333;
  color: #fafafa;
  font-family: monospace;
  line-height: 1.6;
  white-space: nowrap;

  &::before {
    content: '$ ';
  }
`
