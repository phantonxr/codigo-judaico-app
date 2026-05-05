import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const currentUser = useCurrentUser()
  const mentorProfile = {
    id: currentUser?.id || currentUser?.email || 'anon',
    name: currentUser?.name || t('common.student_fallback'),
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
        title={t('mentor.title')}
        description={t('mentor.description')}
      >
        <div className="chat-shell" aria-label={t('mentor.chat_history_label')}>
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
              <span className="badge">{t('mentor.online_badge')}</span>
              {usage ? (
                <span className="badge" style={{ opacity: 0.9 }}>
                  {t('mentor.interactions_badge', { today: usage.interactionsToday, limit: usage.dailyLimit })}
                </span>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-soft" onClick={exportHistory}>
                {t('mentor.export_btn')}
              </button>
              <button type="button" className="btn btn-soft" onClick={clear}>
                {t('mentor.clear_btn')}
              </button>
              <button
                type="button"
                className="btn btn-soft"
                onClick={retryLast}
                disabled={isAsking}
              >
                {t('mentor.retry_btn')}
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
                  {t('mentor.retry_short')}
                </button>
              </div>
            </div>
          ) : null}

          {blocked ? (
            <div className="card" style={{ padding: 12, borderColor: 'rgba(215, 178, 74, 0.55)' }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900 }}>{t('mentor.daily_limit_title')}</div>
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

          <div className="chat-log" aria-label={t('mentor.chat_history_label')}>
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
                      {m.role === 'assistant' ? t('mentor.role_assistant') : t('mentor.role_user')}
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
            <div className="chips" aria-label={t('mentor.suggestions_label')}>
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
                placeholder={t('mentor.placeholder')}
                aria-label={t('mentor.message_label')}
                disabled={isAsking || blocked}
              />
              <button className="btn btn-primary" type="submit" disabled={isAsking || blocked}>
                {t('mentor.send_btn')}
              </button>
            </form>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
