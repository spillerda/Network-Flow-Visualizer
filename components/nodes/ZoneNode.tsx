import { Handle, Position, NodeResizer } from '@xyflow/react'
import { useTheme } from 'next-themes'

export function ZoneNode({ data, selected }: { data: any; selected?: boolean }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const defaultBg = isDark ? '#1E293B' : '#F8FAFC'
  const defaultBorder = isDark ? '#334155' : '#94A3B8'
  
  const bgColor = data.color && data.color !== '#F8FAFC' ? data.color : defaultBg
  const borderColor = data.borderColor && data.borderColor !== '#94A3B8' ? data.borderColor : defaultBorder
  
  return (
    <div 
      className="relative w-full h-full rounded-xl border-2 shadow-sm transition-all"
      style={{ 
        backgroundColor: bgColor, 
        borderColor: borderColor,
      }}
      title={data.description || 'Zone'}
    >
      {/* Resize handle - only visible when selected */}
      <NodeResizer 
        minWidth={300} 
        minHeight={100}
        isVisible={selected}
        lineClassName="!border-blue-400"
        handleClassName="!w-3 !h-3 !bg-blue-500 !border-blue-600 !rounded-sm"
      />
      <div 
        className="absolute top-2 left-4 text-sm font-bold tracking-wider uppercase px-2 py-0.5 rounded"
        style={{ color: borderColor }}
      >
        {data.label}
      </div>
      {/* Left/Right handles only, fully invisible and non-interactive */}
      <Handle id="left" type="source" position={Position.Left} style={{ opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
      <Handle id="right" type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
      <Handle id="left-target" type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
      <Handle id="right-target" type="target" position={Position.Right} style={{ opacity: 0, width: 1, height: 1, pointerEvents: 'none' }} />
    </div>
  )
}
