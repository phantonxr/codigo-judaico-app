import { systemPrompt, buildSystemPromptWithContext } from '../constants/systemPrompt.js'
import { apiFetch } from './apiClient.js'

function safeTrim(text) {
  return String(text ?? '').trim()
}

function toRecentHistory(messages, max = 8) {
  const arr = Array.isArray(messages) ? messages : []
  return arr
    .slice(-max)
    .map((m) => ({ role: m.role, content: String(m.content ?? '') }))
}

function offlineFallbackAnswer(message, context = {}) {
  const text = safeTrim(message).toLowerCase()
  const style =
    'Vamos com equilíbrio: riqueza como ferramenta, consciência no gasto e paz na mente.'

  if (text.includes('compuls') || text.includes('compr')) {
    return (
      `Obrigado por sua honestidade. ${style}\n\n` +
      'Hoje observe o gatilho (cansaço, ansiedade, comparação ou recompensa). ' +
      'Antes de comprar, faça uma pausa curta e escreva 1 frase: “o que eu estou tentando aliviar agora?”.\n\n' +
      'Micro-ação: escolha 1 compra que você vai adiar por 24h hoje.'
    )
  }

  if (text.includes('invest')) {
    return (
      `Investir é constância, não pressa. ${style}\n\n` +
      'Comece pelo básico: reserva, segurança e só então crescimento.\n\n' +
      'Micro-ação: defina um valor mensal fixo (mesmo pequeno) e uma data para automatizar.'
    )
  }

  if (text.includes('organ') || text.includes('gasto')) {
    return (
      `Clareza precede prosperidade. ${style}\n\n` +
      'Hoje faça um inventário simples: 3 gastos fixos, 3 variáveis e 1 automático invisível.\n\n' +
      'Micro-ação: escolha 1 gasto automático para reduzir 10% por 7 dias.'
    )
  }

  const plan = context?.currentPlan ? ` (plano: ${context.currentPlan})` : ''
  return (
    `${style}${plan}\n\n` +
    'Para eu te orientar com precisão: qual é sua meta financeira para os próximos 30 dias (um número)?\n\n' +
    'Micro-ação: escreva agora 1 gasto que você vai observar hoje sem julgar.'
  )
}

/**
 * sendMessageToRabino(payload)
 *
 * Chama o backend via POST /api/rabino-mentor.
 * - Não coloque chaves sensíveis no frontend.
 * - Integração real deve rodar no servidor (Vercel Functions / Supabase Edge / n8n).
 */
export async function sendMessageToRabino(payload) {
  const message = safeTrim(payload?.message)
  if (!message) return ''

  const requestBody = {
    ...payload,
    message,
    systemPrompt: payload.contextualPrompt || systemPrompt,
  }

  // TODO: integrar Supabase memory
  // TODO: persistir progresso por usuário
  // TODO: salvar memória do Rabino Mentor

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const data = await apiFetch('/api/rabino-mentor', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
    const reply =
      (typeof data?.reply === 'string' && data.reply) ||
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.output === 'string' && data.output) ||
      ''

    if (!reply) throw new Error('Resposta do backend vazia.')
    return reply
  } finally {
    clearTimeout(timeout)
  }
}

export function buildRabinoPayload({
  message,
  userProfile,
  score,
  currentChallenge,
  recentMessages,
  diagnosis,
  assignedTrack,
  currentDay,
}) {
  const contextualPrompt = (diagnosis || assignedTrack)
    ? buildSystemPromptWithContext(diagnosis, assignedTrack, currentDay)
    : systemPrompt

  return {
    message,
    userId: userProfile?.id,
    userName: userProfile?.name,
    streak: userProfile?.streakDays,
    score: score ?? userProfile?.financialAwarenessScore,
    currentChallenge: currentChallenge ?? userProfile?.currentChallengeId,
    currentPlan: userProfile?.planName || userProfile?.plan,
    recentHistory: toRecentHistory(recentMessages),
    contextualPrompt,
  }
}

export function fallbackRabinoReply(message, payload) {
  return offlineFallbackAnswer(message, payload)
}
