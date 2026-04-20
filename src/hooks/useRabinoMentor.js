import { useCallback, useMemo, useRef, useState } from 'react'
import {
  buildRabinoPayload,
  fallbackRabinoReply,
  sendMessageToRabino,
} from '../services/rabinoMentorService.js'
import { readJson, mergeJson, remove } from '../utils/storage.js'
import { readDiagnosis, readAssignedTrack } from './useFinancialDiagnosis.js'
import { getCurrentDayIndex } from './useJourneyProgress.js'
import { deleteMentorMessagesOnServer } from '../services/sessionSync.js'

function chatKey(userId) {
  return `mentor_chat:${userId ?? 'anon'}`
}

function nowLabel() {
  const d = new Date()
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export function useRabinoMentor(userProfile) {
  const storageKey = useMemo(() => chatKey(userProfile?.id), [userProfile?.id])
  const lastUserMessageRef = useRef('')
  const [lastError, setLastError] = useState('')

  const initial = useMemo(() => {
    const saved = readJson(storageKey, null)
    if (saved?.messages?.length) return saved.messages

    const diag = readDiagnosis()
    const track = readAssignedTrack()
    const greeting = diag && track
      ? `Shalom. Vejo que sua trilha é "${diag.trackLabel}". Estou aqui para te orientar nessa jornada. Como posso te ajudar hoje?`
      : 'Shalom. Vamos começar com clareza: qual é o seu objetivo financeiro para os próximos 30 dias?'

    return [
      {
        id: makeId('a'),
        role: 'assistant',
        content: greeting,
        timestamp: 'agora',
      },
    ]
  }, [storageKey])

  const [messages, setMessages] = useState(initial)
  const [isAsking, setIsAsking] = useState(false)

  const persist = useCallback((nextMessages) => {
    mergeJson(storageKey, { messages: nextMessages }, { messages: [] })
  }, [storageKey])

  const clear = useCallback(() => {
    remove(storageKey)
    deleteMentorMessagesOnServer(userProfile?.id).catch(() => {
      // Keep local reset even if the backend call fails.
    })
    const reset = [
      {
        id: makeId('a'),
        role: 'assistant',
        content:
          'Shalom. Me diga: qual é o seu objetivo financeiro para os próximos 30 dias, em um número?',
        timestamp: 'agora',
      },
    ]
    setMessages(reset)
    setLastError('')
    persist(reset)
  }, [persist, storageKey, userProfile?.id])

  const exportHistory = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      userId: userProfile?.id,
      userName: userProfile?.name,
      messages,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historico-rabino-${userProfile?.id ?? 'anon'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages, userProfile?.id, userProfile?.name])

  const typeIntoMessage = useCallback((messageId, fullText) => {
    const text = String(fullText ?? '')
    if (!text) return

    let i = 0
    const step = () => {
      i += Math.max(2, Math.ceil(text.length / 120))
      const slice = text.slice(0, i)
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === messageId ? { ...m, content: slice } : m))
        persist(next)
        return next
      })
      if (i < text.length) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [persist])

  const send = useCallback(
    async (text) => {
      const trimmed = String(text ?? '').trim()
      if (!trimmed) return

      setLastError('')
      lastUserMessageRef.current = trimmed

      const userMsg = {
        id: makeId('u'),
        role: 'user',
        content: trimmed,
        timestamp: nowLabel(),
      }

      setIsAsking(true)
      setMessages((prev) => {
        const next = [...prev, userMsg]
        persist(next)
        return next
      })

      try {
        const pendingId = makeId('a')
        setMessages((prev) => {
          const next = [
            ...prev,
            { id: pendingId, role: 'assistant', content: '…', timestamp: 'agora' },
          ]
          persist(next)
          return next
        })

        const historyForPayload = [...messages, userMsg]
        const payload = buildRabinoPayload({
          message: trimmed,
          userProfile,
          recentMessages: historyForPayload,
          diagnosis: readDiagnosis(),
          assignedTrack: readAssignedTrack(),
          currentDay: getCurrentDayIndex(),
        })

        let answer = ''
        try {
          answer = await sendMessageToRabino(payload)
        } catch {
          setLastError(
            'Não consegui conectar ao mentor agora. Usei um modo offline (mockado) por enquanto.',
          )
          answer = fallbackRabinoReply(trimmed, payload)
        }

        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === pendingId ? { ...m, content: '', timestamp: nowLabel() } : m,
          )
          persist(next)
          return next
        })

        typeIntoMessage(pendingId, answer)
      } finally {
        setIsAsking(false)
      }
    },
    [messages, persist, typeIntoMessage, userProfile],
  )

  const retryLast = useCallback(async () => {
    if (!lastUserMessageRef.current) return
    await send(lastUserMessageRef.current)
  }, [send])

  const quickSuggestions = useMemo(
    () => [
      'Quais gatilhos me fazem gastar sem perceber?',
      'Preciso de autocontrole nas compras por impulso',
      'Como organizar casa e finanças nesta fase?',
      'Por onde começo a investir com prudência?',
      'Como prosperar com equilíbrio emocional?',
    ],
    [],
  )

  return {
    messages,
    send,
    isAsking,
    quickSuggestions,
    lastError,
    retryLast,
    clear,
    exportHistory,
  }
}

// TODO: persistir progresso por usuário
