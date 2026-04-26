import { useEffect, useMemo, useRef, useState } from 'react'
import { Zap, ShieldCheck, Users, Sparkles, Target, Eye, TrendingUp } from 'lucide-react'

function randomBetween(minMs, maxMs) {
  return Math.floor(minMs + Math.random() * (maxMs - minMs + 1))
}

var NOTIFICATIONS = [
  {
    id: 'movement',
    icon: Users,
    title: '17 pessoas acessaram esta etapa nos últimos minutos',
    subtitle: 'A maioria começou pela fase Seder HaKesef para identificar seus gatilhos financeiros.',
  },
  {
    id: 'value',
    icon: Zap,
    title: 'Valor reservado por poucos minutos',
    subtitle: 'Depois que a janela encerra, a próxima liberação pode voltar com outro valor.',
  },
  {
    id: 'started',
    icon: Sparkles,
    title: 'Nova jornada iniciada agora',
    subtitle: 'Mais uma pessoa começou os 21 dias para entender por que o dinheiro escapa.',
  },
  {
    id: 'stripe',
    icon: ShieldCheck,
    title: 'Acesso seguro via Stripe',
    subtitle: 'Crie sua conta e use o mesmo e-mail no pagamento para liberação automática.',
  },
  {
    id: 'root',
    icon: Target,
    title: 'Comece pela raiz do problema',
    subtitle: 'Antes de prosperar, você precisa enxergar o padrão que controla suas decisões.',
  },
  {
    id: 'phase',
    icon: Eye,
    title: 'A primeira fase revela o gatilho',
    subtitle: 'Os 21 dias mostram onde seu dinheiro está sendo perdido sem perceber.',
  },
  {
    id: 'not-cuts',
    icon: TrendingUp,
    title: 'Não é corte de gastos',
    subtitle: 'É domínio financeiro: viver melhor, decidir melhor e construir com consciência.',
  },
]

function pickNextNotification(lastId) {
  if (NOTIFICATIONS.length <= 1) return NOTIFICATIONS[0]
  var next = NOTIFICATIONS[Math.floor(Math.random() * NOTIFICATIONS.length)]
  if (next.id === lastId) {
    next = NOTIFICATIONS[(NOTIFICATIONS.findIndex(function (n) { return n.id === next.id }) + 1) % NOTIFICATIONS.length]
  }
  return next
}

export default function FloatingProof() {
  var [visible, setVisible] = useState(false)
  var [current, setCurrent] = useState(NOTIFICATIONS[0])
  var lastIdRef = useRef(current.id)
  var isInteractingRef = useRef(false)
  var timeoutsRef = useRef([])

  var Icon = useMemo(function () {
    return current.icon || Zap
  }, [current])

  useEffect(function () {
    function clearAll() {
      for (var i = 0; i < timeoutsRef.current.length; i++) {
        clearTimeout(timeoutsRef.current[i])
      }
      timeoutsRef.current = []
    }

    function cycle() {
      if (isInteractingRef.current) {
        var retryTimeout = setTimeout(function () {
          cycle()
        }, 2000)
        timeoutsRef.current.push(retryTimeout)
        return
      }

      var next = pickNextNotification(lastIdRef.current)
      lastIdRef.current = next.id
      setCurrent(next)
      setVisible(true)

      // Visible most of the interval to feel like a real notification.
      var hideAfter = 4200
      var interval = randomBetween(5000, 8000)
      var hideTimeout = setTimeout(function () {
        setVisible(false)
      }, hideAfter)

      var nextTimeout = setTimeout(function () {
        cycle()
      }, interval)

      timeoutsRef.current.push(hideTimeout)
      timeoutsRef.current.push(nextTimeout)
    }

    var initialDelay = randomBetween(1500, 2000)
    var startTimeout = setTimeout(function () {
      cycle()
    }, initialDelay)

    timeoutsRef.current.push(startTimeout)

    return function () {
      clearAll()
    }
  }, [])

  useEffect(function () {
    function onFocusIn(event) {
      var t = event && event.target
      var tag = (t && t.tagName) ? String(t.tagName).toLowerCase() : ''
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        isInteractingRef.current = true
        setVisible(false)
      }
    }

    function onFocusOut() {
      isInteractingRef.current = false
    }

    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)
    return function () {
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  return (
    <div
      className={'floating-proof' + (visible ? ' floating-proof--visible' : '')}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="floating-proof__inner">
        <div className="floating-proof-icon" aria-hidden="true">
          <Icon size={16} />
        </div>
        <div className="floating-proof-content">
          <div className="floating-proof-title">{current.title}</div>
          <div className="floating-proof-subtitle">{current.subtitle}</div>
        </div>
      </div>
    </div>
  )
}
