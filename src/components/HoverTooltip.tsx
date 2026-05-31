interface HoverTooltipProps {
  wish: string | null
  x: number
  y: number
}

export function HoverTooltip({ wish, x, y }: HoverTooltipProps) {
  if (!wish) return null

  return (
    <div className="hover-tooltip" style={{ left: x, top: y }}>
      {wish}
    </div>
  )
}
