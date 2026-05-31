import { motion, AnimatePresence } from 'framer-motion'
import { ModerationError } from './ModerationError'
import popupStar from '../assets/popup-star.png'
import '../styles/popup.css'

interface LandingPopupProps {
  visible: boolean
  wish: string
  onWishChange: (value: string) => void
  onSubmit: () => void
  onDismiss: () => void
  isSubmitting: boolean
  error: string | null
}

function PopupStar() {
  return (
    <div className="popup-star" aria-hidden="true">
      <img src={popupStar} alt="" className="popup-star-img" />
    </div>
  )
}

export function LandingPopup({
  visible,
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
              disabled={isSubmitting || !wish.trim()}
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
