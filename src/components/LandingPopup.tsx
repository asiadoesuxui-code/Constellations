import { motion, AnimatePresence } from 'framer-motion'
import { ModerationError } from './ModerationError'
import '../styles/popup.css'

interface LandingPopupProps {
  visible: boolean
  name: string
  onNameChange: (value: string) => void
  wish: string
  onWishChange: (value: string) => void
  onSubmit: () => void
  onDismiss: () => void
  isSubmitting: boolean
  error: string | null
}

function buildEightPointStarPath(
  points: number,
  outerR: number,
  innerR: number,
  cx: number,
  cy: number,
): string {
  const coords: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (i * Math.PI) / points - Math.PI / 2
    coords.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`)
  }
  return `M${coords.join('L')}Z`
}

function PopupStar() {
  return (
    <div className="popup-star" aria-hidden="true">
      <svg className="popup-star-svg" viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <radialGradient id="popup-star-fill" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#faf0d8" />
            <stop offset="55%" stopColor="#e8d4a8" />
            <stop offset="100%" stopColor="#b8945a" />
          </radialGradient>
        </defs>
        <path
          d={buildEightPointStarPath(8, 21, 8.5, 24, 24)}
          fill="url(#popup-star-fill)"
        />
      </svg>
    </div>
  )
}

export function LandingPopup({
  visible,
  name,
  onNameChange,
  wish,
  onWishChange,
  onSubmit,
  onDismiss,
  isSubmitting,
  error,
}: LandingPopupProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="popup-card"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <PopupStar />
            <h1 className="popup-prompt">wish upon a star</h1>
            <div className="name-field">
              <div className="name-line">
                <span className="name-prefix">name:</span>
                <input
                  className="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value.replace(/\s/g, ''))}
                  maxLength={30}
                  disabled={isSubmitting}
                  autoComplete="given-name"
                />
                <span className="name-rule" aria-hidden="true" />
              </div>
            </div>
            <div className="wish-field">
              <div className="wish-lines">
                <span className="wish-prefix">I wish</span>
                <textarea
                  className="wish-input"
                  value={wish}
                  onChange={(e) => onWishChange(e.target.value)}
                  placeholder=""
                  maxLength={280}
                  rows={3}
                  disabled={isSubmitting}
                />
                <span className="wish-rule wish-rule-1" aria-hidden="true" />
                <span className="wish-rule wish-rule-2" aria-hidden="true" />
                <span className="wish-rule wish-rule-3" aria-hidden="true" />
              </div>
            </div>
            <button
              type="button"
              className="submit-btn"
              onClick={onSubmit}
              disabled={isSubmitting || !name.trim() || !wish.trim()}
            >
              {isSubmitting ? 'Sending...' : 'Send your wish'}
            </button>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <ModerationError message={error} />
                </motion.div>
              )}
            </AnimatePresence>
            <button type="button" className="dismiss-link" onClick={onDismiss}>
              just look around
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
