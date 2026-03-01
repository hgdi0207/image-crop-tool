'use client'

import { useRouter, usePathname } from 'next/navigation'

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
]

export default function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()

  const currentLocale = LOCALES.find((l) => pathname.startsWith(`/${l.code}`))?.code ?? 'en'

  const switchLocale = (code: string) => {
    const segments = pathname.split('/')
    segments[1] = code
    router.push(segments.join('/'))
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
