import React, { useMemo } from 'react'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import { TooltipAnchor } from '@gnomad/ui'
import { scaleLinear } from 'd3-scale'

const PlotWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  position: relative;
`

type MQTLAssociation = {
  variant_id: string
  variant_pos: number
  cpg_pos: number
  p_value: number
  effect_size: number
  carrier_count: number
  non_carrier_count: number
}

type MQTLTrackProps = {
  mqtlData: MQTLAssociation[]
  loading: boolean
  minLogP: number
  onMinLogPChange: (v: number) => void
}

const MARKER_ZONE = 20 // space below baseline for markers
const TOP_PAD = 5 // space above top of plot

const MQTLTrack = ({ mqtlData, loading, minLogP, onMinLogPChange }: MQTLTrackProps) => {
  const plotHeight = 250
  const svgHeight = plotHeight + MARKER_ZONE
  const baseline = plotHeight

  const maxLogP = useMemo(
    () => (mqtlData.length > 0 ? Math.max(2, ...mqtlData.map((d) => -Math.log10(d.p_value))) : 2),
    [mqtlData]
  )

  const filteredData = useMemo(
    () => mqtlData.filter((d) => -Math.log10(d.p_value) >= minLogP),
    [mqtlData, minLogP]
  )

  const { variantPositions, cpgPositions } = useMemo(() => {
    const vSet = new Set<number>()
    const cSet = new Set<number>()
    for (const d of filteredData) {
      vSet.add(d.variant_pos)
      cSet.add(d.cpg_pos)
    }
    return { variantPositions: Array.from(vSet), cpgPositions: Array.from(cSet) }
  }, [filteredData])

  const heightScale = scaleLinear().domain([0, maxLogP]).range([0, plotHeight - TOP_PAD])

  const tickStep = maxLogP <= 5 ? 1 : maxLogP <= 20 ? 5 : 10
  const ticks: number[] = []
  for (let v = 0; v <= maxLogP; v += tickStep) {
    ticks.push(v)
  }

  // The left panel renders a full-height SVG with axis, plus overlay controls
  const renderLeftPanel = () => (
    <div style={{ position: 'relative', width: '115px', height: `${svgHeight}px` }}>
      {/* Controls overlaid at top-left */}
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, padding: '2px 0' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>mQTL Associations</div>
        <div style={{ fontSize: '9px', color: '#666' }}>
          {loading ? 'Computing...' : `${filteredData.length} of ${mqtlData.length}`}
        </div>
        <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
          Min -log₁₀(p): {minLogP.toFixed(1)}
        </div>
        <input
          type='range'
          min={0}
          max={Math.floor(maxLogP)}
          step={0.5}
          value={minLogP}
          onChange={(e) => onMinLogPChange(parseFloat(e.target.value))}
          style={{ width: '100px' }}
        />
      </div>
      {/* Axis SVG fills the full height — aligns 1:1 with the plot */}
      <svg width={115} height={svgHeight}>
        {/* Y axis label */}
        <text
          x={10}
          y={baseline / 2}
          transform={`rotate(-90, 10, ${baseline / 2})`}
          fontSize='10'
          textAnchor='middle'
          fill='#333'
        >
          -log₁₀(p-value)
        </text>
        {/* Axis line */}
        <line x1={110} y1={TOP_PAD} x2={110} y2={baseline} stroke='#ccc' strokeWidth={1} />
        {/* Ticks */}
        {ticks.map((v) => {
          const y = baseline - heightScale(v)
          return (
            <g key={v}>
              <line x1={105} y1={y} x2={110} y2={y} stroke='#999' strokeWidth={1} />
              <text x={102} y={y + 3} fontSize='9' textAnchor='end' fill='#666'>
                {v}
              </text>
            </g>
          )
        })}
        {/* Threshold line */}
        {minLogP > 0 && (
          <line
            x1={90}
            y1={baseline - heightScale(minLogP)}
            x2={110}
            y2={baseline - heightScale(minLogP)}
            stroke='#e53e3e'
            strokeWidth={1}
            strokeDasharray='3 2'
          />
        )}
        {/* Baseline */}
        <line x1={105} y1={baseline} x2={110} y2={baseline} stroke='#999' strokeWidth={1} />
        {/* Marker zone below baseline */}
        <line x1={110} y1={baseline} x2={110} y2={baseline + MARKER_ZONE} stroke='#eee' strokeWidth={1} />
        <text x={102} y={baseline + 9} fontSize='8' textAnchor='end' fill='#6b7280'>
          Var
        </text>
        <text x={102} y={baseline + 18} fontSize='8' textAnchor='end' fill='#10b981'>
          CpG
        </text>
      </svg>
    </div>
  )

  return (
    <Track renderLeftPanel={renderLeftPanel}>
      {({ scalePosition, width }: { scalePosition: (input: number) => number; width: number }) => {
        if (loading) {
          return (
            <PlotWrapper>
              <svg width={width} height={svgHeight}>
                <text x={width / 2} y={baseline / 2} textAnchor='middle' fontSize='12' fill='#999'>
                  Computing mQTL associations...
                </text>
              </svg>
            </PlotWrapper>
          )
        }

        if (mqtlData.length === 0) {
          return (
            <PlotWrapper>
              <svg width={width} height={svgHeight}>
                <text x={width / 2} y={baseline / 2} textAnchor='middle' fontSize='12' fill='#999'>
                  No significant mQTL associations found
                </text>
              </svg>
            </PlotWrapper>
          )
        }

        return (
          <PlotWrapper>
            <svg width={width} height={svgHeight}>
              {/* Gridlines */}
              {ticks.map((v) => {
                const y = baseline - heightScale(v)
                return (
                  <line key={`grid-${v}`} x1={0} y1={y} x2={width} y2={y} stroke='#f0f0f0' strokeWidth={1} />
                )
              })}
              {/* Threshold line */}
              {minLogP > 0 && (
                <line
                  x1={0}
                  y1={baseline - heightScale(minLogP)}
                  x2={width}
                  y2={baseline - heightScale(minLogP)}
                  stroke='#e53e3e'
                  strokeWidth={1}
                  strokeDasharray='4 3'
                />
              )}
              {/* Baseline / x-axis */}
              <line x1={0} y1={baseline} x2={width} y2={baseline} stroke='#999' strokeWidth={1} />
              {/* Variant markers below baseline */}
              {variantPositions.map((pos) => {
                const x = scalePosition(pos)
                return (
                  <polygon
                    key={`var-${pos}`}
                    points={`${x},${baseline + 2} ${x - 3},${baseline + 9} ${x + 3},${baseline + 9}`}
                    fill='#6b7280'
                    opacity={0.7}
                  />
                )
              })}
              {/* CpG markers below baseline */}
              {cpgPositions.map((pos) => {
                const x = scalePosition(pos)
                return (
                  <circle key={`cpg-${pos}`} cx={x} cy={baseline + 15} r={3} fill='#10b981' opacity={0.8} />
                )
              })}
              {/* Arcs */}
              {filteredData
                .slice()
                .sort((a, b) => b.p_value - a.p_value)
                .map((d, i) => {
                  const varX = scalePosition(d.variant_pos)
                  const cpgX = scalePosition(d.cpg_pos)
                  const logP = -Math.log10(d.p_value)
                  const arcH = heightScale(logP)

                  const cx = (varX + cpgX) / 2
                  const cy = baseline - arcH
                  const pathData = `M ${varX} ${baseline} Q ${cx} ${cy} ${cpgX} ${baseline}`

                  const opacity = Math.min(0.8, 0.15 + (logP / maxLogP) * 0.65)
                  const baseColor = d.effect_size > 0 ? '220, 38, 38' : '37, 99, 235'
                  const color = `rgba(${baseColor}, ${opacity})`
                  const strokeW = Math.max(1, Math.min(3, logP / 4))

                  return (
                    <TooltipAnchor
                      key={i}
                      tooltipComponent={() => (
                        <dl style={{ margin: 0 }}>
                          <div>
                            <dt style={{ display: 'inline', fontWeight: 'bold' }}>Variant:</dt>
                            <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{d.variant_id}</dd>
                          </div>
                          <div>
                            <dt style={{ display: 'inline', fontWeight: 'bold' }}>CpG pos:</dt>
                            <dd style={{ display: 'inline', marginLeft: '0.5em' }}>
                              {d.cpg_pos.toLocaleString()}
                            </dd>
                          </div>
                          <div>
                            <dt style={{ display: 'inline', fontWeight: 'bold' }}>-log₁₀(p):</dt>
                            <dd style={{ display: 'inline', marginLeft: '0.5em' }}>{logP.toFixed(1)}</dd>
                          </div>
                          <div>
                            <dt style={{ display: 'inline', fontWeight: 'bold' }}>p-value:</dt>
                            <dd style={{ display: 'inline', marginLeft: '0.5em' }}>
                              {d.p_value.toExponential(2)}
                            </dd>
                          </div>
                          <div>
                            <dt style={{ display: 'inline', fontWeight: 'bold' }}>Effect:</dt>
                            <dd style={{ display: 'inline', marginLeft: '0.5em' }}>
                              {d.effect_size > 0 ? '+' : ''}
                              {d.effect_size.toFixed(2)}%
                            </dd>
                          </div>
                          <div>
                            <dt style={{ display: 'inline', fontWeight: 'bold' }}>Carriers:</dt>
                            <dd style={{ display: 'inline', marginLeft: '0.5em' }}>
                              {d.carrier_count} / {d.carrier_count + d.non_carrier_count}
                            </dd>
                          </div>
                        </dl>
                      )}
                    >
                      <g>
                        <path d={pathData} fill='none' stroke={color} strokeWidth={strokeW} />
                        {/* Variant endpoint tick */}
                        <line
                          x1={varX} y1={baseline} x2={varX} y2={baseline + 9}
                          stroke='#6b7280' strokeWidth={1.5} opacity={opacity}
                        />
                        {/* CpG endpoint tick */}
                        <line
                          x1={cpgX} y1={baseline} x2={cpgX} y2={baseline + 15}
                          stroke='#10b981' strokeWidth={1.5} opacity={opacity}
                        />
                      </g>
                    </TooltipAnchor>
                  )
                })}
            </svg>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: '#666', padding: '4px 0' }}>
              <span>
                <svg width={16} height={10} style={{ verticalAlign: 'middle' }}>
                  <polygon points='8,1 5,9 11,9' fill='#6b7280' />
                </svg>{' '}
                Variant
              </span>
              <span>
                <svg width={16} height={10} style={{ verticalAlign: 'middle' }}>
                  <circle cx={8} cy={5} r={3} fill='#10b981' />
                </svg>{' '}
                CpG site
              </span>
              <span>
                <svg width={16} height={10} style={{ verticalAlign: 'middle' }}>
                  <line x1={0} y1={5} x2={16} y2={5} stroke='rgba(37, 99, 235, 0.7)' strokeWidth={2} />
                </svg>{' '}
                Hypo-methylation
              </span>
              <span>
                <svg width={16} height={10} style={{ verticalAlign: 'middle' }}>
                  <line x1={0} y1={5} x2={16} y2={5} stroke='rgba(220, 38, 38, 0.7)' strokeWidth={2} />
                </svg>{' '}
                Hyper-methylation
              </span>
            </div>
          </PlotWrapper>
        )
      }}
    </Track>
  )
}

export default MQTLTrack
