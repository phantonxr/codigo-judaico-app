export const wisdomSnippets = [
  {
    id: 'w1',
    source: 'Pirkei Avot (inspirado)',
    teaching:
      'Não é o tamanho do ganho que traz paz, e sim a qualidade das escolhas e a disciplina em manter o que importa.',
  },
  {
    id: 'w2',
    source: 'Provérbios (inspirado)',
    teaching:
      'A pressa promete atalhos, mas a constância constrói estabilidade. Prefira o pequeno passo repetido ao impulso.',
  },
  {
    id: 'w3',
    source: 'Talmud (inspirado)',
    teaching:
      'Diversificar reduz o medo do amanhã. Segurança é estrutura: reserva, prudência e escolhas claras.',
  },
  {
    id: 'w4',
    source: 'Ética judaica (inspirado)',
    teaching:
      'Riqueza é responsabilidade: usar recursos para sustentar a vida, proteger a família e ampliar o bem.',
  },
  {
    id: 'w5',
    source: 'Eclesiastes (inspirado)',
    teaching:
      'Há tempo de guardar e tempo de gastar. Sabedoria é reconhecer a estação e agir sem excessos.',
  },
  {
    id: 'w6',
    source: 'Pirkei Avot (inspirado)',
    teaching:
      'Quem governa seus impulsos é mais forte do que quem conquista por força externa. Hoje, governe um impulso.',
  },
]

export function pickWisdomForDate(date = new Date()) {
  const daySeed = Number(
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate(),
    ).padStart(2, '0')}`,
  )
  const index = daySeed % wisdomSnippets.length
  return wisdomSnippets[index]
}
