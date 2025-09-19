import { createApp } from 'vue'
import Popup from './pages/Popup.vue'

import './style/index.css'

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

type MatchSource = { matches: boolean }

function applyTheme(source: MatchSource) {
  document.documentElement.classList.toggle('dark', source.matches)
}

applyTheme(prefersDark)

function handlePreferenceChange(event: MediaQueryListEvent) {
  applyTheme(event)
}

const cleanupListeners: Array<() => void> = []

if (typeof prefersDark.addEventListener === 'function') {
  prefersDark.addEventListener('change', handlePreferenceChange)
  cleanupListeners.push(() => prefersDark.removeEventListener('change', handlePreferenceChange))
} else if (typeof prefersDark.addListener === 'function') {
  prefersDark.addListener(handlePreferenceChange)
  cleanupListeners.push(() => prefersDark.removeListener(handlePreferenceChange))
} else {
  const originalHandler = prefersDark.onchange
  prefersDark.onchange = event => {
    if (event)
      applyTheme(event)
  }
  cleanupListeners.push(() => {
    prefersDark.onchange = originalHandler ?? null
  })
}

window.addEventListener('beforeunload', () => {
  while (cleanupListeners.length)
    cleanupListeners.pop()?.()
})

createApp(Popup).mount('body')
