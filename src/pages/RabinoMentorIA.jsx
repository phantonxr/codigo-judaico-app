import { useEffect, useRef, useState } from 'react'
import SectionCard from '../components/SectionCard.jsx'
import { useRabinoMentor } from '../hooks/useRabinoMentor.js'
import useCurrentUser from '../hooks/useCurrentUser.js'

function computeInitials(name) {
  const cleaned = String(name ?? '').trim()
  if (!cleaned) return 'CJ'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? 'C'
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : 'J'
  return `${String(first).toUpperCase()}${String(last).toUpperCase()}`
}

export default function RabinoMentorIA() {
  const currentUser = useCurrentUser()
  const mentorProfile = {
    id: currentUser?.id || currentUser?.email || 'anon',
    name: currentUser?.name || 'Aluno',
    plan: currentUser?.plan || '',
  }

  const {
    messages,
    send,
    isAsking,
    quickSuggestions,
    lastError,
    retryLast,
    clear,
    exportHistory,
    usage,
    blocked,
    startMentorUnlimitedCheckout,
  } = useRabinoMentor(mentorProfile)
  const [text, setText] = useState('')
  const endRef = useRef(null)

  const initials = computeInitials(mentorProfile.name)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isAsking])

  async function onSend(e) {
    e.preventDefault()
    const value = text
    setText('')
    await send(value)
  }

  function applySuggestion(s) {
    setText(s)
  }

  return (
    <div className="container" style={{ display: 'grid', gap: 14 }}>
      <SectionCard
        title="Rabino Mentor"
        description="Pergunte sobre o Código Judaico da Prosperidade: gatilhos de gasto, autocontrole, organização e patrimônio — com orientação prática e sabedoria judaica."
      >
        <div className="chat-shell" aria-label="Chat do Rabino Mentor">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge">Online agora</span>
              {usage ? (
                <span className="badge" style={{ opacity: 0.9 }}>
                  Interações hoje: {usage.interactionsToday}/{usage.dailyLimit}
                </span>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-soft" onClick={exportHistory}>
                Exportar
              </button>
              <button type="button" className="btn btn-soft" onClick={clear}>
                Limpar
              </button>
              <button
                type="button"
                className="btn btn-soft"
                onClick={retryLast}
                disabled={isAsking}
              >
                Tentar novamente
              </button>
            </div>
          </div>

          {lastError ? (
            <div className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div className="muted">{lastError}</div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={retryLast}
                  disabled={isAsking}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}

          {blocked ? (
            <div className="card" style={{ padding: 12, borderColor: 'rgba(215, 178, 74, 0.55)' }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900 }}>Limite diário atingido</div>
                <div className="muted" style={{ lineHeight: 1.6 }}>
                  {blocked.message}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={startMentorUnlimitedCheckout}
                  disabled={isAsking}
                >
                  {blocked.ctaLabel} — {blocked.upsellPrice}
                </button>
              </div>
            </div>
          ) : null}

          <div className="chat-log" aria-label="Histórico do chat">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`bubble ${m.role === 'assistant' ? 'assistant' : 'user'}`}
              >
                <div className="bubble-meta">
                  <div className="bubble-who">
                    {m.role === 'assistant' ? (
                      <span className="bubble-avatar">R</span>
                    ) : (
                      <span className="bubble-avatar user">{initials}</span>
                    )}
                    <strong>
                      {m.role === 'assistant' ? 'Rabino Mentor' : 'Você'}
                    </strong>
                  </div>
                  <span className="muted">{m.timestamp}</span>
                </div>
                <div className="bubble-text">{m.content}</div>
              </div>
            ))}

            <div ref={endRef} />
          </div>

          <div className="chat-inputbar">
            <div className="chips" aria-label="Sugestões rápidas">
              {quickSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  onClick={() => applySuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <form className="chat-form" onSubmit={onSend}>
              <input
                className="input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva sua mensagem…"
                aria-label="Mensagem"
                disabled={isAsking || blocked}
              />
              <button className="btn btn-primary" type="submit" disabled={isAsking || blocked}>
                Enviar
              </button>
            </form>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
