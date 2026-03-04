import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es', 'pt', 'fr', 'de'],
  defaultLocale: 'en',
  // Disable auto-detection: URL locale is always authoritative.
  // Prevents middleware from redirecting /zh back to /en based on browser headers.
  localeDetection: false,
})
