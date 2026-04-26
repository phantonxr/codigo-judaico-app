import { useEffect, useRef, useState } from 'react'

var MESSAGES = [
  '🔥 3 pessoas acessaram agora mesmo',
  '✔ João acabou de desbloquear a jornada',
  '⚡ Restam poucas vagas nesse valor',
  '📈 17 acessos nos últimos minutos',
  '🟢 Maria iniciou a jornada agora',
]

function randomBetween(minMs, maxMs) {
  return Math.floor(minMs + Math.random() * (maxMs - minMs + 1))
}

export default function FloatingProof() {
  var [visible, setVisible] = useState(false)
  var [message, setMessage] = useState(MESSAGES[0])
  var timeoutsRef = useRef([])

  useEffect(function () {
    function clearAll() {
      for (var i = 0; i < timeoutsRef.current.length; i++) {
        clearTimeout(timeoutsRef.current[i])
      }
      timeoutsRef.current = []
    }

    function scheduleNext() {
      var wait = randomBetween(6000, 10000)
      var showTimeout = setTimeout(function () {
        var next = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
        setMessage(next)
        setVisible(true)

        var hideTimeout = setTimeout(function () {
          setVisible(false)
          scheduleNext()
        }, 4000)

        timeoutsRef.current.push(hideTimeout)
      }, wait)

      timeoutsRef.current.push(showTimeout)
    }

    scheduleNext()

    return function () {
      clearAll()
    }
  }, [])

  return (
    <div className={'floating-proof' + (visible ? ' floating-proof--visible' : '')} aria-live="polite" aria-atomic="true">
      <div className="floating-proof__inner">{message}</div>
    </div>
  )
}
