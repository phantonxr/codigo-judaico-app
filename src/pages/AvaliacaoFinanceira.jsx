import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionCard from '../components/SectionCard.jsx'
import useFinancialDiagnosis from '../hooks/useFinancialDiagnosis.js'
import useCurrentUser from '../hooks/useCurrentUser.js'
import { TRACK_DESCRIPTIONS, TRACK_LABELS } from '../data/challenges21Days.js'

const QUESTIONS = [
  {
    id: 'q1',
    text: 'Quando estou ansioso(a), costumo gastar dinheiro para aliviar a tensão.',
    category: 'impulso',
  },
  {
    id: 'q2',
    text: 'Já comprei coisas que escondi do meu cônjuge ou família.',
    category: 'impulso',
  },
  {
    id: 'q3',
    text: 'Sinto prazer momentâneo ao comprar, mas arrependimento depois.',
    category: 'impulso',
  },
  {
    id: 'q4',
    text: 'Tenho gastos que prefiro que ninguém saiba.',
    category: 'impulso',
  },
  {
    id: 'q5',
    text: 'Uso o consumo como fuga emocional (tédio, solidão, frustração).',
    category: 'impulso',
  },
  {
    id: 'q6',
    text: 'Compro coisas para parecer bem-sucedido(a) para os outros.',
    category: 'fundacao',
  },
  {
    id: 'q7',
    text: 'Tenho bens (carro, roupas, eletrônicos) que custaram mais do que deviam para minha renda.',
    category: 'fundacao',
  },
  {
    id: 'q8',
    text: 'Tenho dívidas que surgiram por querer manter um estilo de vida acima do que posso.',
    category: 'fundacao',
  },
  {
    id: 'q9',
    text: 'Priorizo aparência e conforto antes de ter reserva de emergência.',
    category: 'fundacao',
  },
  {
    id: 'q10',
    text: 'Sinto que preciso mostrar progresso material para ser respeitado(a).',
    category: 'fundacao',
  },
  {
    id: 'q11',
    text: 'Tenho medo de olhar meus extratos bancários ou dívidas.',
    category: 'abundancia',
  },
  {
    id: 'q12',
    text: 'Acredito que dinheiro é algo "difícil" ou "não é para mim".',
    category: 'abundancia',
  },
  {
    id: 'q13',
    text: 'Minha família sempre passou dificuldade e eu internalizei que é assim que deve ser.',
    category: 'abundancia',
  },
  {
    id: 'q14',
    text: 'Fico paralisado(a) quando preciso tomar decisões financeiras.',
    category: 'abundancia',
  },
  {
    id: 'q15',
    text: 'Não consigo pensar em investimentos ou crescimento — só sobrevivência.',
    category: 'abundancia',
  },
]

const SCALE_OPTIONS = [
  { value: 1, label: 'Discordo totalmente' },
  { value: 2, label: 'Discordo' },
  { value: 3, label: 'Neutro' },
  { value: 4, label: 'Concordo' },
  { value: 5, label: 'Concordo totalmente' },
]

