import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Zap, ShieldCheck, Users, Sparkles, Target, Eye, TrendingUp } from 'lucide-react'

function randomBetween(minMs, maxMs) {
  return Math.floor(minMs + Math.random() * (maxMs - minMs + 1))
}

var NOTIFICATION_ICONS = {
  movement: Users,
  value: Zap,
  started: Sparkles,
  stripe: ShieldCheck,
  root: Target,
  phase: Eye,
  'not-cuts': TrendingUp,
}

var NOTIFICATION_IDS = ['movement', 'value', 'started', 'stripe', 'root', 'phase', 'not-cuts']

function pickNextId(lastId) {
  if (NOTIFICATION_IDS.length <= 1) return NOTIFICATION_IDS[0]
  var next = NOTIFICATION_IDS[Math.floor(Math.random() * NOTIFICATION_IDS.length)]
  if (next === lastId) {
    next = NOTIFICATION_IDS[(NOTIFICATION_IDS.indexOf(next) + 1) % NOTIFICATION_IDS.length]
  }
  return next
}

export default function FloatingProof() {
  const { t } = useTranslation()
  var [visible, setVisible] = useState(false)
  var [currentId, setCurrentId] = useState(NOTIFICATION_IDS[0])
  var lastIdRef = useRef(currentId)
  var isInteractingRef = useRef(false)
  var timeoutsRef = useRef([])

  var Icon = useMemo(function () {
    return NOTIFICATION_ICONS[currentId] || Zap
  }, [currentId])

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

      var nextId = pickNextId(lastIdRef.current)
      lastIdRef.current = nextId
      setCurrentId(nextId)
      setVisible(true)

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

  var key = currentId.replace(/-/g, '_')
  var title = t('floating_proof.' + key + '_title')
  var subtitle = t('floating_proof.' + key + '_subtitle')

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
          <div className="floating-proof-title">{title}</div>
          <div className="floating-proof-subtitle">{subtitle}</div>
        </div>
      </div>
    </div>
  )
}
