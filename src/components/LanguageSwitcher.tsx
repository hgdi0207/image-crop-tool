'use client'

import { useLocale } from 'next-intl'

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
]

export default function LanguageSwitcher() {
  const currentLocale = useLocale()

  const switchLocale = (code: string) => {
    // window.location.pathname always includes the locale prefix, e.g. '/en' or '/en/editor'
    // Split by '/', replace segment[1] (the locale), rejoin, then hard-reload
    const segments = window.location.pathname.split('/')
    segments[1] = code
    window.location.href = segments.join('/')
  }

  return (
    <div className="flex items-center gap-1 text-sm">
      {LOCALES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-1">
          {i > 0 && <span className="text-border">|</span>}
          <button
            onClick={() => switchLocale(l.code)}
            className={`px-1 rounded hover:text-primary transition-colors ${
              currentLocale === l.code ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  )
}
