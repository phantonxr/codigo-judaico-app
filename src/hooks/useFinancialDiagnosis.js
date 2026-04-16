import { useCallback, useEffect, useState } from 'react'
import { queueJourneyStateSync, syncDiagnosisState } from '../services/sessionSync.js'

const DIAGNOSIS_KEY = 'cj_financial_diagnosis'
const TRACK_KEY = 'cj_assigned_track'
const JOURNEY_START_KEY = 'cj_journey_start_date'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function readDiagnosis() {
  return read(DIAGNOSIS_KEY, null)
}

export function readAssignedTrack() {
  return read(TRACK_KEY, null)
}

export function readJourneyStartDate() {
  const raw = localStorage.getItem(JOURNEY_START_KEY)
  return raw ? raw : null
}

export function saveDiagnosis(diagnosis) {
  write(DIAGNOSIS_KEY, diagnosis)
  window.dispatchEvent(new Event('diagnosis_updated'))
}

export function saveAssignedTrack(trackId) {
  write(TRACK_KEY, trackId)
  if (!readJourneyStartDate()) {
    const today = new Date().toISOString().split('T')[0]
    localStorage.setItem(JOURNEY_START_KEY, today)
  }
  window.dispatchEvent(new Event('diagnosis_updated'))
  queueJourneyStateSync()
}

export function clearDiagnosis() {
  localStorage.removeItem(DIAGNOSIS_KEY)
  localStorage.removeItem(TRACK_KEY)
  localStorage.removeItem(JOURNEY_START_KEY)
  window.dispatchEvent(new Event('diagnosis_updated'))
}

export default function useFinancialDiagnosis() {
  const [diagnosis, setDiagnosis] = useState(() => readDiagnosis())
  const [assignedTrack, setAssignedTrack] = useState(() => readAssignedTrack())
  const [journeyStartDate, setJourneyStartDate] = useState(() => readJourneyStartDate())

  useEffect(() => {
    const sync = () => {
      setDiagnosis(readDiagnosis())
      setAssignedTrack(readAssignedTrack())
      setJourneyStartDate(readJourneyStartDate())
    }
    window.addEventListener('diagnosis_updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('diagnosis_updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const save = useCallback((diag, trackId) => {
    saveDiagnosis(diag)
    saveAssignedTrack(trackId)
    syncDiagnosisState(diag, trackId).catch(() => {
      // Keep the local cache working if the backend is temporarily unavailable.
    })
  }, [])

  const clear = useCallback(() => {
    clearDiagnosis()
  }, [])

  return { diagnosis, assignedTrack, journeyStartDate, save, clear }
}