function analyzeDiagnosis(answers) {
  const scores = { impulso: 0, fundacao: 0, abundancia: 0 }
  for (const q of QUESTIONS) {
    scores[q.category] += (answers[q.id] || 3)
  }

  const max = Math.max(scores.impulso, scores.fundacao, scores.abundancia)
  let trackId, trackLabel, diagnostico, gatilho, sabedoria, proverbio, metodo

  if (max === scores.impulso) {
    trackId = 'trilha1'
    trackLabel = 'Tikun do Impulso'
    diagnostico = 'Seu padrão principal é o consumo por impulso emocional. Você usa compras como válvula de escape para ansiedade, tédio, solidão ou frustração. O prazer é momentâneo, mas o arrependimento se acumula. Pode haver gastos secretos ou "adultério financeiro" — consumo que você esconde de quem ama.'
    gatilho = 'O gatilho raiz está ligado à busca por dopamina rápida. Quando a emoção é desconfortável, o cérebro busca alívio imediato no consumo. Com o tempo, isso se torna um ciclo: tensão → compra → alívio → culpa → mais tensão.'
    sabedoria = 'Na tradição judaica, o "yetzer hará" (inclinação ao mal) não é destruído — é redirecionado. O impulso não é o inimigo; o impulso sem direção é. O Talmud ensina que quem governa seus impulsos é mais forte do que quem conquista cidades.'
    proverbio = '"Quem governa seus impulsos é mais forte do que quem conquista cidades." — Pirkei Avot 4:1'
    metodo = 'O método judaico para compulsão é o Tikun (reparo): pausa antes da ação, nomeação do sentimento e redirecionamento da energia. Em vez de lutar contra o impulso, você o observa, nomeia e escolhe conscientemente. A cada pausa de 90 segundos, você fortalece seu "músculo da escolha".'
  } else if (max === scores.fundacao) {
    trackId = 'trilha2'
    trackLabel = 'Fundação do Patrimônio'
    diagnostico = 'Seu padrão principal é construir "por cima" antes de ter a base. Você investe em aparência, conforto e status antes de ter reserva, quitação de dívidas e estrutura real. A casa parece bonita, mas o alicerce é frágil.'
    gatilho = 'O gatilho raiz é a necessidade de validação externa. O ego busca reconhecimento através de posses materiais. Dívidas por status são o sintoma; a causa é confundir patrimônio com aparência.'
    sabedoria = 'Provérbios 24:27 ensina: "Primeiro prepare o campo, depois construa a casa." Na tradição judaica, a ordem importa. Antes de exibir, proteja. Antes de decorar, fundamente. O sábio constrói primeiro o que ninguém vê — a fundação.'
    proverbio = '"Primeiro prepare o campo, depois construa a casa." — Provérbios 24:27'
    metodo = 'O método judaico para ego financeiro é a inversão de prioridades: reserva antes de luxo, quitação antes de aquisição, simplicidade antes de ostentação. A cada decisão, pergunte: "Isso fortalece minha fundação ou só minha fachada?"'
  } else {
    trackId = 'trilha3'
    trackLabel = 'Abundância com Prudência'
    diagnostico = 'Seu padrão principal é a paralisia por medo. Traumas financeiros passados, crenças de escassez herdadas e medo de perder criam uma prisão onde você não avança. Sobreviver virou o teto; prosperar parece impossível ou "não é para você".'
    gatilho = 'O gatilho raiz é o trauma financeiro — seu ou da família. Memórias de dificuldade criaram uma narrativa interna de que dinheiro é perigoso, escasso ou "não é para gente como eu". Isso gera paralisia decisória.'
    sabedoria = 'A Torá repete "Não temas" 365 vezes — uma para cada dia do ano. Na tradição judaica, o medo é reconhecido, mas não tem a palavra final. Deuteronômio 30:19 diz: "A vida e a morte pus diante de ti; escolhe a vida." Você tem poder de escolha, mesmo com medo.'
    proverbio = '"Não temas, pois Eu estou contigo." — Isaías 41:10'
    metodo = 'O método judaico para medo financeiro é a ação gradual com fé. Não exige coragem total — exige o primeiro passo. Investir R$10, pedir um aumento, olhar o extrato. Cada pequena ação prova ao cérebro que o perigo não é tão grande quanto o medo sugere.'
  }

  return {
    trackId,
    trackLabel,
    scores,
    diagnostico,
    gatilho,
    sabedoria,
    proverbio,
    metodo,
    answeredAt: new Date().toISOString(),
  }
}

