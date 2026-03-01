import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

const messageLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import('../../messages/en.json'),
  zh: () => import('../../messages/zh.json'),
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as 'en' | 'zh')) {
    locale = routing.defaultLocale
  }
  const messages = (await (messageLoaders[locale] ?? messageLoaders.en)()).default
  return { locale, messages }
})
