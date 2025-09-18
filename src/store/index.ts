import { reactive, ref } from 'vue'

export interface GlobalSettings {
  copyType: boolean
}

const DDefaultSettings: GlobalSettings = {
  copyType: false,
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
    restore,
  }
}