export default function AvaliacaoFinanceira() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { save, diagnosis, assignedTrack } = useFinancialDiagnosis()
  const [step, setStep] = useState(0) // 0 = intro, 1..15 = questions, 16 = result
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)

  const hasCompletedAssessment = Boolean(currentUser?.hasCompletedAssessment)
    || Boolean(diagnosis?.trackId)
    || Boolean(assignedTrack)

  const lockedTrackId = assignedTrack || diagnosis?.trackId || ''
  const lockedTrackLabel = diagnosis?.trackLabel || TRACK_LABELS[lockedTrackId] || lockedTrackId
  const lockedTrackDescription = TRACK_DESCRIPTIONS[lockedTrackId] || ''

  const diagnosisText = String(diagnosis?.diagnostico || '').trim()
  const triggerText = String(diagnosis?.gatilho || '').trim()
  const diagnosisSummary = diagnosisText.length > 240
    ? diagnosisText.slice(0, 240).trim() + '…'
    : diagnosisText

  const questionIndex = step - 1
  const currentQuestion = QUESTIONS[questionIndex]
  const totalQuestions = QUESTIONS.length
  const progressPct = step === 0 ? 0 : Math.round((step / (totalQuestions + 1)) * 100)

  function startAssessment() {
    setStep(1)
  }

  function selectAnswer(value) {
    const next = { ...answers, [currentQuestion.id]: value }
    setAnswers(next)

    if (step < totalQuestions) {
      setStep(step + 1)
    } else {
      const diagnosis = analyzeDiagnosis(next)
      setResult(diagnosis)
      save(diagnosis, diagnosis.trackId)
      setStep(totalQuestions + 1)
    }
  }

  function goToDashboard() {
    navigate('/dashboard')
  }

  function goToDesafios() {
    navigate('/desafios')
  }

  function goToCalendario() {
    navigate('/calendario')
  }

  if (hasCompletedAssessment && lockedTrackId) {
    return (
      <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
        <SectionCard
          title="Avaliação concluída"
          description="Sua trilha foi definida e a jornada já está em andamento."
        >
          <div style={{ display: 'grid', gap: 14, maxWidth: 720 }}>
            <div className="card" style={{ borderColor: 'rgba(215,178,74,0.35)' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Sua trilha
                </div>
                <div style={{ fontWeight: 900, fontSize: 22, color: 'var(--gold-2)', lineHeight: 1.25 }}>
                  {lockedTrackLabel}
                </div>
                {lockedTrackDescription ? (
                  <div className="muted" style={{ lineHeight: 1.7 }}>
                    {lockedTrackDescription}
                  </div>
                ) : null}
              </div>
            </div>

            {diagnosisSummary ? (
              <div className="card" style={{ borderColor: 'rgba(215,178,74,0.18)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Diagnóstico resumido
                  </div>
                  <div className="muted" style={{ lineHeight: 1.75 }}>
                    {diagnosisSummary}
                  </div>
                </div>
              </div>
            ) : null}

            {triggerText ? (
              <div className="card" style={{ borderColor: 'rgba(215,178,74,0.18)' }}>
                <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Gatilho principal identificado
                  </div>
                  <div className="muted" style={{ lineHeight: 1.75 }}>
                    {triggerText}
                  </div>
                </div>
              </div>
            ) : null}

            <button className="btn btn-primary" type="button" onClick={goToDesafios}>
              Continuar minha jornada
            </button>
          </div>
        </SectionCard>
      </div>
    )
  }

  // Intro
  if (step === 0) {
    return (
      <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
        <SectionCard title="Avaliação do Rabino Mentor" description="Diagnóstico personalizado da sua vida financeira.">
          <div style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
            <div className="card" style={{ borderColor: 'rgba(215,178,74,0.35)' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--gold-2)' }}>
                  Shalom. Vamos começar sua jornada.
                </div>
                <div className="muted" style={{ lineHeight: 1.7 }}>
                  O Rabino Mentor IA vai analisar seus padrões financeiros profundos — não apenas seus gastos, 
                  mas as emoções, crenças e comportamentos por trás deles.
                </div>
                <div className="muted" style={{ lineHeight: 1.7 }}>
                  Responda com honestidade. Não há respostas certas ou erradas. O diagnóstico identificará 
                  seu padrão raiz e designará sua trilha personalizada de transformação.
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800 }}>O que será analisado:</div>
              <div className="grid grid-2">
                {[
                  'Gastos por ansiedade',
                  'Compras por validação',
                  'Gastos secretos',
                  'Busca de status',
                  'Fuga emocional',
                  'Crenças familiares',
                  'Medo de dinheiro',
                  'Paralisia financeira',
                ].map(item => (
                  <div key={item} className="badge" style={{ justifyContent: 'flex-start' }}>{item}</div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Após a avaliação você receberá:</div>
              <div className="grid" style={{ gap: 8 }}>
                {[
                  'Diagnóstico psicológico financeiro',
                  'Identificação do gatilho raiz',
                  'Sabedoria judaica aplicada',
                  'Provérbio inspirador',
                  'Método prático de transformação',
                  'Trilha personalizada de 21 dias + 6 meses',
                ].map(item => (
                  <div key={item} className="muted">✦ {item}</div>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" type="button" onClick={startAssessment} style={{ marginTop: 8 }}>
              Iniciar avaliação
            </button>
          </div>
        </SectionCard>
      </div>
    )
  }

  // Result
  if (step > totalQuestions && result) {
    return (
      <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
        <SectionCard title="Seu Diagnóstico" description="Resultado da avaliação do Rabino Mentor IA.">
          <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>

            {/* Track badge */}
            <div className="card" style={{ borderColor: 'rgba(215,178,74,0.45)' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 10, textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Sua trilha designada
                </div>
                <div style={{ fontWeight: 900, fontSize: 24, color: 'var(--gold-2)' }}>
                  {result.trackLabel}
                </div>
                <span className="badge" style={{ justifySelf: 'center' }}>Trilha desbloqueada</span>
              </div>
            </div>

            {/* Diagnóstico */}
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Diagnóstico
                </div>
                <div style={{ lineHeight: 1.7 }}>{result.diagnostico}</div>
              </div>
            </div>

            {/* Provérbio */}
            <div className="card" style={{ borderColor: 'rgba(215,178,74,0.25)' }}>
              <div className="card-inner" style={{ display: 'grid', gap: 8, fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 18, color: 'var(--gold-2)', lineHeight: 1.6 }}>
                  {result.proverbio}
                </div>
              </div>
            </div>

            {/* Raiz do problema */}
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Raiz do problema
                </div>
                <div style={{ lineHeight: 1.7 }}>{result.gatilho}</div>
              </div>
            </div>

            {/* Sabedoria judaica */}
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Sabedoria judaica
                </div>
                <div style={{ lineHeight: 1.7 }}>{result.sabedoria}</div>
              </div>
            </div>

            {/* Método judaico */}
            <div className="card">
              <div className="card-inner" style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontWeight: 900, color: 'var(--gold-2)', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Método judaico aplicado
                </div>
                <div style={{ lineHeight: 1.7 }}>{result.metodo}</div>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" type="button" onClick={goToDesafios}>
                Começar minha trilha de 21 dias
              </button>
              <button className="btn" type="button" onClick={goToCalendario}>
                Ver calendário da jornada
              </button>
              <button className="btn" type="button" onClick={goToDashboard}>
                Ir para o Dashboard
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    )
  }

  // Questions
  return (
    <div className="container" style={{ display: 'grid', gap: 14, paddingTop: 16, paddingBottom: 40 }}>
      <SectionCard
        title="Avaliação financeira"
        description={`Pergunta ${step} de ${totalQuestions}`}
      >
        <div style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
          {/* Progress */}
          <div className="progress" aria-label="Progresso da avaliação">
            <div className="progress-fill" style={{ width: `${progressPct}%`, transition: 'width 300ms ease' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="badge">Pergunta {step}/{totalQuestions}</span>
            <span className="badge">{progressPct}%</span>
          </div>

          {/* Question card */}
          <div className="card" style={{ borderColor: 'rgba(215,178,74,0.25)' }}>
            <div className="card-inner" style={{ display: 'grid', gap: 14, padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 17, lineHeight: 1.6 }}>
                {currentQuestion.text}
              </div>
            </div>
          </div>

          {/* Scale options */}
          <div style={{ display: 'grid', gap: 10 }}>
            {SCALE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`btn ${answers[currentQuestion.id] === opt.value ? 'btn-primary' : ''}`}
                type="button"
                onClick={() => selectAnswer(opt.value)}
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              >
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid rgba(215,178,74,0.35)',
                  display: 'inline-grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}>
                  {opt.value}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
