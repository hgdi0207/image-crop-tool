'use client'

import { useLocale } from 'next-intl'

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
]

export default function LanguageSwitcher() {
  const currentLocale = useLocale()

  const switchLocale = (code: string) => {
    const segments = window.location.pathname.split('/')
    segments[1] = code
    window.location.href = segments.join('/')
  }

  return (
    <select
      value={currentLocale}
      onChange={(e) => switchLocale(e.target.value)}
      className="text-sm bg-transparent border border-border rounded px-2 py-1 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  )
}
