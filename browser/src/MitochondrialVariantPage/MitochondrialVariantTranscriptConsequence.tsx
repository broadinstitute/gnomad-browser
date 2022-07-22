import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

import { ExternalLink } from '@gnomad/ui'

import { getCategoryFromConsequence } from '../vepConsequences'
import { LofteeFilter, LofteeFlag } from '../VariantPage/Loftee'

const AttributeName = styled.dt`
  display: inline;

  ::after {
    content: ': ';
  }
`

const AttributeValue = styled.dd`
  display: inline;
  margin: 0;
`

type AttributeProps = {
  children: React.ReactNode
  name: string
}

const Attribute = ({ children, name }: AttributeProps) => (
  <div style={{ marginTop: '0.25em' }}>
    <AttributeName>{name}</AttributeName>
    <AttributeValue>{children}</AttributeValue>
  </div>
)

const AttributeList = styled.dl`
  display: flex;
  flex-direction: column;
  margin: 0;
`

const Marker = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;

  &::before {
    content: '';
    display: inline-block;
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    border: 1px solid #000;
    border-radius: 5px;
    background: ${(props: any) => props.color};
  }
`

const colors = {
  red: '#FF583F',
  yellow: '#F0C94D',
  green: 'green',
}

const lofteeAnnotationMarker = (consequence: any) => {
  switch (consequence.lof) {
    case 'HC':
      return <Marker color={colors.green} />
    case 'OS':
      return null
    case 'LC':
    default:
      return <Marker color={colors.red} />
  }
}

const lofteeAnnotationDescription = (consequence: any) => {
  switch (consequence.lof) {
    case 'HC':
      return 'High-confidence'
    case 'OS':
      return 'Other splice (beta)'
    case 'LC':
      return (
        <span>
          Low-confidence (
          {consequence.lof_filter
            .split(',')
            .map((filter: any) => <LofteeFilter key={filter} filter={filter} />)
            .reduce(
              (acc: any, el: any, i: any) => (i === 0 ? [...acc, el] : [...acc, ' ', el]),
              []
            )}
          )
        </span>
      )
    default:
      return consequence.lof
  }
}

type HmtVarInfoProps = {
  variant: {
    pos: number
    ref: string
    alt: string
  }
}

const HmtVarInfo = ({ variant }: HmtVarInfoProps) => {
  const [response, setResponse] = useState(null)

  const url = `https://www.hmtvar.uniba.it/api/main/mutation/${variant.ref}${variant.pos}${variant.alt}`

  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then(setResponse, () => {})
  }, [url])

  return (
    response && (
      <div style={{ marginTop: '0.25em' }}>
        <AttributeName>
          {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
          <ExternalLink href="https://www.hmtvar.uniba.it/">HmtVar</ExternalLink>
        </AttributeName>
        <AttributeValue>
          {(response as any).pathogenicity
            ? (response as any).pathogenicity
                .split('_')
                .map((w: any) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')
            : '–'}{' '}
          ({(response as any).disease_score.toPrecision(3)})
        </AttributeValue>
      </div>
    )
  )
}

type HmtVarInfoErrorBoundaryProps = {}

type HmtVarInfoErrorBoundaryState = any

class HmtVarInfoErrorBoundary extends React.Component<
  HmtVarInfoErrorBoundaryProps,
  HmtVarInfoErrorBoundaryState
> {
  constructor(props: HmtVarInfoErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { error }
  }

  render() {
    // @ts-expect-error TS(2339) FIXME: Property 'children' does not exist on type 'Readon... Remove this comment to see the full error message
    const { children } = this.props
    const { error } = this.state

    if (error) {
      return (
        <div style={{ marginTop: '0.25em' }}>
          <AttributeName>
            {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
            <ExternalLink href="https://www.hmtvar.uniba.it/">HmtVar</ExternalLink>
          </AttributeName>
          <AttributeValue>An error occurred when fetching data</AttributeValue>
        </div>
      )
    }

    return children
  }
}

const MITOTIP_TRNA_PREDICTIONS = {
  likely_benign: 'Likely benign',
  possibly_benign: 'Possibly benign',
  possibly_pathogenic: 'Possibly pathogenic',
  likely_pathogenic: 'Likely pathogenic',
}

const PON_MT_TRNA_PREDICTIONS = {
  neutral: 'Neutral',
  likely_neutral: 'Likely neutral',
  likely_pathogenic: 'Likely pathogenic',
  pathogenic: 'Pathogenic',
}

type MitochondrialVariantTranscriptConsequenceProps = {
  consequence: any
  variant: {
    mitotip_score?: number
    mitotip_trna_prediction?: string
    pon_ml_probability_of_pathogenicity?: number
    pon_mt_trna_prediction?: string
  }
}

const MitochondrialVariantTranscriptConsequence = ({
  consequence,
  variant,
}: MitochondrialVariantTranscriptConsequenceProps) => {
  if (variant.mitotip_trna_prediction || variant.pon_mt_trna_prediction) {
    return (
      <AttributeList>
        {variant.mitotip_trna_prediction && (
          <div style={{ marginTop: '0.25em' }}>
            <AttributeName>
              {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
              <ExternalLink href="https://www.mitomap.org/MITOMAP/MitoTipInfo">
                MitoTIP
              </ExternalLink>
            </AttributeName>
            <AttributeValue>
              {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
              {MITOTIP_TRNA_PREDICTIONS[variant.mitotip_trna_prediction] ||
                variant.mitotip_trna_prediction}{' '}
              ( {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
              {variant.mitotip_score.toPrecision(3)})
            </AttributeValue>
          </div>
        )}
        {variant.pon_mt_trna_prediction && (
          <div style={{ marginTop: '0.25em' }}>
            <AttributeName>
              {/* @ts-expect-error TS(2786) FIXME: 'ExternalLink' cannot be used as a JSX component. */}
              <ExternalLink href="http://structure.bmc.lu.se/PON-mt-tRNA/about.html/">
                PON-mt-tRNA
              </ExternalLink>
            </AttributeName>
            <AttributeValue>
              {/* @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message */}
              {PON_MT_TRNA_PREDICTIONS[variant.pon_mt_trna_prediction] ||
                variant.pon_mt_trna_prediction}{' '}
              ( {/* @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'. */}
              {variant.pon_ml_probability_of_pathogenicity.toPrecision(3)})
            </AttributeValue>
          </div>
        )}
        <HmtVarInfoErrorBoundary>
          {/* @ts-expect-error TS(2739) FIXME: Type '{ mitotip_score?: number | undefined; mitoti... Remove this comment to see the full error message */}
          <HmtVarInfo variant={variant} />
        </HmtVarInfoErrorBoundary>
      </AttributeList>
    )
  }

  const category = getCategoryFromConsequence(consequence.major_consequence)

  if (category === 'missense') {
    const polyphenColor =
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      {
        benign: colors.green,
        possibly_damaging: colors.yellow,
      }[consequence.polyphen_prediction] || colors.red

    const siftColor = consequence.sift_prediction === 'tolerated' ? colors.green : colors.red

    return (
      <AttributeList>
        <Attribute name="HGVSp">{consequence.hgvs}</Attribute>
        {consequence.polyphen_prediction && (
          <Attribute name="Polyphen">
            <Marker color={polyphenColor} /> {consequence.polyphen_prediction}
          </Attribute>
        )}
        {consequence.sift_prediction && (
          <Attribute name="SIFT">
            <Marker color={siftColor} /> {consequence.sift_prediction}
          </Attribute>
        )}
      </AttributeList>
    )
  }

  if (
    // "NC" annotations were removed from the data pipeline some time ago.
    // Some ExAC variants still have them.
    consequence.lof === 'NC' ||
    (category === 'lof' && !consequence.lof) // See https://github.com/broadinstitute/gnomad-browser/issues/364
  ) {
    return (
      <AttributeList>
        <Attribute name="HGVSp">{consequence.hgvs}</Attribute>
      </AttributeList>
    )
  }

  if (consequence.lof) {
    return (
      <AttributeList>
        <Attribute name="HGVSp">{consequence.hgvs}</Attribute>
        <Attribute name="pLoF">
          {lofteeAnnotationMarker(consequence)} {lofteeAnnotationDescription(consequence)}
        </Attribute>
        {consequence.lof_flags && (
          <Attribute name="Flag">
            <Marker color={colors.yellow} />{' '}
            {consequence.lof_flags
              .split(',')
              .map((flag: any) => <LofteeFlag key={flag} flag={flag} />)
              .reduce(
                (acc: any, el: any, i: any) => (i === 0 ? [...acc, el] : [...acc, ' ', el]),
                []
              )}
          </Attribute>
        )}
      </AttributeList>
    )
  }

  return null
}

export default MitochondrialVariantTranscriptConsequence
