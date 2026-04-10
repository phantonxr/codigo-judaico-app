function repeatDays(totalDays, baseActions) {
  const out = []
  for (let i = 0; i < totalDays; i += 1) {
    out.push(baseActions[i % baseActions.length])
  }
  return out
}

export const challenges = [
  {
    id: 'cj_7d',
    title: '7 dias — consciência de gastos',
    description:
      'Um desafio curto para aumentar consciência, reduzir impulsos e criar um micro-hábito sustentável.',
    level: 'Iniciante',
    days: 7,
    reward: 'Mini recompensa: checklist de consciência + frase de propósito',
    status: 'Disponível',
    dailyActions: [
      'Observe 1 gasto automático que você faria sem pensar.',
      'Registre 3 gastos do dia e marque 1 como “não essencial”.',
      'Antes de comprar algo, faça uma pausa de 90 segundos.',
      'Escolha 1 substituição consciente (trocar um gasto por um hábito).',
      'Revise o dia: qual gasto trouxe paz? qual trouxe ansiedade?',
      'Defina um limite simples para amanhã (um número).',
      'Escreva 1 decisão que você quer repetir na próxima semana.',
    ],
  },
  {
    id: 'cj_21d',
    title: '21 dias — reconstrução de hábitos financeiros',
    description:
      'Reconstrução com consistência: pequenas decisões repetidas para criar estabilidade e reduzir ruído.',
    level: 'Intermediário',
    days: 21,
    reward: 'Mini recompensa: plano de 3 hábitos + métricas semanais',
    status: 'Disponível',
    dailyActions: repeatDays(21, [
      'Faça a rotina de 5 minutos: saldo, 1 registro, 1 ajuste.',
      'Escolha 1 gasto para reduzir 10% hoje.',
      'Planeje as próximas 24 horas: o que pode virar “automático saudável”?',
      'Organize um balde (reserva, crescimento, generosidade) com um valor simbólico.',
      'Identifique um gatilho emocional e escreva uma alternativa de cuidado.',
      'Faça uma compra consciente: pequena, planejada e alinhada a valores.',
      'Revisão do dia: 1 vitória, 1 aprendizado, 1 ajuste.',
    ]),
  },
  {
    id: 'cj_30d',
    title: '30 dias — patrimônio e prosperidade',
    description:
      'Um mês de construção: reserva, limites e um plano simples de crescimento com propósito.',
    level: 'Avançado',
    days: 30,
    reward: 'Mini recompensa: template de patrimônio + trilha de 30 dias',
    status: 'Disponível',
    dailyActions: repeatDays(30, [
      'Defina sua meta de 30 dias (número + prazo + primeira ação).',
      'Ajuste 1 vazamento: cancele/renegocie algo pequeno hoje.',
      'Crie reserva: separe um valor simbólico imediatamente.',
      'Organize 1 fonte de renda: documentação, portfólio ou proposta.',
      'Escolha 1 estudo curto e aplique em uma ação prática.',
      'Faça uma revisão semanal: o que aumentou paz e controle?',
      'Defina um limite saudável para impulsos (regra simples).',
    ]),
  },
]

// TODO: persistir progresso por usuário
