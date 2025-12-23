export default {
  // Header
  header: {
    subtitle: 'Quickly view and manage storage for current tab',
    loading: 'Loading…',
    switchLang: 'Switch language',
  },

  // Settings
  settings: {
    copyMode: 'Copy Mode',
    copyModeJs: 'JS',
    copyModeValue: 'Val',
    copyModeTooltip: 'JS mode copies as storage.setItem(key, value)',
    clearAll: 'Clear All',
    clearing: 'Clearing…',
    sync: 'Sync',
    syncing: '…',
    syncTooltip: 'Read storage from specified page and sync to current page',
    addUrlPlaceholder: 'Add new sync URL',
    add: 'Add',
    adding: '…',
    noSavedUrl: 'No saved URLs',
  },

  // Table / ContentList
  table: {
    key: 'Key',
    value: 'Value',
    actions: 'Actions',
    keyPlaceholder: 'Key',
    valuePlaceholder: 'Value',
    searchPlaceholder: 'Search keys...',
    add: 'Add',
    adding: '…',
    noMatch: 'No matching keys',
    noData: 'No data',
    help: 'Click to select · Click again to edit · ↑↓ Navigate · ⌘C Copy',
  },

  // Dialog
  dialog: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    clear: 'Clear',
    clearTitle: 'Confirm clear all?',
    clearDescription: 'This will clear localStorage and sessionStorage of current page. This action cannot be undone.',
    deleteTitle: 'Confirm delete {name}?',
    deleteDefaultTitle: 'Confirm delete?',
    deleteDescription: 'This action cannot be undone',
  },

  // Messages
  message: {
    // Status
    syncing: 'Syncing...',
    clearingStatus: 'Clearing...',

    // Success
    syncComplete: 'Sync complete',
    cleared: 'All cleared',
    configSaved: 'Config saved',
    configDeleted: 'Config deleted',
    added: 'Added {name}',
    updated: 'Updated {name}',
    deleted: 'Deleted {name}',
    copiedJs: 'Copied {code}',
    copiedValue: 'Value copied',

    // Error
    loadTimeout: 'Load timeout',
    envNotSupported: 'Sync not supported in current environment',
    envNotSupportedClear: 'Clear not supported in current environment',
    envNotSupportedSave: 'Save not supported in current environment',
    envNotSupportedDelete: 'Delete not supported in current environment',
    invalidUrl: 'Please enter a valid URL',
    tabNotFound: 'Current tab not found',
    pageNotOpened: 'Unable to open specified page',
    remoteDataNotFound: 'Remote data not found',
    syncFailed: 'Sync failed, please check URL or permissions',
    clearFailed: 'Clear failed, please retry',
    saveFailed: 'Save failed, please retry',
    deleteFailed: 'Delete failed, please retry',
    copyFailed: 'Copy failed, please retry',
    pageNotRecognized: 'Current page not recognized',
    enterUrl: 'Please enter URL',
    urlExists: 'URL already exists',
    urlNotExists: 'URL does not exist',
    selectUrlToDelete: 'Please select URL to delete',
    enterKeyName: 'Please enter key name',
    indexedDbNotSupported: 'IndexedDB deletion not supported',
  },
}
