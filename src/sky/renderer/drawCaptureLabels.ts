import { firstSentence } from '../../components/firstSentence'
import type { ConstellationLabelTarget } from '../../types/contracts'

const WISH_ZOOM_THRESHOLD = 0.7
const FONT_FAMILY = '"Crimson Text", Georgia, serif'
const NAME_MARGIN_BOTTOM = 4.8

export interface CaptureLabelFrame {
  cropX: number
  cropY: number
  cropW: number
  cropH: number
  outW: number
  outH: number
  zoom: number
}

function nameFontSize(zoom: number, isOwn: boolean): number {
  if (zoom >= WISH_ZOOM_THRESHOLD) {
    return isOwn ? 14 : 12
  }
  const base = isOwn ? 14 : 12
  return Math.max(7, base * zoom * 0.95)
}

function wishFontSize(isOwn: boolean): number {
  return isOwn ? 20 : 16
}

function toOutputX(screenX: number, frame: CaptureLabelFrame): number {
  return ((screenX - frame.cropX) / frame.cropW) * frame.outW
}

function toOutputY(screenY: number, frame: CaptureLabelFrame): number {
  return ((screenY - frame.cropY) / frame.cropH) * frame.outH
}

function drawLabelBlock(
  ctx: CanvasRenderingContext2D,
  label: ConstellationLabelTarget,
  frame: CaptureLabelFrame,
): void {
  const pixelScale = frame.outW / frame.cropW
  const x = toOutputX(label.screenX, frame)
  const y = toOutputY(label.screenY, frame)
  const showWish = frame.zoom >= WISH_ZOOM_THRESHOLD
  const displayWish = showWish ? firstSentence(label.wish) : ''
  const nameSize = nameFontSize(frame.zoom, label.isOwn) * pixelScale
  const nameGap = NAME_MARGIN_BOTTOM * pixelScale

  ctx.save()
  ctx.globalAlpha = label.opacity
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  let bottomY = y

  if (displayWish) {
    const wishSize = wishFontSize(label.isOwn) * pixelScale
    ctx.font = `${wishSize}px ${FONT_FAMILY}`
    ctx.fillStyle = label.isOwn ? '#f0e4cc' : 'rgba(245, 230, 204, 0.72)'
    ctx.fillText(`I wish ${displayWish}`, x, bottomY)
    bottomY -= wishSize * 1.25
  }

  ctx.font = `700 ${nameSize}px ${FONT_FAMILY}`
  ctx.fillStyle = '#e5c38e'
  ctx.fillText(label.name.toUpperCase(), x, bottomY - (displayWish ? nameGap : 0))

  ctx.restore()
}

export function drawCaptureLabels(
  ctx: CanvasRenderingContext2D,
  labels: ConstellationLabelTarget[],
  frame: CaptureLabelFrame,
): void {
  for (const label of labels) {
    if (!label.name || label.opacity < 0.02) continue
    drawLabelBlock(ctx, label, frame)
  }
}
