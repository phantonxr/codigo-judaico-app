import { useEffect, useMemo, useRef, useState } from 'react'
import { Zap, ShieldCheck, Star, CheckCircle2 } from 'lucide-react'

function randomBetween(minMs, maxMs) {
  return Math.floor(minMs + Math.random() * (maxMs - minMs + 1))
}

var NOTIFICATIONS = [
  {
    id: 'movement',
    icon: Zap,
    title: '17 pessoas acessaram esta etapa nos últimos minutos',
    subtitle: 'A liberação acontece após a confirmação segura do Stripe.',
  },
  {
    id: 'value',
    icon: Star,
    title: 'Últimas liberações no valor atual',
    subtitle: 'O acesso de 21 dias está disponível agora por R$ 29,90.',
  },
  {
    id: 'stripe',
    icon: ShieldCheck,
    title: 'Pagamento seguro via Stripe',
    subtitle: 'Seus dados são protegidos e o acesso é liberado após confirmação.',
  },
  {
    id: 'started',
    icon: CheckCircle2,
    title: 'Uma nova jornada foi iniciada agora',
    subtitle: 'Mais pessoas estão desbloqueando os gatilhos que travam a prosperidade.',
  },
  {
    id: 'window',
    icon: Zap,
    title: 'Oferta ativa por tempo limitado',
    subtitle: 'Esse valor pode mudar quando a janela atual encerrar.',
  },
  {
    id: 'account',
    icon: ShieldCheck,
    title: 'Acesso liberado após confirmação',
    subtitle: 'Crie sua conta agora e use o mesmo e-mail no pagamento.',
  },
  {
    id: 'social',
    icon: Star,
    title: 'Mais de 1.247 pessoas já iniciaram essa jornada',
    subtitle: 'Comece pela fase Seder HaKesef e descubra seus gatilhos financeiros.',
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
