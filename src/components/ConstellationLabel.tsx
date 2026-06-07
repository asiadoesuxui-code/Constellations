interface ConstellationLabelProps {
  visible: boolean
  x: number
  y: number
  name: string
  wish: string
}

import { firstSentence } from './firstSentence'

export function ConstellationLabel({ visible, x, y, name, wish }: ConstellationLabelProps) {
  if (!visible) return null

  const displayWish = firstSentence(wish)

  return (
    <div className="constellation-label" style={{ left: x, top: y }}>
      {name && <span className="constellation-label-name">{name}</span>}
      {displayWish && (
        <span className="constellation-label-wish">I wish {displayWish}</span>
      )}
    </div>
  )
}
