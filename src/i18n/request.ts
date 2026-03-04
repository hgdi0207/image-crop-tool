import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

const messageLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import('../../messages/en.json'),
  es: () => import('../../messages/es.json'),
  pt: () => import('../../messages/pt.json'),
  fr: () => import('../../messages/fr.json'),
  de: () => import('../../messages/de.json'),
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as 'en' | 'es' | 'pt' | 'fr' | 'de')) {
    locale = routing.defaultLocale
  }
  const messages = (await (messageLoaders[locale] ?? messageLoaders.en)()).default
  return { locale, messages }
})
