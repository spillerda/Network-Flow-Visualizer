import { useState, useRef, useEffect } from 'react'
import { BaseEdge, EdgeLabelRenderer, EdgeProps, useReactFlow } from '@xyflow/react'

export function RuleEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  // Optional persisted drag offsets passed down from page.tsx state
  const savedControlX = data?.controlX as number | undefined
  const savedControlY = data?.controlY as number | undefined

  // Local drag state for real-time 60fps updates while dragging
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const dragStartOffset = useRef({ x: 0, y: 0 })
  const { getViewport } = useReactFlow()

  // Compute curvature offset to prevent overlapping edges between same source/target
  const edgeIndex = (data?.edgeIndex as number) ?? 0
  const edgeTotal = (data?.edgeTotalBetweenPair as number) ?? 1
  // Offset: fan out edges symmetrically. Even a single edge gets a slight curve.
  const baseOffset = 40
  const offsetMultiplier = edgeTotal > 1
    ? (edgeIndex - (edgeTotal - 1) / 2) * baseOffset
    : 0

  // Compute the midpoint direction perpendicular to the edge for curving
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  
  // Directional Bending for intra-zone (left-to-left or right-to-right handles)
  let nx = -dy / len
  let ny = dx / len
  
  if (sourcePosition === 'left' && targetPosition === 'left') {
    nx = -1
    ny = 0
  } else if (sourcePosition === 'right' && targetPosition === 'right') {
    nx = 1
    ny = 0
  }

  // Always add a slight default curvature (20px) plus the fan-out offset
  const defaultCurve = 20
  const totalOffset = defaultCurve + offsetMultiplier

  let controlX = savedControlX !== undefined 
    ? savedControlX + dragOffset.x 
    : (midX + nx * totalOffset) + dragOffset.x
    
  let controlY = savedControlY !== undefined 
    ? savedControlY + dragOffset.y 
    : (midY + ny * totalOffset) + dragOffset.y

  // Build a quadratic bezier path manually for consistent curvature
  const edgePath = `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`
  const labelX = controlX
  const labelY = controlY

  const isBlock = data?.action === 'BLOCK'
  const isAuto = data?.isAuto
  const isOverridden = data?.isOverridden
  
  // Color logic: overridden = orange, block = red, allow = green, auto = gray
  let strokeColor = '#22c55e' // green (ALLOW)
  if (isOverridden) strokeColor = '#f97316' // orange
  else if (isAuto) strokeColor = '#9ca3af' // gray
  else if (isBlock) strokeColor = '#ef4444' // red

  const activeStyle = {
    ...style,
    strokeWidth: isAuto ? 1 : 2,
    stroke: strokeColor,
    strokeDasharray: isOverridden ? 'none' : (isBlock || isAuto ? '5,5' : 'none'), // Overridden rules are strictly solid
  }

  // Label color matches stroke
  let labelColor = '#16a34a'
  if (isOverridden) labelColor = '#ea580c'
  else if (isBlock) labelColor = '#ef4444'

  // Build tooltip with source/destination info
  const tooltipLines = [
    `Action: ${data?.action}${isOverridden ? ' (Overridden)' : ''}`,
    `Source: ${data?.sourceName || 'any'}`,
    `Destination: ${data?.destName || 'any'}`,
    `Ports: ${data?.ports}`,
  ]
  if (data?.description) tooltipLines.push(`Description: ${data.description}`)
  if (data?.priority !== undefined) tooltipLines.push(`Priority: ${data.priority}`)

  return (
    <>
      <g>
        <title>{tooltipLines.join('\n')}</title>
        <BaseEdge path={edgePath} markerEnd={markerEnd} style={activeStyle} id={id} />
      </g>
      {data?.ports && data.ports !== 'any' && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, calc(-100% - 15px)) translate(${labelX}px,${labelY}px)`, // Lifted slightly higher to clear the drag handle
              background: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              color: labelColor,
              border: `1px solid ${labelColor}`,
              pointerEvents: 'all',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap',
            }}
            className="nodrag nopan"
          >
            {String(data.ports)}
          </div>
        </EdgeLabelRenderer>
      )}
      
      {/* Draggable Control Point */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${controlX}px, ${controlY}px)`,
            width: 12,
            height: 12,
            background: 'white',
            border: `2px solid ${strokeColor}`,
            borderRadius: '50%',
            cursor: 'grab',
            pointerEvents: 'all',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            zIndex: 10,
          }}
          className="nodrag nopan"
          onPointerDown={(e) => {
            isDragging.current = true
            dragStartPos.current = { x: e.clientX, y: e.clientY }
            dragStartOffset.current = { ...dragOffset }
            e.currentTarget.style.cursor = 'grabbing'
            
            const handlePointerMove = (moveEvent: PointerEvent) => {
              if (!isDragging.current) return
              const zoom = getViewport().zoom
              const deltaX = (moveEvent.clientX - dragStartPos.current.x) / zoom
              const deltaY = (moveEvent.clientY - dragStartPos.current.y) / zoom
              setDragOffset({
                x: dragStartOffset.current.x + deltaX,
                y: dragStartOffset.current.y + deltaY
              })
            }
            
            const handlePointerUp = (upEvent: PointerEvent) => {
              isDragging.current = false
              window.removeEventListener('pointermove', handlePointerMove)
              window.removeEventListener('pointerup', handlePointerUp)
              if (e.currentTarget) e.currentTarget.style.cursor = 'grab'
              
              // Only save if it actually moved
              const zoom = getViewport().zoom
              const finalDeltaX = (upEvent.clientX - dragStartPos.current.x) / zoom
              const finalDeltaY = (upEvent.clientY - dragStartPos.current.y) / zoom
              
              if (Math.abs(finalDeltaX) > 1 || Math.abs(finalDeltaY) > 1) {
                const finalControlX = (savedControlX !== undefined ? savedControlX : (midX + nx * totalOffset)) + dragStartOffset.current.x + finalDeltaX
                const finalControlY = (savedControlY !== undefined ? savedControlY : (midY + ny * totalOffset)) + dragStartOffset.current.y + finalDeltaY
                
                // Dispatch event up to save the new control point in global state
                if (typeof data?.onControlChange === 'function') {
                  data.onControlChange(id, finalControlX, finalControlY)
                }
              }
            }
            
            window.addEventListener('pointermove', handlePointerMove)
            window.addEventListener('pointerup', handlePointerUp)
          }}
        />
      </EdgeLabelRenderer>
    </>
  )
}
