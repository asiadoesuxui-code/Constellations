import { useCallback, useState } from 'react'
import type { ConstellationRecord } from '../types/contracts'
import { submitWish } from '../api/submitWish'

export type SubmissionPhase =
  | 'idle'
  | 'submitting'
  | 'revealing'
  | 'card'
  | 'exploring'
  | 'error'

export function useSubmissionFlow(
  getExistingPositions: () => { x: number; y: number }[] = () => [],
) {
  const [phase, setPhase] = useState<SubmissionPhase>('idle')
  const [name, setName] = useState('')
  const [wish, setWish] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [newConstellation, setNewConstellation] = useState<ConstellationRecord | null>(null)
  const [showPopup, setShowPopup] = useState(true)

  const submit = useCallback(async () => {
    if (!name.trim() || !wish.trim()) return
    setPhase('submitting')
    setError(null)

    const result = await submitWish(wish, name, getExistingPositions())

    if ('error' in result) {
      setError(result.error)
      setPhase('error')
      return
    }

    setNewConstellation(result.constellation)
    setShowPopup(false)
    setPhase('revealing')
  }, [wish, name, getExistingPositions])

  const dismissPopup = useCallback(() => {
    setShowPopup(false)
    setPhase('exploring')
  }, [])

  const onRevealComplete = useCallback(() => {
    setPhase('card')
  }, [])

  const dismissCard = useCallback(() => {
    setPhase('exploring')
  }, [])

  const resetError = useCallback(() => {
    setError(null)
    if (phase === 'error') setPhase('idle')
  }, [phase])

  return {
    phase,
    name,
    setName,
    wish,
    setWish,
    error,
    showPopup,
    newConstellation,
    submit,
    dismissPopup,
    onRevealComplete,
    dismissCard,
    resetError,
    isSubmitting: phase === 'submitting',
    showSaveCard: phase === 'card',
  }
}
