import { ref } from 'vue'

export interface GlobalSettings {
  copyType: boolean
  syncUrl: string
  refreshToken: number
}

const DDefaultSettings: GlobalSettings = {
  copyType: false,
  syncUrl: '',
  refreshToken: 0,
}

const storeData = ref<GlobalSettings>({ ...getDefaultSettings() })

function getDefaultSettings() {
  return { ...DDefaultSettings }
}

export function useStore() {
  function restore() {
    storeData.value = getDefaultSettings()
  }
  return {
    storeData,
    setCopyType(value: boolean) {
      storeData.value.copyType = value
    },
    setSyncUrl(value: string) {
      storeData.value.syncUrl = value
    },
    triggerRefresh() {
      storeData.value.refreshToken += 1
    },
    restore,
  }
}
