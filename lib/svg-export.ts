import { toSvg } from 'html-to-image'
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import type { Node } from '@xyflow/react'

export async function exportSvg(nodes: Node[]) {
  const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!viewportEl) {
    console.error('React Flow viewport not found')
    return
  }

  const bounds = getNodesBounds(nodes)
  const padding = 50
  const imageWidth = bounds.width + padding * 2
  const imageHeight = bounds.height + padding * 2

  const viewport = getViewportForBounds(bounds, imageWidth, imageHeight, 0.5, 2, padding)

  try {
    const dataUrl = await toSvg(viewportEl, {
      backgroundColor: '#f9fafb',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    })

    // Use dataUrl directly to avoid fetch/blob URL revocation quirks
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `firewall-topology-${new Date().toISOString().slice(0, 10)}.svg`
    document.body.appendChild(a)
    a.click()
    
    // Clean up slightly later
    setTimeout(() => {
      document.body.removeChild(a)
    }, 100)
  } catch (error) {
    console.error('SVG export failed:', error)
  }
}
