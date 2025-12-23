import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zhCN from './locales/zh-CN'

const LOCALE_STORAGE_KEY = 'userLocale'

function getSystemLocale(): string {
  const chromeLocale = typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()
  const locale = chromeLocale || navigator.language || 'en'

  if (locale.startsWith('zh'))
    return 'zh-CN'

  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: getSystemLocale(),
  fallbackLocale: 'en',
  messages: {
    'en': en,
    'zh-CN': zhCN,
  },
})

export async function initLocale(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local)
    return

  return new Promise((resolve) => {
    chrome.storage.local.get([LOCALE_STORAGE_KEY], (items) => {
      const savedLocale = items?.[LOCALE_STORAGE_KEY]
      if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh-CN')) {
        i18n.global.locale.value = savedLocale
      }
      resolve()
    })
  })
}

export function setLocale(locale: 'en' | 'zh-CN'): void {
  i18n.global.locale.value = locale

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ [LOCALE_STORAGE_KEY]: locale })
  }
}

export function toggleLocale(): void {
  const current = i18n.global.locale.value
  setLocale(current === 'zh-CN' ? 'en' : 'zh-CN')
}

export function getCurrentLocale(): 'en' | 'zh-CN' {
  return i18n.global.locale.value as 'en' | 'zh-CN'
}

export default i18n
