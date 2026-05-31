interface ConstellationLabelProps {
  visible: boolean
  x: number
  y: number
  wish: string
}

export function ConstellationLabel({ visible, x, y, wish }: ConstellationLabelProps) {
  if (!visible) return null

  return (
    <div className="constellation-label" style={{ left: x, top: y }}>
      <span className="constellation-label-tag">Your constellation</span>
      {wish}
    </div>
  )
}
