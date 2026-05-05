import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en'

  function toggle() {
    const next = currentLang === 'pt-BR' ? 'en' : 'pt-BR'
    i18n.changeLanguage(next)
  }

  return (
    <button
      type="button"
      className="btn btn-soft"
      onClick={toggle}
      aria-label="Switch language"
      style={{ fontSize: 12, padding: '6px 10px', fontWeight: 700, letterSpacing: '0.02em' }}
    >
      {currentLang === 'pt-BR' ? 'EN' : 'PT'}
    </button>
  )
}
