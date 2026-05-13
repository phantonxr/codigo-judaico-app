import { useTranslation } from 'react-i18next'

export default function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation()
  const currentLang = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en'

  function toggle() {
    const next = currentLang === 'pt-BR' ? 'en' : 'pt-BR'
    i18n.changeLanguage(next)
  }

  return (
    <button
      type="button"
      className={'btn btn-soft' + (className ? ' ' + className : '')}
      onClick={toggle}
      aria-label={t('common.switch_language')}
      title={t('common.switch_language')}
      style={{ fontSize: 12, padding: '6px 10px', fontWeight: 700, letterSpacing: '0.02em' }}
    >
      {currentLang === 'pt-BR' ? 'EN' : 'PT'}
    </button>
  )
}
