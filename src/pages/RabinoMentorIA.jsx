import { useEffect, useRef, useState } from 'react'
import SectionCard from '../components/SectionCard.jsx'
import { userProfile } from '../mock/userProfile.js'
import { useRabinoMentor } from '../hooks/useRabinoMentor.js'

export default function RabinoMentorIA() {
  const {
    messages,
    send,
    isAsking,
    quickSuggestions,
    lastError,
    retryLast,
    clear,
    exportHistory,
  } = useRabinoMentor(userProfile)
  const [text, setText] = useState('')
  const endRef = useRef(null)

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
        description="Mentor premium com integração via backend (n8n / Supabase / Vercel)."
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
            <span className="badge">Online agora</span>

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
                      <span className="bubble-avatar user">{userProfile.initials}</span>
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
              />
              <button className="btn btn-primary" type="submit" disabled={isAsking}>
                Enviar
              </button>
            </form>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
