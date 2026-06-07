import { AnimatePresence, motion } from 'framer-motion'
import '../styles/share-card.css'

interface SaveConstellationPopupProps {
  visible: boolean
  skyDataUrl: string
  captureWidth: number
  captureHeight: number
  onDownload: () => void
  onDismiss: () => void
}

export function SaveConstellationPopup({
  visible,
  skyDataUrl,
  captureWidth,
  captureHeight,
  onDownload,
  onDismiss,
}: SaveConstellationPopupProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="popup-overlay save-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          onClick={onDismiss}
        >
          <motion.div
            className="share-popup-panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-card-capture popup-card" id="share-card-download">
              <div
                className="share-card-sky"
                style={{ width: captureWidth, height: captureHeight }}
              >
                <img
                  src={skyDataUrl}
                  alt="Your constellation in the night sky"
                  width={captureWidth}
                  height={captureHeight}
                />
              </div>
              <div className="share-card-footer">
                <p className="popup-prompt share-card-tagline">wish upon a star</p>
                <button
                  type="button"
                  className="submit-btn share-card-download-btn"
                  onClick={onDownload}
                >
                  Download image
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
